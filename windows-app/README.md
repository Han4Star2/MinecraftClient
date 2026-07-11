# Horus.exe — the native, self-installing Windows app

This is a **real Windows GUI application** — a single compiled `.exe`, its
own window, its own taskbar icon, no browser address bar, no console window
flashing behind it. It's `~7 MB`, fully standalone (the whole app is
embedded inside it, see below), and it **installs itself**: double-click it
and it behaves exactly like installing any normal Windows program —

- copies itself into `%LOCALAPPDATA%\Programs\HorusClient`
- adds a **Start Menu** entry and a **Desktop** icon
- registers a proper **Uninstall** entry under Settings → Apps
  (`Windows key → Apps → Horus Client → Uninstall` — no leftover files, no
  hunting for a folder to delete by hand)
- then opens

Run it again from anywhere (Start Menu, Desktop, or the original downloaded
copy) and it just launches — the install step is idempotent and effectively
instant once installed.

Everything Horus can do — resolving real Minecraft versions from Mojang,
SHA-1-verified downloads, Fabric/Quilt, Microsoft login, mods, cosmetics —
runs through the same Node backend exactly as the browser build. **This
wrapper doesn't reimplement or fake any of it; it just gives the existing,
tested launcher a real, installed window.**

## Get it running

**Fastest path** — if someone handed you a `Horus.exe` directly: double-click
it. That's the whole install.

**Build it yourself** (no Windows machine required — Go cross-compiles, and
the app + server source it embeds are bundled in at build time):

```bash
# needs Go >= 1.21: https://go.dev/dl/
cd windows-app
./build.sh
```

This produces `windows-app/dist/Horus.exe` — a single standalone file. Copy
it anywhere (a USB stick, a Downloads folder, wherever) and double-click it.

### What it needs on the machine that runs it

- **Node.js** (the backend Horus.exe launches) — `winget install OpenJS.NodeJS.LTS`
- **Java** (to actually launch Minecraft) — `winget install EclipseAdoptium.Temurin.21.JRE`
- **WebView2 Runtime** — already installed on Windows 11 and virtually all
  Windows 10 machines (it ships with Edge). If it's ever missing, Horus.exe
  shows a native dialog with the download link instead of failing silently.

Missing Node.js or Java produces a real Windows message box explaining
exactly what to install — not a silent hang.

## How it works

```
Horus.exe (downloaded copy, Start Menu entry, or Desktop icon — any of them)
   │
   │  is %LOCALAPPDATA%\Programs\HorusClient\server\index.js already there?
   │    no  → extract the embedded app/ + server/ payload there,
   │          copy this exe in as the canonical Horus.exe,
   │          add Start Menu + Desktop icons, register the Uninstall entry
   │    yes → nothing to do, already installed
   │
   │  is 127.0.0.1:7411 already answering?
   │    no  → spawn `node <install-dir>\server\index.js --port 7411 --no-open`
   │          (hidden console window, logs to horus-backend.log)
   │          wait up to 25s for it to come up
   │    yes → reuse it
   │
   └─ open a native window, WebView2.Navigate("http://127.0.0.1:7411/")

On window close: the backend child process is killed — but a Minecraft
process it launched is a separate OS process and is untouched, exactly like
the "keep launcher open" setting intends.

Your game files, settings and Minecraft profiles live in ~/.horus (a normal
per-user data directory, untouched by install/uninstall) — separate from
the app install directory, exactly like any well-behaved Windows app.
```

`main.go` is the entire app — no framework, no installer toolkit (no NSIS,
no WiX, no Inno Setup), no UI beyond WebView2's own Chromium view and a
couple of native message boxes. The Node backend is unmodified; this is a
self-installing shell around it.

## Why Go + WebView2 instead of Electron or a "real" installer

- **~7 MB**, one file, no bundled Chromium (~150+ MB with Electron) — the OS
  already has one.
- No separate installer tool: `//go:embed` bundles `app/` and `server/`
  straight into the binary, and the self-install logic is ~80 lines of plain
  Go using only the standard library plus `golang.org/x/sys/windows/registry`
  for the Uninstall entry — nothing to learn, nothing hidden in a `.nsi`
  script.
- Cross-compiles from Linux/macOS to a real `win-x64` PE without a Windows
  machine, mingw, or cgo (the WebView2 binding here,
  [jchv/go-webview2](https://github.com/jchv/go-webview2), is pure Go).
- Matches the rest of Horus: small, auditable, zero hidden runtime.

## Rebuilding the icon

The taskbar/window icon is generated, not a binary asset someone hand-drew
and committed: `gen-icon/main.go` rasterizes the Eye-of-Horus mark with the
Go standard library only (`image`, `image/png`) into `icon.png`, and
`build.sh` embeds it as a real Windows resource (via
[go-winres](https://github.com/tc-hib/go-winres)) so it shows correctly in
Explorer, Alt-Tab and the taskbar — not just in the window's title bar.

## Files

| File | What |
|---|---|
| `main.go` | The native shell: self-install, shortcuts, uninstall, backend process management, WebView2 window |
| `gen-icon/main.go` | Generates `icon.png` (no external asset pipeline) |
| `build.sh` | Stages `app/`+`server/` for embedding → icon → Windows resource → cross-compiled `dist/Horus.exe` |
| `go.mod` / `go.sum` | Two dependencies: `jchv/go-webview2`, `golang.org/x/sys` |
| `dist/`, `payload/`, `icon.png`, `*.syso` | Build output — gitignored, regenerate with `build.sh` |
