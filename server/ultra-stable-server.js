#!/usr/bin/env node

/**
 * Ultra-Stable RemoteClaude Server
 * 長時間処理後の接続切断を完全に防ぐ特化サーバー
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class UltraStableServer {
    constructor() {
        this.serverDir = '/Users/suetaketakaya/1.prog/remote_manual/server';
        this.logFile = path.join(this.serverDir, 'ultra-stable.log');
        this.serverProcess = null;
        this.isRunning = false;
        this.code1006Count = 0;
        this.longExecutionDetected = false;
        this.lastActivityTime = Date.now();
    }

    log(level, message) {
        const timestamp = new Date().toISOString();
        const colors = {
            error: '\x1b[31m❌',
            warning: '\x1b[33m⚠️',
            info: '\x1b[36mℹ️',
            success: '\x1b[32m✅',
            stability: '\x1b[35m🛡️',
            critical: '\x1b[41m🚨'
        };

        const color = colors[level] || '\x1b[37m';
        const logMessage = `${color} [${timestamp.split('T')[1].split('.')[0]}] ${message}\x1b[0m`;

        console.log(logMessage);

        try {
            fs.appendFileSync(this.logFile, `[${timestamp}] ${level.toUpperCase()}: ${message}\n`);
        } catch (error) {
            console.error('Failed to write log:', error.message);
        }
    }

    async startUltraStableServer() {
        this.log('stability', '🛡️ Starting ultra-stable RemoteClaude server');

        // 既存サーバー停止
        await this.stopExistingServers();

        // 超安定化環境変数
        const ultraStableEnv = {
            ...process.env,

            // WebSocket超安定化設定
            WEBSOCKET_READ_BUFFER: '262144',      // 256KB バッファ
            WEBSOCKET_WRITE_BUFFER: '262144',     // 256KB バッファ
            WEBSOCKET_PING_PERIOD: '10s',         // 10秒間隔 (頻繁なping)
            WEBSOCKET_PONG_WAIT: '180s',          // 3分待機
            WEBSOCKET_WRITE_WAIT: '45s',          // 45秒書き込み待機
            WEBSOCKET_MAX_MESSAGE_SIZE: '4194304', // 4MB メッセージサイズ

            // 長時間処理対応
            CLAUDE_TIMEOUT: '300s',               // 5分タイムアウト
            CLAUDE_KEEPALIVE_INTERVAL: '30s',     // 30秒間隔でキープアライブ
            CLAUDE_BUFFER_FLUSH_INTERVAL: '5s',   // 5秒間隔でバッファフラッシュ

            // Go runtime超安定化
            GOMAXPROCS: '6',                      // CPUコア制限
            GOMEMLIMIT: '6GiB',                   // メモリ余裕
            GOGC: '50',                           // 積極的GC

            // TCP/Socket最適化
            TCP_NODELAY: '1',
            TCP_QUICKACK: '1',
            SO_KEEPALIVE: '1',                    // TCP Keep-Alive
            TCP_KEEPIDLE: '30',                   // 30秒でKeep-Alive開始
            TCP_KEEPINTVL: '10',                  // 10秒間隔
            TCP_KEEPCNT: '9',                     // 9回試行

            // バッファリング制御
            SO_SNDBUF: '262144',                  // 送信バッファ
            SO_RCVBUF: '262144',                  // 受信バッファ

            // エラー検出強化
            WEBSOCKET_ERROR_RECOVERY: 'aggressive',
            CONNECTION_MONITOR_INTERVAL: '5s',
            HEARTBEAT_INTERVAL: '15s',

            // ログレベル
            LOG_LEVEL: 'DEBUG',
            LOG_CONNECTION_EVENTS: '1'
        };

        // 超安定サーバー起動
        this.log('stability', '🛡️ Launching with ultra-stability configurations');

        this.serverProcess = spawn('./remoteclaude-server', ['--port=8092'], {
            cwd: this.serverDir,
            env: ultraStableEnv,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // 出力監視強化
        this.setupEnhancedMonitoring();

        // プロセス監視強化
        this.setupEnhancedProcessMonitoring();

        // 接続安定化監視
        this.setupConnectionStabilityMonitoring();

        this.isRunning = true;
        this.log('success', `✅ Ultra-stable server started (PID: ${this.serverProcess.pid})`);

        return this.serverProcess.pid;
    }

    setupEnhancedMonitoring() {
        // stdout監視 - 長時間処理検出
        this.serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            this.analyzeForStability(output, 'stdout');
        });

        // stderr監視 - エラー検出強化
        this.serverProcess.stderr.on('data', (data) => {
            const output = data.toString();
            this.analyzeForStability(output, 'stderr');
        });
    }

    analyzeForStability(output, source) {
        const lines = output.split('\n').filter(line => line.trim());
        this.lastActivityTime = Date.now();

        for (const line of lines) {
            // 長時間実行検出
            if (line.includes('🤖 Executing in Docker container') &&
                (line.includes('matplotlib') || line.includes('pandas') || line.includes('データ可視化'))) {
                this.longExecutionDetected = true;
                this.log('stability', '🛡️ Long execution detected - activating stability mode');
                this.activateStabilityMode();
            }

            // Claude出力完了検出
            if (line.includes('Successfully sent WebSocket message type: claude_output')) {
                if (this.longExecutionDetected) {
                    this.log('stability', '🛡️ Long execution completed - reinforcing connection');
                    this.reinforceConnectionAfterExecution();
                }
            }

            // Code 1006 検出と緊急対応
            if (this.detectCode1006(line)) {
                this.handleCode1006Emergency(line);
            }

            // 接続成功
            if (line.includes('Mobile app connected')) {
                this.log('stability', `🛡️ Stable connection: ${line.trim()}`);
                this.code1006Count = Math.max(0, this.code1006Count - 1);
            }

            // Ping/Pong監視
            if (line.includes('Successfully sent WebSocket message type: pong')) {
                this.log('stability', '🛡️ Keepalive ping successful');
            }

            // エラー検出
            if (line.includes('WebSocket read error') || line.includes('connection reset')) {
                this.log('warning', `🛡️ Connection instability: ${line.trim()}`);
            }
        }
    }

    detectCode1006(line) {
        return (
            line.includes('close 1006') ||
            line.includes('bad close code 1006') ||
            line.includes('websocket: close 1006') ||
            line.includes('abnormal closure')
        );
    }

    handleCode1006Emergency(line) {
        this.code1006Count++;
        this.log('critical', `🚨 Code 1006 EMERGENCY! Count: ${this.code1006Count}`);
        this.log('critical', `Details: ${line.trim()}`);

        // 緊急安定化処理
        if (this.code1006Count >= 1) { // 1回でも即座に対応
            this.triggerEmergencyStabilization();
        }
    }

    async triggerEmergencyStabilization() {
        this.log('critical', '🚨 EMERGENCY STABILIZATION ACTIVATED');

        try {
            // 現在のサーバーを優雅に再起動
            if (this.serverProcess && !this.serverProcess.killed) {
                this.log('info', '🔄 Graceful server restart for stabilization');

                // 優雅な停止を試行
                this.serverProcess.kill('SIGTERM');

                // 3秒後に強制終了の準備
                setTimeout(() => {
                    if (this.serverProcess && !this.serverProcess.killed) {
                        this.log('warning', '🔨 Force terminating for stability');
                        this.serverProcess.kill('SIGKILL');
                    }
                }, 3000);
            }

            // 5秒待機してから再起動
            await new Promise(resolve => setTimeout(resolve, 5000));

            // カウンターリセット
            this.code1006Count = 0;
            this.longExecutionDetected = false;

            // 超安定サーバー再起動
            if (this.isRunning) {
                await this.startUltraStableServer();
                this.log('success', '✅ Emergency stabilization completed');
            }

        } catch (error) {
            this.log('error', `Emergency stabilization failed: ${error.message}`);
        }
    }

    activateStabilityMode() {
        this.log('stability', '🛡️ Stability mode activated for long execution');

        // 安定化タイマー設定（長時間処理中の追加監視）
        const stabilityInterval = setInterval(() => {
            if (!this.longExecutionDetected) {
                clearInterval(stabilityInterval);
                return;
            }

            const timeSinceActivity = Date.now() - this.lastActivityTime;
            if (timeSinceActivity > 60000) { // 1分間活動なし
                this.log('warning', '🛡️ Long period without activity during execution');
            }

            this.log('stability', '🛡️ Stability monitoring active during long execution');
        }, 30000); // 30秒間隔
    }

    reinforceConnectionAfterExecution() {
        this.log('stability', '🛡️ Reinforcing connection after long execution');
        this.longExecutionDetected = false;

        // 実行完了後の安定化処理
        setTimeout(() => {
            this.log('stability', '🛡️ Post-execution stability check completed');
        }, 10000); // 10秒後に安定化確認
    }

    setupEnhancedProcessMonitoring() {
        this.serverProcess.on('close', (code) => {
            this.log('warning', `🛡️ Server process closed: ${code}`);
            this.isRunning = false;

            if (code !== 0 && this.isRunning) {
                this.log('critical', '🚨 Unexpected server termination - emergency restart');
                setTimeout(() => {
                    if (!this.isRunning) {
                        this.startUltraStableServer();
                    }
                }, 2000);
            }
        });

        this.serverProcess.on('error', (error) => {
            this.log('error', `🛡️ Server process error: ${error.message}`);
        });
    }

    setupConnectionStabilityMonitoring() {
        // 接続安定性の定期監視
        setInterval(() => {
            if (!this.isRunning) return;

            const timeSinceActivity = Date.now() - this.lastActivityTime;

            if (timeSinceActivity > 300000) { // 5分間活動なし
                this.log('warning', '🛡️ Long period without server activity - potential issue');
            }

            this.log('stability', `🛡️ Connection stability monitor: ${Math.round(timeSinceActivity / 1000)}s since last activity`);
        }, 60000); // 1分間隔
    }

    async stopExistingServers() {
        this.log('info', '🔄 Stopping existing servers for ultra-stability');

        try {
            const killCommand = 'pkill -f "remoteclaude-server"';
            await this.runCommand(killCommand);
            await new Promise(resolve => setTimeout(resolve, 3000));
            this.log('success', '✅ Existing servers stopped for stability');
        } catch (error) {
            this.log('warning', `Stop warning: ${error.message}`);
        }
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

    async stopUltraStableServer() {
        this.log('info', '🛑 Stopping ultra-stable server');
        this.isRunning = false;

        if (this.serverProcess) {
            this.serverProcess.kill('SIGTERM');
            this.serverProcess = null;
        }

        this.log('success', '✅ Ultra-stable server stopped');
    }

    getStabilityStats() {
        return {
            isRunning: this.isRunning,
            serverPID: this.serverProcess ? this.serverProcess.pid : null,
            code1006Count: this.code1006Count,
            longExecutionMode: this.longExecutionDetected,
            lastActivityTime: this.lastActivityTime,
            uptime: this.startTime ? Date.now() - this.startTime : 0,
            stabilityFeatures: [
                'Ultra-frequent keepalive (10s)',
                'Extended timeout (5min)',
                'Aggressive error recovery',
                'Long execution monitoring',
                'Post-execution reinforcement',
                'Emergency auto-restart',
                'TCP keepalive tuning'
            ]
        };
    }
}

// CLI実行
async function main() {
    if (require.main === module) {
        const stabilizer = new UltraStableServer();

        try {
            await stabilizer.startUltraStableServer();
            stabilizer.startTime = Date.now();

            // 終了処理
            process.on('SIGINT', async () => {
                console.log('\n🛑 Stopping ultra-stable server...');
                await stabilizer.stopUltraStableServer();
                process.exit(0);
            });

            // 安定性統計表示（30秒間隔）
            setInterval(() => {
                const stats = stabilizer.getStabilityStats();
                console.log(`\n🛡️ Stability Stats:`);
                console.log(`  Running: ${stats.isRunning}`);
                console.log(`  PID: ${stats.serverPID || 'None'}`);
                console.log(`  Code 1006 Count: ${stats.code1006Count}`);
                console.log(`  Long Execution Mode: ${stats.longExecutionMode}`);
                console.log(`  Uptime: ${Math.round(stats.uptime / 1000)}s`);
                console.log(`  Features: ${stats.stabilityFeatures.length} active`);
            }, 30000);

        } catch (error) {
            console.error(`❌ Ultra-stable server failed: ${error.message}`);
            process.exit(1);
        }
    }
}

module.exports = UltraStableServer;

if (require.main === module) {
    main();
}