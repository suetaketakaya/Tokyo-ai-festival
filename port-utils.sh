#!/bin/bash

# RemoteClaude Port Utilities

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to find next available port
find_free_port() {
    local start_port=${1:-8080}
    local port=$start_port
    
    while [ $port -lt 65535 ]; do
        if ! lsof -i :$port > /dev/null 2>&1; then
            echo $port
            return 0
        fi
        port=$((port + 1))
    done
    
    echo "No free ports found" >&2
    return 1
}

# Function to show port usage
show_port_usage() {
    local port=${1:-8080}
    echo -e "${BLUE}📊 Port $port usage:${NC}"
    
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "${RED}❌ Port $port is in use:${NC}"
        lsof -i :$port
    else
        echo -e "${GREEN}✅ Port $port is available${NC}"
    fi
}

# Function to kill processes on port
kill_port() {
    local port=${1:-8080}
    echo -e "${YELLOW}🔄 Killing processes on port $port...${NC}"
    
    local pids=$(lsof -ti :$port)
    if [ ! -z "$pids" ]; then
        echo "Found processes: $pids"
        kill -9 $pids
        echo -e "${GREEN}✅ Processes killed${NC}"
    else
        echo -e "${GREEN}✅ No processes found on port $port${NC}"
    fi
}

# Function to cleanup all RemoteClaude servers
cleanup_remoteclaude() {
    echo -e "${YELLOW}🧹 Cleaning up all RemoteClaude servers...${NC}"
    pkill -f remoteclaude-server 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✅ RemoteClaude cleanup completed${NC}"
}

# Function to get recommended port
get_recommended_port() {
    # Common development ports to try in order
    local ports=(8090 8080 3000 8000 8081 9000 8888 7777 8888)
    
    for port in "${ports[@]}"; do
        if ! lsof -i :$port > /dev/null 2>&1; then
            echo $port
            return 0
        fi
    done
    
    # If all common ports are busy, find next available
    find_free_port 8090
}

# Main script logic
case "$1" in
    "check")
        show_port_usage ${2:-8080}
        ;;
    "kill")
        kill_port ${2:-8080}
        ;;
    "find")
        port=$(find_free_port ${2:-8080})
        echo -e "${GREEN}🎯 Next available port: $port${NC}"
        ;;
    "recommend")
        port=$(get_recommended_port)
        echo -e "${GREEN}💡 Recommended port: $port${NC}"
        ;;
    "cleanup")
        cleanup_remoteclaude
        ;;
    "status")
        echo -e "${BLUE}📊 RemoteClaude Port Status:${NC}"
        echo ""
        for port in 8080 8090 8091 3000; do
            printf "Port %-5s: " $port
            if lsof -i :$port > /dev/null 2>&1; then
                echo -e "${RED}BUSY${NC}"
            else
                echo -e "${GREEN}FREE${NC}"
            fi
        done
        ;;
    *)
        echo "RemoteClaude Port Utilities"
        echo ""
        echo "Usage: $0 <command> [port]"
        echo ""
        echo "Commands:"
        echo "  check [port]     - Check if port is in use (default: 8080)"
        echo "  kill [port]      - Kill processes on port (default: 8080)"
        echo "  find [port]      - Find next available port (default: 8080)"
        echo "  recommend        - Get recommended free port"
        echo "  cleanup          - Kill all RemoteClaude servers"
        echo "  status           - Show status of common ports"
        echo ""
        echo "Examples:"
        echo "  $0 check 8080    - Check if port 8080 is free"
        echo "  $0 kill 8080     - Kill process on port 8080"
        echo "  $0 find 8090     - Find next available port starting from 8090"
        echo "  $0 recommend     - Get a recommended free port"
        echo "  $0 cleanup       - Clean up all RemoteClaude servers"
        ;;
esac