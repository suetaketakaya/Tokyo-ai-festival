#!/bin/bash

# RemoteClaude v3.7.1 Server Stop Script
# 🛑 Complete Server Shutdown

set -e

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
PID_DIR="$SCRIPT_DIR/pids"

# 関数定義
print_header() {
    echo -e "${BLUE}================================================================================================${NC}"
    echo -e "${RED}🛑 RemoteClaude v3.7.1 - Server Stop Script${NC}"
    echo -e "${BLUE}================================================================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# PIDファイルベースでプロセス停止
stop_pid_processes() {
    print_info "Stopping processes using PID files..."

    if [ -d "$PID_DIR" ]; then
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
                    else
                        print_success "Stopped $name"
                    fi
                else
                    print_info "$name process not running"
                fi
                rm -f "$pid_file"
            fi
        done
    fi
}

# 特定プロセス停止
stop_specific_processes() {
    print_info "Stopping specific processes..."

    # RemoteClaude Goサーバ
    print_info "Stopping RemoteClaude Go servers..."
    pkill -f "remoteclaude-server" && print_success "Go servers stopped" || print_info "No Go servers running"

    # GUI Testing Tools
    print_info "Stopping GUI testing tools..."
    pkill -f "fixed-command-tester.js" && print_success "Fixed command tester stopped" || true
    pkill -f "simple-command-tester.js" && print_success "Simple command tester stopped" || true
    pkill -f "reliable-gui-monitor.js" && print_success "Reliable GUI monitor stopped" || true
    pkill -f "simple-monitor.js" && print_success "Simple monitor stopped" || true

    # Expo プロセス (慎重に)
    print_info "Stopping Expo development servers..."

    # 特定ポートのプロセスのみ停止
    local expo_pids_8081=$(lsof -ti:8081 2>/dev/null || true)
    local expo_pids_8082=$(lsof -ti:8082 2>/dev/null || true)

    if [ -n "$expo_pids_8081" ]; then
        echo "$expo_pids_8081" | xargs kill -TERM 2>/dev/null || true
        print_success "Expo server (8081) stopped"
    fi

    if [ -n "$expo_pids_8082" ]; then
        echo "$expo_pids_8082" | xargs kill -TERM 2>/dev/null || true
        print_success "Expo server (8082) stopped"
    fi

    # Metro bundler プロセス
    pkill -f "metro" 2>/dev/null || true
}

# ポートベース停止
stop_port_processes() {
    print_info "Stopping processes by port..."

    local ports=(8080 8090 8091 3001 3002 3004 3005)
    local services=("Go Server Web UI" "Go Server 8090" "Go Server 8091" "Simple Monitor" "GUI Monitor" "Simple Command Tester" "Fixed Command Tester")

    for i in "${!ports[@]}"; do
        local port="${ports[i]}"
        local service="${services[i]}"

        local pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$pids" ]; then
            echo "$pids" | xargs kill -TERM 2>/dev/null || true
            sleep 1

            # 強制終了チェック
            local remaining_pids=$(lsof -ti:$port 2>/dev/null || true)
            if [ -n "$remaining_pids" ]; then
                echo "$remaining_pids" | xargs kill -9 2>/dev/null || true
                print_warning "Force killed $service (Port $port)"
            else
                print_success "Stopped $service (Port $port)"
            fi
        fi
    done
}

# クリーンアップ
cleanup() {
    print_info "Cleaning up..."

    # 一時ファイル削除
    rm -rf "$PID_DIR"/*.pid 2>/dev/null || true

    # Expo 一時ファイル削除
    if [ -d "$(dirname "$SCRIPT_DIR")/RemoteClaudeApp/.expo" ]; then
        rm -rf "$(dirname "$SCRIPT_DIR")/RemoteClaudeApp/.expo" 2>/dev/null || true
    fi

    print_success "Cleanup completed"
}

# 最終確認
verify_shutdown() {
    print_info "Verifying shutdown..."

    local running_processes=0
    local ports=(8080 8081 8082 8090 8091 3001 3002 3004 3005)

    for port in "${ports[@]}"; do
        if lsof -i :$port > /dev/null 2>&1; then
            local pid=$(lsof -ti:$port 2>/dev/null || true)
            print_warning "Port $port still in use (PID: $pid)"
            running_processes=$((running_processes + 1))
        fi
    done

    if [ $running_processes -eq 0 ]; then
        print_success "All servers stopped successfully!"
        return 0
    else
        print_warning "$running_processes processes still running"
        return 1
    fi
}

# メイン実行
main() {
    print_header

    # 段階的停止
    stop_pid_processes
    sleep 2

    stop_specific_processes
    sleep 2

    stop_port_processes
    sleep 2

    cleanup

    # 確認
    if verify_shutdown; then
        echo ""
        echo -e "${GREEN}🎉 All RemoteClaude servers stopped successfully!${NC}"
    else
        echo ""
        echo -e "${YELLOW}⚠️  Some processes may still be running. Check manually if needed.${NC}"
        echo ""
        echo -e "${CYAN}💡 To check remaining processes:${NC}"
        echo "   lsof -i :8080,8081,8082,8090,8091,3001,3002,3004,3005"
        echo ""
        echo -e "${CYAN}💡 To force kill remaining processes:${NC}"
        echo "   sudo lsof -ti:PORT | xargs kill -9"
    fi

    echo -e "${BLUE}================================================================================================${NC}"
}

# 強制停止オプション
if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
    print_header
    print_warning "Force stopping all processes..."

    # 強制的にすべてのポートを停止
    for port in 8080 8081 8082 8090 8091 3001 3002 3004 3005; do
        local pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$pids" ]; then
            echo "$pids" | xargs kill -9 2>/dev/null || true
            print_success "Force killed processes on port $port"
        fi
    done

    # すべてのRemoteClaude関連プロセスを強制終了
    pkill -9 -f "remoteclaude" 2>/dev/null || true
    pkill -9 -f "command-tester" 2>/dev/null || true
    pkill -9 -f "gui-monitor" 2>/dev/null || true

    cleanup
    print_success "Force shutdown completed!"
    exit 0
fi

# 通常実行
main "$@"