@echo off
:: ============================================================
::  Horus Client - Windows launcher
::
::  Prefer windows-app\dist\Horus.exe if it's been built (see
::  windows-app\build.sh) - that's a real native GUI app: its own
::  window, its own taskbar icon, no browser chrome, no console
::  flash. This .bat is the fallback for when you haven't built
::  it yet: it opens Horus in an app-mode Edge window instead.
::
::  Requirements: Node.js >= 18   (winget install OpenJS.NodeJS.LTS)
::                Java for playing (winget install EclipseAdoptium.Temurin.21.JRE)
:: ============================================================
setlocal
cd /d "%~dp0"

if exist "windows-app\dist\Horus.exe" (
  start "" "windows-app\dist\Horus.exe"
  exit /b 0
)

where node >nul 2>nul
if errorlevel 1 (
  echo [Horus] Node.js is required. Install it with:
  echo         winget install OpenJS.NodeJS.LTS
  pause
  exit /b 1
)

set PORT=7411
echo [Horus] Starting backend on http://127.0.0.1:%PORT% ...
start "Horus Backend" /min cmd /c "node server\index.js --port %PORT% --no-open"

:: give the backend a moment
timeout /t 2 /nobreak >nul

:: open as a standalone app window (Edge is preinstalled on Windows 10/11)
start "" msedge --app=http://127.0.0.1:%PORT%/ 2>nul || start "" http://127.0.0.1:%PORT%/

echo [Horus] Running. Close this window anytime - the backend keeps running
echo         until you hit "Quit Launcher" inside Horus.
echo.
echo [Horus] Tip: build windows-app\dist\Horus.exe for a real native app
echo         window instead of this Edge fallback - see windows-app\README.md
endlocal
