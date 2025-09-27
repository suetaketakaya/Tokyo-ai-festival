#!/bin/bash
# Intelligent Server Restart Strategy
# Prevents Code 1006 through proactive restarts

SERVER_DIR="/Users/suetaketakaya/1.prog/remote_manual/server"
PID_FILE="$SERVER_DIR/server.pid"
LOG_FILE="$SERVER_DIR/restart.log"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# サーバーの正常停止
graceful_stop() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        log_message "Gracefully stopping server (PID: $PID)"
        kill -TERM "$PID" 2>/dev/null
        sleep 5

        # 強制終了が必要な場合
        if kill -0 "$PID" 2>/dev/null; then
            log_message "Force killing server (PID: $PID)"
            kill -KILL "$PID"
        fi

        rm -f "$PID_FILE"
    fi
}

# プロアクティブリスタート (4時間間隔)
proactive_restart() {
    log_message "Starting proactive restart cycle"

    while true; do
        sleep 14400  # 4時間待機
        log_message "Initiating proactive restart"

        graceful_stop
        sleep 10

        # 環境変数を適用してサーバー再起動
        cd "$SERVER_DIR"
        source websocket-env.sh

        nohup ./remoteclaude-server --port=8091 > server.log 2>&1 &
        echo $! > "$PID_FILE"

        log_message "Server restarted with PID: $(cat $PID_FILE)"
    done
}

# スクリプト実行
case "$1" in
    "start")
        log_message "Starting server with optimizations"
        cd "$SERVER_DIR"
        source websocket-env.sh
        nohup ./remoteclaude-server --port=8091 > server.log 2>&1 &
        echo $! > "$PID_FILE"
        log_message "Server started with PID: $(cat $PID_FILE)"
        ;;
    "stop")
        graceful_stop
        ;;
    "restart")
        graceful_stop
        sleep 5
        cd "$SERVER_DIR"
        source websocket-env.sh
        nohup ./remoteclaude-server --port=8091 > server.log 2>&1 &
        echo $! > "$PID_FILE"
        log_message "Server restarted with PID: $(cat $PID_FILE)"
        ;;
    "proactive")
        proactive_restart
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|proactive}"
        exit 1
        ;;
esac
