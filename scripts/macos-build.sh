#!/usr/bin/env bash
# Wrapper around `bun tauri` used by tauri-action on macOS.
# Builds the universal binary, ad-hoc signs the .app bundle, then
# recreates the DMG from the signed bundle so the distributed artifact
# contains the signed app.
set -euo pipefail

bun tauri "$@"

BUNDLE_DIR="src-tauri/target/universal-apple-darwin/release/bundle/macos"
APP=$(find "$BUNDLE_DIR" -maxdepth 1 -name "*.app" | head -1)

[[ -n "$APP" ]] || { echo "error: no .app bundle found in $BUNDLE_DIR" >&2; exit 1; }

APP_NAME=$(basename "$APP" .app)
DMG=$(find "$BUNDLE_DIR" -maxdepth 1 -name "*.dmg" | head -1)

codesign --deep --force --sign - "$APP"

if [[ -n "$DMG" ]]; then
  rm -f "$DMG"
  hdiutil create -volname "$APP_NAME" -srcfolder "$APP" -ov -format UDZO -o "${DMG%.dmg}"
fi
