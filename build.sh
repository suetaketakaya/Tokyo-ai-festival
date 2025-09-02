#!/bin/bash

# RemoteClaude Cross-Platform Build Script
# Builds executables for Windows, macOS, and Linux

echo "🏗️  Building RemoteClaude for multiple platforms..."

# Create build directory
mkdir -p dist

# Build information
VERSION="1.0.0"
BUILD_TIME=$(date -u +"%Y-%m-%d_%H:%M:%S_UTC")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Go build flags
LDFLAGS="-X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME} -X main.GitCommit=${GIT_COMMIT}"

cd remoteclaude-server

echo "📦 Building for Windows (amd64)..."
GOOS=windows GOARCH=amd64 go build -ldflags="${LDFLAGS}" -o ../dist/remoteclaude-windows-amd64.exe main.go
if [ $? -eq 0 ]; then
    echo "✅ Windows build successful"
else
    echo "❌ Windows build failed"
fi

echo "📦 Building for macOS (amd64)..."
GOOS=darwin GOARCH=amd64 go build -ldflags="${LDFLAGS}" -o ../dist/remoteclaude-macos-amd64 main.go
if [ $? -eq 0 ]; then
    echo "✅ macOS Intel build successful"
else
    echo "❌ macOS Intel build failed"
fi

echo "📦 Building for macOS (arm64)..."
GOOS=darwin GOARCH=arm64 go build -ldflags="${LDFLAGS}" -o ../dist/remoteclaude-macos-arm64 main.go
if [ $? -eq 0 ]; then
    echo "✅ macOS Apple Silicon build successful"
else
    echo "❌ macOS Apple Silicon build failed"
fi

echo "📦 Building for Linux (amd64)..."
GOOS=linux GOARCH=amd64 go build -ldflags="${LDFLAGS}" -o ../dist/remoteclaude-linux-amd64 main.go
if [ $? -eq 0 ]; then
    echo "✅ Linux build successful"
else
    echo "❌ Linux build failed"
fi

echo "📦 Building for Linux (arm64)..."
GOOS=linux GOARCH=arm64 go build -ldflags="${LDFLAGS}" -o ../dist/remoteclaude-linux-arm64 main.go
if [ $? -eq 0 ]; then
    echo "✅ Linux ARM build successful"
else
    echo "❌ Linux ARM build failed"
fi

cd ..

# Copy necessary files to dist
echo "📁 Copying static files..."
cp -r web-demo dist/
mkdir -p dist/static
cp remoteclaude-server/static/* dist/static/ 2>/dev/null || echo "⚠️  No static files found"

# Create startup scripts
echo "📜 Creating startup scripts..."

# Windows batch script
cat > dist/start-windows.bat << 'EOF'
@echo off
echo Starting RemoteClaude Server...
echo.
if exist "remoteclaude-windows-amd64.exe" (
    remoteclaude-windows-amd64.exe
) else (
    echo ERROR: remoteclaude-windows-amd64.exe not found
    pause
)
EOF

# macOS/Linux shell script
cat > dist/start-unix.sh << 'EOF'
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
EOF

chmod +x dist/start-unix.sh

# Create README for distribution
cat > dist/README.txt << EOF
# RemoteClaude v${VERSION}

## Quick Start

### Windows:
   Double-click: start-windows.bat

### macOS/Linux:
   Run in terminal: ./start-unix.sh
   
   Or manually:
   - macOS Intel: ./remoteclaude-macos-amd64
   - macOS Apple Silicon: ./remoteclaude-macos-arm64
   - Linux x64: ./remoteclaude-linux-amd64
   - Linux ARM: ./remoteclaude-linux-arm64

## What happens next:
1. Server starts and shows QR code in terminal
2. Install RemoteClaude mobile app
3. Scan QR code with mobile app
4. Start coding remotely!

## Requirements:
- Claude Code CLI installed (https://claude.ai/code)
- Network connection between PC and mobile device

## Web Demo:
Open http://localhost:8080/demo/ in your browser to test

Build: ${BUILD_TIME}
Commit: ${GIT_COMMIT}
EOF

echo ""
echo "✅ Build completed successfully!"
echo "📂 Files available in ./dist/"
echo ""
echo "📋 Distribution files:"
ls -la dist/

echo ""
echo "🚀 To test locally:"
echo "   cd dist && ./start-unix.sh"
echo ""
echo "📱 For mobile app development:"
echo "   Use the web demo at http://localhost:8080/demo/"