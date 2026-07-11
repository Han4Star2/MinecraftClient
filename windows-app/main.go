// Horus.exe — the native Windows shell for Horus Client.
//
// This is a real Windows GUI application (not a browser tab, not a .bat
// file): a compiled PE executable with its own window, its own taskbar
// icon, no address bar or browser chrome. It hosts the Horus UI in a
// WebView2 control (the Chromium engine already built into Windows 10/11)
// and drives the existing zero-dependency Node backend as a child process —
// so every Horus feature (real Minecraft downloads + launch, Microsoft
// login, mods, cosmetics, ...) works exactly as in the browser build,
// just inside a proper native window.
//
// Build (from any OS, no Windows machine needed):
//
//	./build.sh
//
// produces windows-app/dist/Horus.exe — copy it next to the repo's
// server/ and app/ folders (or run the build on Windows inside the repo).
package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"syscall"
	"time"

	webview2 "github.com/jchv/go-webview2"
	"golang.org/x/sys/windows"
)

const (
	defaultPort = 7411
	appTitle    = "Horus Client"
)

func main() {
	exePath, err := os.Executable()
	if err != nil {
		fatal("Horus could not determine its own location:\n" + err.Error())
		return
	}
	baseDir := filepath.Dir(exePath)

	port := defaultPort
	if p := os.Getenv("HORUS_PORT"); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			port = n
		}
	}
	url := fmt.Sprintf("http://127.0.0.1:%d/", port)

	var proc *os.Process
	if !pingUp(url) {
		p, err := startBackend(baseDir, port)
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

/* -------------------------------------------------------------- backend */

func startBackend(baseDir string, port int) (*os.Process, error) {
	nodePath, err := exec.LookPath("node")
	if err != nil {
		return nil, fmt.Errorf(
			"Horus needs Node.js to run its backend, and couldn't find it on your PATH.\n\n" +
				"Install it once with:\n  winget install OpenJS.NodeJS.LTS\n\n" +
				"Then start Horus again. (Java is also required to actually launch Minecraft:\n" +
				"  winget install EclipseAdoptium.Temurin.21.JRE )")
	}

	serverEntry := filepath.Join(baseDir, "server", "index.js")
	if _, err := os.Stat(serverEntry); err != nil {
		return nil, fmt.Errorf(
			"Could not find server\\index.js next to Horus.exe.\n\n"+
				"Horus.exe must stay inside the MinecraftClient folder, alongside\n"+
				"its server\\ and app\\ directories.\n\nLooked in: %s", serverEntry)
	}

	logPath := filepath.Join(baseDir, "horus-backend.log")
	logFile, err := os.Create(logPath)
	if err != nil {
		logFile = nil // non-fatal — logging is best-effort
	}

	cmd := exec.Command(nodePath, serverEntry, "--port", strconv.Itoa(port), "--no-open")
	cmd.Dir = baseDir
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

func fatal(msg string) {
	title, _ := windows.UTF16PtrFromString(appTitle)
	text, _ := windows.UTF16PtrFromString(msg)
	_, _ = windows.MessageBox(0, text, title, windows.MB_OK|windows.MB_ICONERROR)
}

// hideConsoleWindow stops a console flash from the backend's child process
// (Horus.exe itself is already built with -H=windowsgui, so this matters
// only for the node.exe process it spawns).
func hideConsoleWindow(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000} // CREATE_NO_WINDOW
}
