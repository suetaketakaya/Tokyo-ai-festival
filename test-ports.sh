#!/bin/bash

# RemoteClaude Port Test Script
echo "🧪 RemoteClaude Port Configuration Test"
echo ""

# Build first
echo "🔨 Building server..."
cd server
go build -o ../test-server main.go
cd ..

if [ ! -f "test-server" ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed"
echo ""

# Test different port configurations
echo "📋 Testing different port configurations:"
echo ""

# Test 1: Default port
echo "🔸 Test 1: Default port (8090)"
timeout 3 ./test-server &
sleep 1
pkill -f test-server
echo ""

# Test 2: Command line flag
echo "🔸 Test 2: Command line flag (port 9000)"
timeout 3 ./test-server --port=9000 &
sleep 1
pkill -f test-server
echo ""

# Test 3: Environment variable
echo "🔸 Test 3: Environment variable (port 9001)"
REMOTECLAUDE_PORT=9001 timeout 3 ./test-server &
sleep 1
pkill -f test-server
echo ""

# Test 4: Priority test (env + command line)
echo "🔸 Test 4: Priority test (env=9002, flag=9003 → should use 9003)"
REMOTECLAUDE_PORT=9002 timeout 3 ./test-server --port=9003 &
sleep 1
pkill -f test-server
echo ""

# Cleanup
rm -f test-server

echo "✅ Port configuration tests completed!"
echo ""
echo "📖 Configuration Guide:"
echo "  Default:         ./remoteclaude-server"
echo "  Command line:    ./remoteclaude-server --port=9000"
echo "  Environment:     REMOTECLAUDE_PORT=9000 ./remoteclaude-server"
echo "  Priority:        Command line > Environment > Default"
echo ""
echo "🔍 Check port usage: lsof -i :PORT_NUMBER"
echo "🔧 Kill process:     kill -9 PID"