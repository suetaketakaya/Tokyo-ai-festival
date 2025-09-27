#!/bin/bash

# RemoteClaude Connection Stability Fix
# This script optimizes server settings and connection handling to prevent disconnections

echo "🔧 RemoteClaude Connection Stability Fix"
echo "========================================="
echo ""

# Function to kill existing servers
cleanup_servers() {
    echo "🧹 Cleaning up existing server processes..."

    # Kill any existing remoteclaude-server processes
    pkill -f "remoteclaude-server" 2>/dev/null || true

    # Wait for processes to terminate
    sleep 2

    # Force kill if still running
    pkill -9 -f "remoteclaude-server" 2>/dev/null || true

    echo "✅ Server cleanup completed"
}

# Function to start optimized server
start_optimized_server() {
    local port=$1
    echo "🚀 Starting optimized RemoteClaude server on port $port..."

    # Set environment variables for better performance
    export REMOTECLAUDE_KEEPALIVE=true
    export REMOTECLAUDE_TIMEOUT=300  # 5 minutes timeout
    export REMOTECLAUDE_BUFFER_SIZE=65536
    export REMOTECLAUDE_MAX_MESSAGE_SIZE=10485760  # 10MB

    # Start server with optimized settings
    cd /Users/suetaketakaya/1.prog/remote_manual/server

    nohup ./remoteclaude-server --port=$port \
        --keepalive \
        --timeout=300 \
        --max-connections=10 \
        --buffer-size=65536 \
        > "server-$port.log" 2>&1 &

    local server_pid=$!
    echo $server_pid > "server-$port.pid"

    echo "✅ Server started with PID: $server_pid"
    echo "📋 Log file: server-$port.log"
    echo "🔗 Connection URL: ws://192.168.0.135:$port/ws"

    return 0
}

# Function to check server status
check_server_status() {
    local port=$1
    echo "🔍 Checking server status on port $port..."

    # Wait for server to start
    sleep 3

    # Check if process is running
    if [ -f "server-$port.pid" ]; then
        local pid=$(cat "server-$port.pid")
        if kill -0 $pid 2>/dev/null; then
            echo "✅ Server process is running (PID: $pid)"
        else
            echo "❌ Server process not found"
            return 1
        fi
    else
        echo "❌ PID file not found"
        return 1
    fi

    # Check if port is listening
    if lsof -i :$port >/dev/null 2>&1; then
        echo "✅ Port $port is listening"
    else
        echo "❌ Port $port is not listening"
        return 1
    fi

    # Test WebSocket connection
    if curl -s -o /dev/null -w "%{http_code}" "http://192.168.0.135:$port/api/status" | grep -q "200"; then
        echo "✅ HTTP API responding"
    else
        echo "⚠️ HTTP API not responding (may be normal for WebSocket-only)"
    fi

    return 0
}

# Function to create connection test script
create_connection_test() {
    cat > connection_test.js << 'EOF'
const WebSocket = require('ws');

function testConnection(url) {
    console.log(`🔍 Testing connection to: ${url}`);

    const ws = new WebSocket(url);
    let connected = false;

    const timeout = setTimeout(() => {
        if (!connected) {
            console.log('❌ Connection timeout');
            ws.terminate();
            process.exit(1);
        }
    }, 10000);

    ws.on('open', function open() {
        connected = true;
        clearTimeout(timeout);
        console.log('✅ WebSocket connection established');

        // Send test message
        ws.send(JSON.stringify({
            type: 'ping',
            data: { timestamp: Date.now() }
        }));
    });

    ws.on('message', function message(data) {
        try {
            const msg = JSON.parse(data);
            console.log(`📨 Received: ${msg.type}`);

            if (msg.type === 'pong') {
                console.log('🏓 Ping-pong successful');
                ws.close();
            }
        } catch (e) {
            console.log(`📨 Received raw: ${data}`);
        }
    });

    ws.on('close', function close(code, reason) {
        console.log(`🔌 Connection closed: ${code} - ${reason}`);
        process.exit(code === 1000 ? 0 : 1);
    });

    ws.on('error', function error(err) {
        console.log(`❌ Connection error: ${err.message}`);
        process.exit(1);
    });
}

if (process.argv[2]) {
    testConnection(process.argv[2]);
} else {
    console.log('Usage: node connection_test.js <websocket_url>');
    process.exit(1);
}
EOF

    chmod +x connection_test.js
    echo "✅ Connection test script created: connection_test.js"
}

# Function to create monitoring script
create_monitoring_script() {
    cat > monitor_connections.sh << 'EOF'
#!/bin/bash

echo "📊 RemoteClaude Connection Monitor"
echo "=================================="

while true; do
    echo ""
    echo "⏰ $(date)"

    # Check server processes
    echo "🔍 Server processes:"
    ps aux | grep remoteclaude-server | grep -v grep | while read line; do
        echo "  ✅ $line"
    done

    # Check port usage
    echo "🔍 Port usage:"
    for port in 8090 8091; do
        if lsof -i :$port >/dev/null 2>&1; then
            echo "  ✅ Port $port: $(lsof -i :$port | tail -n +2 | head -1)"
        else
            echo "  ❌ Port $port: Not in use"
        fi
    done

    # Check WebSocket connections
    echo "🔍 Active connections:"
    netstat -an | grep -E ':(8090|8091)' | grep ESTABLISHED | wc -l | xargs echo "  📱 Active WebSocket connections:"

    sleep 30
done
EOF

    chmod +x monitor_connections.sh
    echo "✅ Monitoring script created: monitor_connections.sh"
}

# Main execution
main() {
    echo "🎯 Starting RemoteClaude connection stability fix..."
    echo ""

    # Clean up existing servers
    cleanup_servers

    # Start optimized server on port 8091
    start_optimized_server 8091

    # Check server status
    if check_server_status 8091; then
        echo ""
        echo "🎉 Server successfully started and verified!"
    else
        echo ""
        echo "❌ Server startup failed"
        exit 1
    fi

    # Create utility scripts
    create_connection_test
    create_monitoring_script

    echo ""
    echo "📋 Connection Information:"
    echo "=========================="
    echo "🔗 WebSocket URL: ws://192.168.0.135:8091/ws?key=$(grep 'Session Key:' server-8091.log | tail -1 | cut -d' ' -f3)"
    echo "🌐 Web Interface: http://192.168.0.135:8080"
    echo "📁 Log File: server-8091.log"
    echo ""
    echo "🛠️ Utility Commands:"
    echo "===================="
    echo "📊 Monitor connections: ./monitor_connections.sh"
    echo "🧪 Test connection: node connection_test.js ws://192.168.0.135:8091/ws"
    echo "📋 View logs: tail -f server-8091.log"
    echo "🔄 Restart server: $0"
    echo ""
    echo "✅ Connection stability improvements applied!"
    echo "🔍 The server is now optimized for stable long-running connections"
}

# Handle script arguments
case "${1:-start}" in
    "start")
        main
        ;;
    "stop")
        cleanup_servers
        echo "✅ All servers stopped"
        ;;
    "restart")
        cleanup_servers
        sleep 2
        main
        ;;
    "status")
        check_server_status 8091
        ;;
    "monitor")
        if [ -f "monitor_connections.sh" ]; then
            ./monitor_connections.sh
        else
            echo "❌ Monitoring script not found. Run '$0 start' first."
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|monitor}"
        exit 1
        ;;
esac