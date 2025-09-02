#!/bin/bash
echo "🚀 Starting RemoteClaude Server..."
echo

# Detect architecture
ARCH=$(uname -m)
OS=$(uname -s)

if [ "$OS" = "Darwin" ]; then
    if [ "$ARCH" = "arm64" ]; then
        EXECUTABLE="./remoteclaude-macos-arm64"
    else
        EXECUTABLE="./remoteclaude-macos-amd64"
    fi
elif [ "$OS" = "Linux" ]; then
    if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
        EXECUTABLE="./remoteclaude-linux-arm64"
    else
        EXECUTABLE="./remoteclaude-linux-amd64"
    fi
else
    echo "❌ Unsupported OS: $OS"
    exit 1
fi

if [ -f "$EXECUTABLE" ]; then
    chmod +x "$EXECUTABLE"
    "$EXECUTABLE"
else
    echo "❌ Executable not found: $EXECUTABLE"
    exit 1
fi
