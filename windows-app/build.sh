#!/usr/bin/env bash
# Builds Horus.exe — a real native Windows GUI application — from source.
# Works from Linux, macOS or Windows: Go cross-compiles to win-x64 natively,
# and the WebView2 binding used here (jchv/go-webview2) is pure Go (no cgo,
# no mingw needed).
#
# Requires: Go >= 1.21 (https://go.dev/dl/)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

echo "==> Fetching go-winres (embeds the icon + manifest into the exe)"
GOBIN="$(mktemp -d)"
trap 'rm -rf "$GOBIN"' EXIT
GOBIN="$GOBIN" go install github.com/tc-hib/go-winres@latest

echo "==> Regenerating icon.png"
go run ./gen-icon icon.png

echo "==> Embedding icon + manifest as a Windows resource"
"$GOBIN/go-winres" simply \
  --icon icon.png \
  --manifest gui \
  --product-name "Horus Client" \
  --file-description "Horus Client — an open Minecraft launcher" \
  --copyright "MIT" \
  --out rsrc

echo "==> Cross-compiling win-x64 (GUI subsystem, no console window)"
mkdir -p dist
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 \
  go build -ldflags "-H=windowsgui -s -w" -o dist/Horus.exe .

echo "==> Done: windows-app/dist/Horus.exe ($(du -h dist/Horus.exe | cut -f1))"
echo "    Copy it into the repository root (next to server/ and app/) and double-click it."
