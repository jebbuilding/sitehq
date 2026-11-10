#!/usr/bin/env bash
# Fetches the exact CDN library versions the app loads, so tests can serve them offline
# (the harness intercepts cdnjs requests and serves these files instead).
set -euo pipefail
cd "$(dirname "$0")/../tests"
pack() { local dir=$1 spec=$2; rm -rf "$dir"; mkdir -p "$dir"; (cd "$dir" && npm pack "$spec" --silent >/dev/null && tar xzf ./*.tgz && rm ./*.tgz); }
pack jspdfpkg   jspdf@2.5.1
pack pdfjspkg   pdfjs-dist@3.11.174
pack xlsxpkg    xlsx@0.18.5
pack mammothpkg mammoth@1.8.0
pack qrlib      qrcode-generator@1.4.4
pack threepkg   three@0.128.0
pack jsqrpkg    jsqr@1.4.0
echo "vendored into tests/"
