@echo off
:: ============================================================
::  Horus Client - Windows launcher
::  Starts the zero-dependency backend and opens Horus as its
::  own app window (Edge --app mode, no browser chrome).
::
::  Requirements: Node.js >= 18   (winget install OpenJS.NodeJS.LTS)
::                Java for playing (winget install EclipseAdoptium.Temurin.21.JRE)
:: ============================================================
setlocal
cd /d "%~dp0"

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
endlocal
