#!/bin/bash

# RemoteClaude v3.7.1 Server Startup Script
# 🚀 Complete GUI Application Testing Environment

set -e  # Exit on any error

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ディレクトリ定義
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")/server"
EXPO_DIR="$(dirname "$SCRIPT_DIR")/RemoteClaudeApp"

# ログディレクトリ
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"

# PIDファイルディレクトリ
PID_DIR="$SCRIPT_DIR/pids"
mkdir -p "$PID_DIR"

# 関数定義
print_header() {
    echo -e "${BLUE}================================================================================================${NC}"
    echo -e "${CYAN}🚀 RemoteClaude v3.7.1 - Complete Server Startup Script${NC}"
    echo -e "${BLUE}================================================================================================${NC}"
    echo -e "${YELLOW}📱 Mobile-First Development Platform | GUI Application Testing Environment${NC}"
    echo -e "${BLUE}================================================================================================${NC}"
}

print_section() {
    echo ""
    echo -e "${PURPLE}📋 $1${NC}"
    echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# プロセス確認関数
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        return 0  # ポート使用中
    else
        return 1  # ポート空き
    fi
}

# プロセス起動関数
start_process() {
    local name="$1"
    local command="$2"
    local working_dir="$3"
    local log_file="$LOG_DIR/${name}.log"
    local pid_file="$PID_DIR/${name}.pid"

    print_info "Starting $name..."

    # 作業ディレクトリに移動
    if [ -n "$working_dir" ] && [ -d "$working_dir" ]; then
        cd "$working_dir"
    fi

    # バックグラウンドでプロセス開始
    nohup bash -c "$command" > "$log_file" 2>&1 &
    local pid=$!

    # PID保存
    echo "$pid" > "$pid_file"

    # プロセス開始確認
    sleep 2
    if kill -0 "$pid" 2>/dev/null; then
        print_success "$name started (PID: $pid)"
        echo "    📄 Log: $log_file"
        echo "    🆔 PID: $pid_file"
        return 0
    else
        print_error "$name failed to start"
        rm -f "$pid_file"
        return 1
    fi
}

# 依存関係チェック
check_dependencies() {
    print_section "Checking Dependencies"

    # Node.js チェック
    if command -v node > /dev/null 2>&1; then
        local node_version=$(node --version)
        print_success "Node.js: $node_version"
    else
        print_error "Node.js not found. Please install Node.js 18+"
        exit 1
    fi

    # npm チェック
    if command -v npm > /dev/null 2>&1; then
        local npm_version=$(npm --version)
        print_success "npm: v$npm_version"
    else
        print_error "npm not found"
        exit 1
    fi

    # Go チェック
    if command -v go > /dev/null 2>&1; then
        local go_version=$(go version | awk '{print $3}')
        print_success "Go: $go_version"
    else
        print_warning "Go not found. RemoteClaude server may not be available."
    fi

    # Docker チェック
    if command -v docker > /dev/null 2>&1; then
        if docker info > /dev/null 2>&1; then
            print_success "Docker: Running"
        else
            print_warning "Docker daemon not running"
        fi
    else
        print_warning "Docker not found"
    fi

    # Expo CLI チェック
    if command -v expo > /dev/null 2>&1; then
        print_success "Expo CLI: Available"
    else
        print_warning "Expo CLI not found globally"
    fi
}

# 既存プロセス停止
stop_existing_processes() {
    print_section "Stopping Existing Processes"

    # PIDファイルベースの停止
    for pid_file in "$PID_DIR"/*.pid; do
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            local name=$(basename "$pid_file" .pid)

            if kill -0 "$pid" 2>/dev/null; then
                print_info "Stopping $name (PID: $pid)"
                kill "$pid" 2>/dev/null || true
                sleep 1

                # 強制終了が必要な場合
                if kill -0 "$pid" 2>/dev/null; then
                    kill -9 "$pid" 2>/dev/null || true
                    print_warning "Force killed $name"
                fi
            fi
            rm -f "$pid_file"
        fi
    done

    # 特定プロセスの停止
    print_info "Stopping specific processes..."

    # RemoteClaude server プロセス
    pkill -f "remoteclaude-server" || true

    # Node.js テストプロセス
    pkill -f "fixed-command-tester.js" || true
    pkill -f "simple-command-tester.js" || true
    pkill -f "reliable-gui-monitor.js" || true
    pkill -f "simple-monitor.js" || true

    # Expo プロセス (特定ポートのみ)
    lsof -ti:8081 | xargs kill -9 2>/dev/null || true
    lsof -ti:8082 | xargs kill -9 2>/dev/null || true

    sleep 3
    print_success "Existing processes stopped"
}

# RemoteClaude Go Server 起動
start_go_servers() {
    print_section "Starting RemoteClaude Go Servers"

    # Server 1: Port 8090
    if [ -f "$SERVER_DIR/remoteclaude-server" ]; then
        start_process "go-server-8090" "./remoteclaude-server --port=8090" "$SERVER_DIR"
    else
        print_warning "RemoteClaude server binary not found at $SERVER_DIR"
    fi

    # Server 2: Port 8091
    if [ -f "$SERVER_DIR/remoteclaude-server" ]; then
        start_process "go-server-8091" "./remoteclaude-server --port=8091" "$SERVER_DIR"
    else
        print_warning "RemoteClaude server binary not found at $SERVER_DIR"
    fi
}

# Expo Development Servers 起動
start_expo_servers() {
    print_section "Starting Expo Development Servers"

    if [ -d "$EXPO_DIR" ]; then
        # Primary Expo Server (Port 8081)
        start_process "expo-primary" "npx expo start --clear" "$EXPO_DIR"

        # Secondary Expo Server (Port 8082)
        start_process "expo-secondary" "npx expo start --clear --port 8082" "$EXPO_DIR"
    else
        print_warning "Expo app directory not found at $EXPO_DIR"
    fi
}

# GUI Testing Tools 起動
start_gui_tools() {
    print_section "Starting GUI Testing Tools"

    cd "$SCRIPT_DIR"

    # Reliable GUI Monitor (Port 3002)
    if [ -f "reliable-gui-monitor.js" ]; then
        start_process "gui-monitor" "node reliable-gui-monitor.js" "$SCRIPT_DIR"
    fi

    # Fixed Command Tester (Port 3005)
    if [ -f "fixed-command-tester.js" ]; then
        start_process "command-tester" "node fixed-command-tester.js" "$SCRIPT_DIR"
    fi

    # Simple Command Tester (Port 3004) - Optional
    if [ -f "simple-command-tester.js" ]; then
        start_process "simple-command-tester" "node simple-command-tester.js" "$SCRIPT_DIR"
    fi

    # Simple Monitor (Port 3001) - Optional
    if [ -f "simple-monitor.js" ]; then
        start_process "simple-monitor" "node simple-monitor.js" "$SCRIPT_DIR"
    fi
}

# ヘルスチェック
health_check() {
    print_section "Health Check"

    local all_healthy=true

    # ポートチェック
    local ports=(8080 8081 8082 8090 8091 3002 3005)
    local services=("Go Server Web UI" "Expo Primary" "Expo Secondary" "Go Server 8090" "Go Server 8091" "GUI Monitor" "Command Tester")

    for i in "${!ports[@]}"; do
        local port="${ports[i]}"
        local service="${services[i]}"

        if check_port "$port"; then
            print_success "$service (Port $port): ✅ Running"
        else
            print_warning "$service (Port $port): ⚠️  Not accessible"
            all_healthy=false
        fi
    done

    # WebSocket接続テスト
    print_info "Testing WebSocket connections..."
    sleep 5  # サービス起動待機

    if check_port 8091; then
        print_success "WebSocket Server (8091): Ready for connections"
    fi

    return $([ "$all_healthy" = true ] && echo 0 || echo 1)
}

# 状態表示
show_status() {
    print_section "System Status Summary"

    echo -e "${CYAN}🌐 Web Interfaces:${NC}"
    echo "  📊 Go Server Web UI:     http://localhost:8080"
    echo "  📱 Expo Primary:         http://localhost:8081"
    echo "  📱 Expo Secondary:       http://localhost:8082"
    echo "  📈 GUI Monitor:          http://localhost:3002"
    echo "  🧪 Command Tester:       http://localhost:3005"

    echo ""
    echo -e "${CYAN}🔗 WebSocket Endpoints:${NC}"
    echo "  🚀 Primary Server:       ws://localhost:8091/ws"
    echo "  🚀 Secondary Server:     ws://localhost:8090/ws"

    echo ""
    echo -e "${CYAN}📁 Files & Logs:${NC}"
    echo "  📄 Logs Directory:       $LOG_DIR"
    echo "  🆔 PID Files:            $PID_DIR"
    echo "  🧪 Test Reports:         $SCRIPT_DIR/reports"

    echo ""
    echo -e "${CYAN}🛠️  Management Commands:${NC}"
    echo "  🛑 Stop All:            ./stop-servers.sh"
    echo "  🔄 Restart:             ./restart-servers.sh"
    echo "  📊 Monitor:              tail -f $LOG_DIR/*.log"
}

# メイン実行
main() {
    print_header

    # 依存関係チェック
    check_dependencies

    # 既存プロセス停止
    stop_existing_processes

    # サーバ起動
    start_go_servers
    start_expo_servers
    start_gui_tools

    # ヘルスチェック
    if health_check; then
        print_success "All services started successfully!"
    else
        print_warning "Some services may not be fully operational"
    fi

    # 状態表示
    show_status

    echo ""
    echo -e "${GREEN}🎉 RemoteClaude v3.7.1 Server Environment Ready!${NC}"
    echo -e "${BLUE}================================================================================================${NC}"
}

# スクリプト実行
main "$@"