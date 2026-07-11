// Horus.exe — the native, self-installing Windows app for Horus Client.
//
// This is a real Windows GUI application (not a browser tab, not a .bat
// file): a single compiled PE executable with its own window, its own
// taskbar icon, no address bar or browser chrome. Double-clicking it
// installs Horus like a normal Windows app — Start Menu entry, Desktop
// icon, an "Uninstall" entry in Settings → Apps — and then opens it. Every
// copy of this exe (the one you downloaded, the Start Menu entry, the
// Desktop icon) is completely standalone: the whole app (server/ + app/)
// is embedded inside it via go:embed, so there is nothing else to keep
// together and nothing else to download.
//
// It hosts the Horus UI in a WebView2 control (the Chromium engine already
// built into Windows 10/11) and drives the existing zero-dependency Node
// backend as a child process — so every Horus feature (real Minecraft
// downloads + launch, Microsoft login, mods, cosmetics, ...) works exactly
// as in the browser build, just inside a proper installed native app.
//
// Build (from any OS, no Windows machine needed):
//
//	./build.sh
//
// produces windows-app/dist/Horus.exe — a single, standalone file. Hand it
// to anyone; they double-click it and Horus installs itself.
package main

import (
	"embed"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"syscall"
	"time"

	webview2 "github.com/jchv/go-webview2"
	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
)

const (
	defaultPort = 7411
	appTitle    = "Horus Client"
	appVersion  = "2.0.0"
	appDirName  = "HorusClient"
	uninstKey   = `Software\Microsoft\Windows\CurrentVersion\Uninstall\HorusClient`
)

//go:embed payload/app
var payloadApp embed.FS

//go:embed payload/server
var payloadServer embed.FS

func main() {
	installDir := installDirPath()

	if len(os.Args) > 1 && os.Args[1] == "--uninstall" {
		uninstall(installDir)
		return
	}

	freshInstall := false
	if _, err := os.Stat(filepath.Join(installDir, "server", "index.js")); err != nil {
		if err := installTo(installDir); err != nil {
			fatal("Horus could not install itself:\n" + err.Error())
			return
		}
		freshInstall = true
	}

	if freshInstall {
		createShortcuts(installDir)
		registerUninstall(installDir)
	}

	runApp(installDir)
}

/* ---------------------------------------------------------- self-install */

func installDirPath() string {
	base := os.Getenv("LOCALAPPDATA")
	if base == "" {
		base = filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Local")
	}
	return filepath.Join(base, "Programs", appDirName)
}

// installTo extracts the embedded app + server payload and a copy of this
// exe into installDir. Safe to call repeatedly (used as a "repair" path
// too, whenever server/index.js is missing from the install directory).
func installTo(installDir string) error {
	appFS, err := fs.Sub(payloadApp, "payload/app")
	if err != nil {
		return err
	}
	if err := extractFS(appFS, filepath.Join(installDir, "app")); err != nil {
		return fmt.Errorf("extracting app files: %w", err)
	}

	serverFS, err := fs.Sub(payloadServer, "payload/server")
	if err != nil {
		return err
	}
	if err := extractFS(serverFS, filepath.Join(installDir, "server")); err != nil {
		return fmt.Errorf("extracting server files: %w", err)
	}

	self, err := os.Executable()
	if err != nil {
		return fmt.Errorf("locating this exe: %w", err)
	}
	data, err := os.ReadFile(self)
	if err != nil {
		return fmt.Errorf("reading this exe: %w", err)
	}
	if err := os.WriteFile(filepath.Join(installDir, "Horus.exe"), data, 0o755); err != nil {
		return fmt.Errorf("copying into %s: %w", installDir, err)
	}
	return nil
}

func extractFS(src fs.FS, destRoot string) error {
	return fs.WalkDir(src, ".", func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		target := filepath.Join(destRoot, filepath.FromSlash(p))
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		data, err := fs.ReadFile(src, p)
		if err != nil {
			return err
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		return os.WriteFile(target, data, 0o644)
	})
}

// createShortcuts places a copy of the installed exe in the Start Menu and
// on the Desktop. Windows launches and displays these exactly like any
// other program (icon included) — no .lnk/COM machinery needed for that.
func createShortcuts(installDir string) {
	data, err := os.ReadFile(filepath.Join(installDir, "Horus.exe"))
	if err != nil {
		return
	}
	if appData := os.Getenv("APPDATA"); appData != "" {
		dir := filepath.Join(appData, "Microsoft", "Windows", "Start Menu", "Programs")
		if err := os.MkdirAll(dir, 0o755); err == nil {
			_ = os.WriteFile(filepath.Join(dir, appTitle+".exe"), data, 0o755)
		}
	}
	if profile := os.Getenv("USERPROFILE"); profile != "" {
		desktop := filepath.Join(profile, "Desktop")
		if _, err := os.Stat(desktop); err == nil {
			_ = os.WriteFile(filepath.Join(desktop, appTitle+".exe"), data, 0o755)
		}
	}
}

// registerUninstall adds Horus to Settings → Apps (and Control Panel's
// Programs and Features) under the current user — no admin rights needed.
func registerUninstall(installDir string) {
	k, _, err := registry.CreateKey(registry.CURRENT_USER, uninstKey, registry.ALL_ACCESS)
	if err != nil {
		return
	}
	defer k.Close()
	exe := filepath.Join(installDir, "Horus.exe")
	_ = k.SetStringValue("DisplayName", appTitle)
	_ = k.SetStringValue("DisplayVersion", appVersion)
	_ = k.SetStringValue("Publisher", "Horus")
	_ = k.SetStringValue("DisplayIcon", exe)
	_ = k.SetStringValue("InstallLocation", installDir)
	_ = k.SetStringValue("UninstallString", fmt.Sprintf(`"%s" --uninstall`, exe))
	_ = k.SetDWordValue("NoModify", 1)
	_ = k.SetDWordValue("NoRepair", 1)
}

// uninstall runs when Windows invokes "<installDir>\Horus.exe --uninstall"
// (from Settings → Apps). It removes the registry entry and shortcuts
// immediately, then hands off folder removal to a detached helper because
// this exe's own file is still open while it's the one running.
func uninstall(installDir string) {
	_ = registry.DeleteKey(registry.CURRENT_USER, uninstKey)
	if appData := os.Getenv("APPDATA"); appData != "" {
		_ = os.Remove(filepath.Join(appData, "Microsoft", "Windows", "Start Menu", "Programs", appTitle+".exe"))
	}
	if profile := os.Getenv("USERPROFILE"); profile != "" {
		_ = os.Remove(filepath.Join(profile, "Desktop", appTitle+".exe"))
	}
	info(appTitle + " has been uninstalled.\n\nYour game files, settings and Minecraft profiles were left untouched\nin case you reinstall — find them in the Horus Settings page (About).")
	removeDirDeferred(installDir)
}

// removeDirDeferred deletes installDir a couple seconds from now, in a
// detached helper process, giving this process time to exit and release
// its own exe file first.
func removeDirDeferred(dir string) {
	cmd := exec.Command("cmd", "/C", "timeout /T 2 /NOBREAK >NUL & rmdir /S /Q \""+dir+"\"")
	hideConsoleWindow(cmd)
	_ = cmd.Start()
}

/* -------------------------------------------------------------- the app */

func runApp(installDir string) {
	port := defaultPort
	if p := os.Getenv("HORUS_PORT"); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			port = n
		}
	}
	url := fmt.Sprintf("http://127.0.0.1:%d/", port)

	var proc *os.Process
	if !pingUp(url) {
		p, err := startBackend(installDir, port)
		if err != nil {
			fatal(err.Error())
			return
		}
		proc = p
		if !waitUp(url, 25*time.Second) {
			killProcess(proc)
			fatal("Horus's backend did not respond in time on 127.0.0.1:" + strconv.Itoa(port) + ".\n\n" +
				"Something may already be using that port, or Node.js failed to start.\n" +
				"Set HORUS_PORT to use a different port.")
			return
		}
	}

	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug: false,
		WindowOptions: webview2.WindowOptions{
			Title:  appTitle,
			Width:  1440,
			Height: 900,
			IconId: 1, // embedded via go-winres (see build.sh) — resource ID 1
			Center: true,
		},
	})
	if w == nil {
		killProcess(proc)
		fatal("Microsoft Edge WebView2 Runtime was not found.\n\n" +
			"Windows 11 and most Windows 10 installs already have it (it ships with Edge).\n" +
			"If this dialog appeared, install the free \"Evergreen\" runtime from:\n" +
			"https://developer.microsoft.com/microsoft-edge/webview2/\n\n" +
			"Then start Horus again.")
		return
	}
	defer w.Destroy()

	w.Navigate(url)
	w.Run()

	// Only stop the backend if THIS process started it — a game launched
	// through Horus is a separate OS process and keeps running either way.
	killProcess(proc)
}

func startBackend(installDir string, port int) (*os.Process, error) {
	nodePath, err := exec.LookPath("node")
	if err != nil {
		return nil, fmt.Errorf(
			"Horus needs Node.js to run its backend, and couldn't find it on your PATH.\n\n" +
				"Install it once with:\n  winget install OpenJS.NodeJS.LTS\n\n" +
				"Then start Horus again. (Java is also required to actually launch Minecraft:\n" +
				"  winget install EclipseAdoptium.Temurin.21.JRE )")
	}

	serverEntry := filepath.Join(installDir, "server", "index.js")
	logFile, err := os.Create(filepath.Join(installDir, "horus-backend.log"))
	if err != nil {
		logFile = nil // non-fatal — logging is best-effort
	}

	cmd := exec.Command(nodePath, serverEntry, "--port", strconv.Itoa(port), "--no-open")
	cmd.Dir = installDir
	if logFile != nil {
		cmd.Stdout = logFile
		cmd.Stderr = logFile
	}
	hideConsoleWindow(cmd)

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("Failed to start the Horus backend:\n%s", err.Error())
	}
	return cmd.Process, nil
}

func killProcess(p *os.Process) {
	if p != nil {
		_ = p.Kill()
	}
}

/* ------------------------------------------------------------ readiness */

func pingUp(url string) bool {
	c := http.Client{Timeout: 700 * time.Millisecond}
	resp, err := c.Get(url + "api/status")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, resp.Body)
	return resp.StatusCode == 200
}

func waitUp(url string, timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if pingUp(url) {
			return true
		}
		time.Sleep(250 * time.Millisecond)
	}
	return false
}

/* ------------------------------------------------------------------- ui */

func fatal(msg string) { msgBox(msg, windows.MB_ICONERROR) }
func info(msg string)  { msgBox(msg, windows.MB_ICONINFORMATION) }

func msgBox(msg string, icon uint32) {
	title, _ := windows.UTF16PtrFromString(appTitle)
	text, _ := windows.UTF16PtrFromString(msg)
	_, _ = windows.MessageBox(0, text, title, windows.MB_OK|icon)
}

// hideConsoleWindow stops a console flash from a spawned child process
// (Horus.exe itself is already built with -H=windowsgui, so this matters
// for node.exe and the cmd.exe uninstall helper).
func hideConsoleWindow(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000} // CREATE_NO_WINDOW
}
