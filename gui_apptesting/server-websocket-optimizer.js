#!/usr/bin/env node

/**
 * RemoteClaude v3.7.1 - Server WebSocket Configuration Optimizer
 * 🔧 Advanced Server-Side Bad Close Code 1006 Prevention
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class ServerWebSocketOptimizer {
    constructor() {
        this.serverDir = '/Users/suetaketakaya/1.prog/remote_manual/server';
        this.optimizations = [];
    }

    log(level, message) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const colors = {
            error: '\x1b[31m❌',
            warning: '\x1b[33m⚠️',
            info: '\x1b[36mℹ️',
            success: '\x1b[32m✅'
        };

        const color = colors[level] || '\x1b[37m';
        console.log(`${color} [${timestamp}] ${message}\x1b[0m`);
    }

    async optimizeServerConfiguration() {
        this.log('info', '🔧 Starting Server WebSocket Optimization');

        // 1. Goサーバーの設定最適化
        await this.optimizeGoServerSettings();

        // 2. システムレベルのWebSocket最適化
        await this.optimizeSystemWebSocketSettings();

        // 3. サーバーバイナリの再起動戦略
        await this.implementServerRestartStrategy();

        // 4. 監視とログ収集の強化
        await this.enhanceServerMonitoring();

        this.log('success', '✅ Server optimization completed');
    }

    async optimizeGoServerSettings() {
        this.log('info', '⚙️ Optimizing Go Server WebSocket settings');

        // Go WebSocketサーバーに対する環境変数設定
        const envOptimizations = [
            'export GOMAXPROCS=4',                    // Go並行処理最適化
            'export GOMEMLIMIT=2GiB',                 // メモリ制限
            'export GOGC=200',                        // GC調整
            'export WEBSOCKET_READ_BUFFER=32768',     // 読み取りバッファ拡大
            'export WEBSOCKET_WRITE_BUFFER=32768',    // 書き込みバッファ拡大
            'export WEBSOCKET_PING_PERIOD=25s',       // Ping間隔
            'export WEBSOCKET_PONG_WAIT=60s',         // Pong待機時間
            'export WEBSOCKET_WRITE_WAIT=10s',        // 書き込み待機時間
            'export WEBSOCKET_MAX_MESSAGE_SIZE=65536' // 最大メッセージサイズ
        ];

        // 環境変数設定スクリプト作成
        const envScript = envOptimizations.join('\n') + '\n';
        const envFile = path.join(this.serverDir, 'websocket-env.sh');

        try {
            fs.writeFileSync(envFile, envScript);
            fs.chmodSync(envFile, '755');
            this.log('success', `📝 Environment script created: ${envFile}`);
        } catch (error) {
            this.log('error', `Failed to create env script: ${error.message}`);
        }

        this.optimizations.push('Go server environment variables');
    }

    async optimizeSystemWebSocketSettings() {
        this.log('info', '🌐 Optimizing system-level WebSocket settings');

        const sysctlOptimizations = [
            // TCP設定の最適化
            'net.inet.tcp.keepintvl=7200',        // Keepaliveプローブ間隔
            'net.inet.tcp.keepidle=7200',         // Keepalive開始時間
            'net.inet.tcp.always_keepalive=1',    // 常にKeepalive

            // WebSocket特化設定
            'net.inet.tcp.delayed_ack=0',         // 遅延ACK無効化
            'net.inet.tcp.nodelay=1',             // Nagleアルゴリズム無効
            'net.inet.tcp.rfc1323=1',             // TCP拡張有効

            // バッファサイズ最適化
            'net.inet.tcp.sendspace=65536',       // 送信バッファ
            'net.inet.tcp.recvspace=65536',       // 受信バッファ

            // 接続管理
            'net.inet.tcp.msl=15000',             // MSL時間短縮
            'net.inet.tcp.fin_timeout=15'         // FIN待機時間短縮
        ];

        // sysctl設定スクリプト作成
        const sysctlScript = '#!/bin/bash\n# WebSocket Optimization Script\n\n' +
            sysctlOptimizations.map(opt => `sudo sysctl -w ${opt}`).join('\n') + '\n';

        const sysctlFile = path.join(this.serverDir, 'optimize-websocket.sh');

        try {
            fs.writeFileSync(sysctlFile, sysctlScript);
            fs.chmodSync(sysctlFile, '755');
            this.log('success', `📝 Sysctl script created: ${sysctlFile}`);

            // 即座に適用
            this.log('info', '⚡ Applying optimizations immediately');
            for (const opt of sysctlOptimizations) {
                try {
                    await this.runCommand(`sudo sysctl -w ${opt}`);
                } catch (error) {
                    this.log('warning', `Failed to apply ${opt}: ${error.message}`);
                }
            }

        } catch (error) {
            this.log('error', `Failed to create sysctl script: ${error.message}`);
        }

        this.optimizations.push('System-level TCP/WebSocket settings');
    }

    async implementServerRestartStrategy() {
        this.log('info', '🔄 Implementing intelligent server restart strategy');

        const restartScript = `#!/bin/bash
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
`;

        const restartFile = path.join(this.serverDir, 'smart-server-manager.sh');

        try {
            fs.writeFileSync(restartFile, restartScript);
            fs.chmodSync(restartFile, '755');
            this.log('success', `📝 Restart script created: ${restartFile}`);
        } catch (error) {
            this.log('error', `Failed to create restart script: ${error.message}`);
        }

        this.optimizations.push('Intelligent server restart strategy');
    }

    async enhanceServerMonitoring() {
        this.log('info', '📊 Enhancing server monitoring and logging');

        const monitoringScript = `#!/usr/bin/env node

/**
 * Server Health Monitor - Code 1006 Detection
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class ServerHealthMonitor {
    constructor() {
        this.serverDir = '/Users/suetaketakaya/1.prog/remote_manual/server';
        this.logFile = path.join(this.serverDir, 'health-monitor.log');
        this.alertThreshold = 3; // 3 Code 1006 errors trigger restart
        this.errorCount = 0;
        this.lastErrorTime = 0;
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = \`[\${timestamp}] \${message}\\n\`;

        console.log(logMessage.trim());
        fs.appendFileSync(this.logFile, logMessage);
    }

    async monitorServerLogs() {
        this.log('🔍 Starting server health monitoring');

        // サーバーログを監視
        const logPath = path.join(this.serverDir, 'server.log');

        if (fs.existsSync(logPath)) {
            const tail = spawn('tail', ['-f', logPath]);

            tail.stdout.on('data', (data) => {
                const logLine = data.toString();
                this.analyzeLogLine(logLine);
            });

            tail.stderr.on('data', (data) => {
                this.log(\`Tail error: \${data}\`);
            });
        }

        // 定期的な健全性チェック
        setInterval(() => {
            this.performHealthCheck();
        }, 300000); // 5分間隔
    }

    analyzeLogLine(logLine) {
        // Code 1006 エラーの検出
        if (logLine.includes('bad close code 1006') ||
            logLine.includes('close 1006') ||
            logLine.includes('websocket: close 1006')) {

            this.errorCount++;
            this.lastErrorTime = Date.now();

            this.log(\`🚨 Code 1006 detected! Count: \${this.errorCount}\`);

            // 閾値に達した場合の自動対応
            if (this.errorCount >= this.alertThreshold) {
                this.triggerEmergencyRestart();
            }
        }

        // 接続統計の記録
        if (logLine.includes('Mobile app connected') ||
            logLine.includes('Mobile app disconnected')) {
            this.log(\`📱 Connection event: \${logLine.trim()}\`);
        }
    }

    async triggerEmergencyRestart() {
        this.log(\`🚨 EMERGENCY: \${this.errorCount} Code 1006 errors detected - triggering restart\`);

        try {
            // スマートリスタートスクリプトを実行
            const restartScript = path.join(this.serverDir, 'smart-server-manager.sh');
            spawn('bash', [restartScript, 'restart'], { detached: true });

            this.log('🔄 Emergency restart initiated');
            this.errorCount = 0; // カウンターリセット

        } catch (error) {
            this.log(\`❌ Emergency restart failed: \${error.message}\`);
        }
    }

    performHealthCheck() {
        const now = Date.now();
        const timeSinceLastError = now - this.lastErrorTime;

        // 1時間以上エラーがない場合はカウンターリセット
        if (timeSinceLastError > 3600000) {
            if (this.errorCount > 0) {
                this.log(\`✅ No errors for 1 hour - resetting counter (was: \${this.errorCount})\`);
                this.errorCount = 0;
            }
        }

        this.log(\`💓 Health check: \${this.errorCount} recent errors\`);
    }
}

// メイン実行
const monitor = new ServerHealthMonitor();
monitor.monitorServerLogs();

// 終了処理
process.on('SIGINT', () => {
    monitor.log('🛑 Health monitor shutting down');
    process.exit(0);
});
`;

        const monitorFile = path.join(this.serverDir, 'health-monitor.js');

        try {
            fs.writeFileSync(monitorFile, monitoringScript);
            fs.chmodSync(monitorFile, '755');
            this.log('success', `📝 Health monitor created: ${monitorFile}`);
        } catch (error) {
            this.log('error', `Failed to create health monitor: ${error.message}`);
        }

        this.optimizations.push('Enhanced server health monitoring');
    }

    async runCommand(command) {
        return new Promise((resolve, reject) => {
            const process = spawn('bash', ['-c', command]);

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    reject(new Error(`Command failed: ${stderr}`));
                }
            });
        });
    }

    generateOptimizationReport() {
        const report = {
            timestamp: new Date().toISOString(),
            optimizations: this.optimizations,
            recommendations: [
                'サーバーの定期的な再起動 (4時間間隔)',
                'Code 1006エラーの積極的監視',
                'WebSocket設定の継続的最適化',
                'システムレベルTCP設定の調整',
                'サーバーログの詳細分析'
            ],
            nextSteps: [
                '1. smart-server-manager.sh restart でサーバー再起動',
                '2. node health-monitor.js でリアルタイム監視開始',
                '3. 4時間後の自動再起動を確認',
                '4. Code 1006発生パターンの継続分析'
            ]
        };

        const reportPath = path.join(this.serverDir, 'optimization-report.json');

        try {
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            this.log('success', `📋 Optimization report saved: ${reportPath}`);
        } catch (error) {
            this.log('error', `Failed to save report: ${error.message}`);
        }

        return report;
    }
}

// CLI実行
async function main() {
    const optimizer = new ServerWebSocketOptimizer();

    try {
        await optimizer.optimizeServerConfiguration();
        const report = optimizer.generateOptimizationReport();

        console.log('\\n🎯 Optimization Summary:');
        report.optimizations.forEach((opt, index) => {
            console.log(`  ${index + 1}. ✅ ${opt}`);
        });

        console.log('\\n📋 Next Steps:');
        report.nextSteps.forEach((step, index) => {
            console.log(`  ${index + 1}. ${step}`);
        });

    } catch (error) {
        console.error(`❌ Optimization failed: ${error.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = ServerWebSocketOptimizer;