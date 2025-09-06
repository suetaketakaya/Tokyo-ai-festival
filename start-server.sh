#!/bin/bash

# RemoteClaude Server Startup Script with Port Management
echo "🚀 RemoteClaude Server Startup Script"

# Function to check if port is in use
check_port() {
    local port=$1
    lsof -i :$port > /dev/null 2>&1
    return $?
}

# Function to kill existing RemoteClaude servers
cleanup_servers() {
    echo "🧹 Cleaning up existing RemoteClaude servers..."
    pkill -f remoteclaude-server 2>/dev/null || true
    sleep 1
    echo "✅ Cleanup completed"
}

# Get desired port (default: 8090)
PORT=${1:-8090}

# Check if REMOTECLAUDE_PORT environment variable is set
if [ ! -z "$REMOTECLAUDE_PORT" ]; then
    PORT=$REMOTECLAUDE_PORT
fi

echo "🎯 Target port: $PORT"

# Check if port is in use
if check_port $PORT; then
    echo "⚠️  Port $PORT is already in use"
    lsof -i :$PORT
    echo ""
    echo "Choose an option:"
    echo "1) Kill existing process and use port $PORT"
    echo "2) Use a different port"
    echo "3) Exit"
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            echo "🔄 Killing existing process on port $PORT..."
            PID=$(lsof -ti :$PORT)
            if [ ! -z "$PID" ]; then
                kill -9 $PID
                echo "✅ Process $PID terminated"
                sleep 1
            fi
            ;;
        2)
            read -p "Enter new port number: " NEW_PORT
            PORT=$NEW_PORT
            if check_port $PORT; then
                echo "❌ Port $PORT is also in use. Exiting."
                exit 1
            fi
            ;;
        3)
            echo "👋 Exiting..."
            exit 0
            ;;
        *)
            echo "❌ Invalid choice. Exiting."
            exit 1
            ;;
    esac
fi

# Cleanup any remaining RemoteClaude servers
cleanup_servers

echo "🚀 Starting RemoteClaude server on port $PORT..."
echo ""

# Start the server
if [ -f "./build/remoteclaude-server" ]; then
    ./build/remoteclaude-server --port=$PORT
elif [ -f "./server/remoteclaude-server" ]; then
    ./server/remoteclaude-server --port=$PORT
elif [ -f "./remoteclaude-server" ]; then
    ./remoteclaude-server --port=$PORT
else
    echo "❌ RemoteClaude server executable not found!"
    echo "Please run: ./build.sh"
    exit 1
fi