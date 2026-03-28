#!/bin/bash
set -e

echo "🔨 Building Jarvis native macOS component..."

# Check for Xcode
if ! xcodebuild -version &> /dev/null; then
    echo "❌ Xcode not found. Please install from the Mac App Store."
    exit 1
fi

# Check macOS version (requires 12.3+ for ScreenCaptureKit)
OS_VERSION=$(sw_vers -productVersion)
REQUIRED="12.3"
if [[ "$(printf '%s\n' "$REQUIRED" "$OS_VERSION" | sort -V | head -n1)" != "$REQUIRED" ]]; then
    echo "❌ macOS $REQUIRED or later required (found $OS_VERSION)"
    exit 1
fi

# Build Swift component
cd "$(dirname "$0")"
xcodebuild \
    -project Jarvis.xcodeproj \
    -scheme Jarvis \
    -configuration Release \
    -derivedDataPath build \
    build

APP_PATH="build/Build/Products/Release/Jarvis.app"

if [ ! -d "$APP_PATH" ]; then
    echo "❌ Build failed — app bundle not found at $APP_PATH"
    exit 1
fi

# Install to /Applications
cp -r "$APP_PATH" /Applications/
echo "✅ Jarvis.app installed to /Applications/"

# Remind about API key
if [ -z "$GEMINI_API_KEY" ]; then
    echo ""
    echo "⚠️  GEMINI_API_KEY is not set. Add it to your shell profile:"
    echo "   export GEMINI_API_KEY=your_key_here"
fi

echo ""
echo "🚀 Launch with: open /Applications/Jarvis.app"
echo "   Hotkeys:"
echo "   ⌘⇧V  — Toggle window visibility"
echo "   ⌘⇧A  — Cycle autonomy level (Low → Medium → High)"
echo "   ⌘⇧F  — Force copy & display last answer"
