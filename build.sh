#!/usr/bin/env bash
# Builds an unsigned/ad-hoc arm64 .dmg. Must be run on macOS (electron-builder's
# dmg target shells out to hdiutil/codesign, which don't exist on Linux/Windows).
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "error: this build must run on macOS (dmg packaging requires hdiutil/codesign)." >&2
  exit 1
fi

echo "==> Installing dependencies"
npm ci

echo "==> Building unsigned arm64 .dmg"
export CSC_IDENTITY_AUTO_DISCOVERY=false
npx electron-builder --mac --arm64 --config electron-builder.yml

echo "==> Done. Output in ./dist"
