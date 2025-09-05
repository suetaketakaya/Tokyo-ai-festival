#!/bin/bash

# RemoteClaude Build Script v2.0
echo "🚀 Building RemoteClaude v2.0..."

# Check requirements
echo "📋 Checking requirements..."

# Check Go
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go 1.21+"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

# Check Expo CLI
if ! command -v expo &> /dev/null; then
    echo "❌ Expo CLI is not installed. Installing..."
    npm install -g @expo/cli
fi

# Check Claude CLI
if ! command -v claude &> /dev/null; then
    echo "❌ Claude CLI is not installed. Installing..."
    npm install -g @anthropic-ai/claude-code
fi

echo "✅ All requirements satisfied"

# Build macOS Server
echo "🛠️ Building macOS server..."
cd server
go mod tidy
go build -o ../build/remoteclaude-server main.go
if [ $? -ne 0 ]; then
    echo "❌ Server build failed"
    exit 1
fi
cd ..

# Setup iPhone App
echo "Setting up iPhone app..."
cd RemoteClaudeApp
npm install
if [ $? -ne 0 ]; then
    echo "❌ iPhone app setup failed"
    exit 1
fi
cd ..

# Create build directory and copy files
mkdir -p build
mkdir -p build/app
cp -r RemoteClaudeApp/* build/app/
cp server/remoteclaude-server build/ 2>/dev/null || echo "Server executable already copied"

echo ""
echo "🎉 Build completed successfully!"
echo ""
echo "🚀 Quick Start:"
echo "1. Start server (default port 8090):"
echo "   ./build/remoteclaude-server"
echo ""
echo "   Custom port options:"
echo "   ./build/remoteclaude-server --port=9000"
echo "   REMOTECLAUDE_PORT=9000 ./build/remoteclaude-server"
echo ""
echo "2. Run iPhone app: cd build/app && expo start"
echo "3. Scan QR code with iPhone"
echo ""
echo "iPhone App Features:"
echo "  ✅ QR Code Scanner"
echo "  ✅ Project Management"
echo "  ✅ Claude CLI Execution"
echo "  ✅ Real-time Terminal"
echo ""
echo "🖥️ macOS Server Features:"
echo "  ✅ WebSocket Communication"
echo "  ✅ QR Code Generation"
echo "  ✅ Claude CLI Integration"
echo "  ✅ Project Management"
echo ""
echo "🌟 RemoteClaude v2.0 is ready for action!"