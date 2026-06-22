#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
PACKAGE="$ROOT/apps/AgentGlowMac"
APP="$ROOT/build/AgentGlow Lab.app"
BIN_DIR=$(swift build --package-path "$PACKAGE" -c release --show-bin-path)

swift build --package-path "$PACKAGE" -c release
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN_DIR/AgentGlowMac" "$APP/Contents/MacOS/AgentGlowMac"
cp "$PACKAGE/Resources/Info.plist" "$APP/Contents/Info.plist"
codesign --force --sign - "$APP"
echo "Built: $APP"
