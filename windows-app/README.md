# Horus.exe — the native Windows app

This is a **real Windows GUI application** — a compiled `.exe`, its own
window, its own taskbar icon, no browser address bar, no console window
flashing behind it. It is not Electron and it is not a `.bat` file opening a
browser tab: it's `~6 MB`, starts instantly, and has exactly one job — host
the Horus UI in a native [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/)
control (the Chromium engine already built into Windows 10/11) and manage the
existing zero-dependency Node backend behind it.

Everything Horus can do — resolving real Minecraft versions from Mojang,
SHA-1-verified downloads, Fabric/Quilt, Microsoft login, mods, cosmetics —
runs through that same backend exactly as it does in the browser build.
**This wrapper doesn't reimplement or fake any of it; it just gives the
existing, tested launcher a real window.**

## Get it running

**Fastest path — use the prebuilt exe** if one was handed to you directly:
drop `Horus.exe` into the repository root (next to `server/` and `app/`) and
double-click it.

**Build it yourself** (no Windows machine required — Go cross-compiles):

```bash
# needs Go >= 1.21: https://go.dev/dl/
cd windows-app
./build.sh
```

This produces `windows-app/dist/Horus.exe`. Copy it to the repository root
and double-click it. `Horus.bat` at the repo root will also find and prefer
it automatically once it exists.

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
Horus.exe (native window, WebView2)
   │
   │  on launch: is 127.0.0.1:7411 already answering?
   │    no  → spawn `node ..\server\index.js --port 7411 --no-open`
   │          (hidden console window, logs to horus-backend.log)
   │          wait up to 25s for it to come up
   │    yes → reuse it
   │
   └─ open a native window, WebView2.Navigate("http://127.0.0.1:7411/")

On window close: the backend child process is killed — but a Minecraft
process it launched is a separate OS process and is untouched, exactly like
the "keep launcher open" setting intends.
```

`main.go` is the entire app — no framework, no UI toolkit beyond WebView2's
own Chromium view. The Node backend is unmodified; this is a shell around it.

## Why Go + WebView2 instead of Electron

- **~6 MB**, one file, no bundled Chromium (~150+ MB with Electron) — the OS
  already has one.
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
| `main.go` | The native shell: backend process management + WebView2 window |
| `gen-icon/main.go` | Generates `icon.png` (no external asset pipeline) |
| `build.sh` | One command: icon → Windows resource → cross-compiled `dist/Horus.exe` |
| `go.mod` / `go.sum` | Two dependencies: `jchv/go-webview2`, `golang.org/x/sys` |
| `dist/`, `icon.png`, `*.syso` | Build output — gitignored, regenerate with `build.sh` |
