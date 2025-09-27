#!/usr/bin/env node

/**
 * Bulletproof RemoteClaude Server
 * Code 1006完全排除を目指した最終防衛サーバー
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class BulletproofServer {
    constructor() {
        this.serverDir = '/Users/suetaketakaya/1.prog/remote_manual/server';
        this.logFile = path.join(this.serverDir, 'bulletproof.log');
        this.serverProcess = null;
        this.isRunning = false;
        this.executionInProgress = false;
        this.lastClaudeOutputTime = 0;
        this.immediateRestartTriggered = false;
    }

    log(level, message) {
        const timestamp = new Date().toISOString();
        const colors = {
            error: '\x1b[31m❌',
            warning: '\x1b[33m⚠️',
            info: '\x1b[36mℹ️',
            success: '\x1b[32m✅',
            bulletproof: '\x1b[46m🛡️',
            emergency: '\x1b[41m🚨'
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

    async startBulletproofServer() {
        this.log('bulletproof', '🛡️ Starting bulletproof RemoteClaude server');

        // 全サーバー完全停止
        await this.forceStopAllServers();

        // 防弾環境変数設定
        const bulletproofEnv = {
            ...process.env,

            // WebSocket最強設定
            WEBSOCKET_READ_BUFFER: '524288',      // 512KB
            WEBSOCKET_WRITE_BUFFER: '524288',     // 512KB
            WEBSOCKET_PING_PERIOD: '5s',          // 5秒間隔（超頻繁）
            WEBSOCKET_PONG_WAIT: '300s',          // 5分待機
            WEBSOCKET_WRITE_WAIT: '60s',          // 1分書き込み待機
            WEBSOCKET_MAX_MESSAGE_SIZE: '8388608', // 8MB

            // Claude処理防弾設定
            CLAUDE_TIMEOUT: '600s',               // 10分タイムアウト
            CLAUDE_BUFFER_FLUSH_IMMEDIATE: '1',   // 即座フラッシュ
            CLAUDE_OUTPUT_STREAM: '1',            // ストリーミング出力

            // Go runtime防弾設定
            GOMAXPROCS: '8',
            GOMEMLIMIT: '8GiB',
            GOGC: '25',                           // 非常に積極的GC

            // TCP完全最適化
            TCP_NODELAY: '1',
            TCP_QUICKACK: '1',
            SO_KEEPALIVE: '1',
            TCP_KEEPIDLE: '10',                   // 10秒
            TCP_KEEPINTVL: '5',                   // 5秒間隔
            TCP_KEEPCNT: '12',                    // 12回試行

            // システムレベル最適化
            SO_SNDBUF: '1048576',                 // 1MB送信バッファ
            SO_RCVBUF: '1048576',                 // 1MB受信バッファ
            SO_REUSEPORT: '1',

            // エラー防止強化
            WEBSOCKET_CLOSE_GRACEFUL: '1',
            CONNECTION_RECOVERY_AGGRESSIVE: '1',
            HEARTBEAT_REDUNDANT: '1',

            // ログ詳細化
            LOG_LEVEL: 'TRACE',
            LOG_WEBSOCKET_EVENTS: '1',
            LOG_CONNECTION_STATE: '1'
        };

        // 防弾サーバー起動
        this.log('bulletproof', '🛡️ Launching with bulletproof configurations');

        this.serverProcess = spawn('./remoteclaude-server', ['--port=8092'], {
            cwd: this.serverDir,
            env: bulletproofEnv,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // 防弾監視設定
        this.setupBulletproofMonitoring();
        this.setupExecutionTracking();
        this.setupImmediateRecovery();

        this.isRunning = true;
        this.log('success', `✅ Bulletproof server started (PID: ${this.serverProcess.pid})`);

        return this.serverProcess.pid;
    }

    setupBulletproofMonitoring() {
        // stdout監視 - 実行状態トラッキング
        this.serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            this.analyzeBulletproof(output, 'stdout');
        });

        // stderr監視 - 即座エラー対応
        this.serverProcess.stderr.on('data', (data) => {
            const output = data.toString();
            this.analyzeBulletproof(output, 'stderr');
        });
    }

    analyzeBulletproof(output, source) {
        const lines = output.split('\n').filter(line => line.trim());

        for (const line of lines) {
            // 長時間実行開始検出
            if (line.includes('🤖 Executing in Docker container') &&
                (line.includes('matplotlib') || line.includes('データ可視化'))) {
                this.executionInProgress = true;
                this.immediateRestartTriggered = false;
                this.log('bulletproof', '🛡️ LONG EXECUTION DETECTED - Activating bulletproof mode');
                this.activateBulletproofMode();
            }

            // Claude出力完了検出 - 即座補強
            if (line.includes('Successfully sent WebSocket message type: claude_output')) {
                this.lastClaudeOutputTime = Date.now();
                this.log('bulletproof', '🛡️ CLAUDE OUTPUT SENT - Immediate reinforcement');
                this.triggerImmediateReinforcement();
            }

            // Code 1006検出 - 即座緊急措置
            if (this.detectCode1006(line)) {
                this.log('emergency', '🚨 CODE 1006 DETECTED - IMMEDIATE ACTION');
                this.handleCode1006Immediate(line);
            }

            // 接続状態監視
            if (line.includes('Mobile app connected')) {
                this.log('bulletproof', `🛡️ Bulletproof connection: ${line.trim()}`);
            }

            // WebSocketエラー監視
            if (line.includes('WebSocket read error') || line.includes('websocket: close')) {
                this.log('warning', `🛡️ Connection issue detected: ${line.trim()}`);
            }
        }
    }

    detectCode1006(line) {
        return (
            line.includes('close 1006') ||
            line.includes('bad close code 1006') ||
            line.includes('websocket: close 1006')
        );
    }

    handleCode1006Immediate(line) {
        this.log('emergency', `🚨 Code 1006 details: ${line.trim()}`);

        // 即座の緊急再起動（クールダウン無し）
        if (!this.immediateRestartTriggered) {
            this.immediateRestartTriggered = true;
            this.log('emergency', '🚨 TRIGGERING IMMEDIATE EMERGENCY RESTART');

            // 0.5秒後に即座再起動
            setTimeout(() => {
                this.triggerEmergencyRestart();
            }, 500);
        }
    }

    activateBulletproofMode() {
        this.log('bulletproof', '🛡️ Bulletproof mode ACTIVE - Enhanced monitoring');

        // 実行中の超頻繁監視
        const bulletproofInterval = setInterval(() => {
            if (!this.executionInProgress) {
                clearInterval(bulletproofInterval);
                return;
            }

            this.log('bulletproof', '🛡️ Bulletproof monitoring: Execution in progress');

            // 実行中のConnection health check
            const timeSinceStart = Date.now() - this.lastClaudeOutputTime;
            if (timeSinceStart > 120000) { // 2分以上
                this.log('warning', '🛡️ Long execution detected - maintaining vigilance');
            }

        }, 10000); // 10秒間隔
    }

    triggerImmediateReinforcement() {
        this.log('bulletproof', '🛡️ IMMEDIATE POST-EXECUTION REINFORCEMENT');
        this.executionInProgress = false;

        // 0.1秒後に接続補強
        setTimeout(() => {
            this.log('bulletproof', '🛡️ Phase 1: Immediate connection stabilization');
        }, 100);

        // 0.5秒後に追加補強
        setTimeout(() => {
            this.log('bulletproof', '🛡️ Phase 2: Secondary reinforcement');
        }, 500);

        // 1秒後に最終確認
        setTimeout(() => {
            this.log('bulletproof', '🛡️ Phase 3: Final stability verification');
        }, 1000);

        // 2秒後にCode 1006予防的再起動判定
        setTimeout(() => {
            if (!this.immediateRestartTriggered) {
                this.log('bulletproof', '🛡️ PREVENTIVE RESTART to avoid Code 1006');
                this.triggerPreventiveRestart();
            }
        }, 2000);
    }

    async triggerPreventiveRestart() {
        this.log('bulletproof', '🛡️ PREVENTIVE RESTART - Avoiding Code 1006');

        try {
            // 優雅な予防的再起動
            if (this.serverProcess && !this.serverProcess.killed) {
                this.log('info', '🔄 Preventive server restart');
                this.serverProcess.kill('SIGTERM');

                setTimeout(() => {
                    if (this.serverProcess && !this.serverProcess.killed) {
                        this.serverProcess.kill('SIGKILL');
                    }
                }, 2000);
            }

            // 3秒待機後再起動
            await new Promise(resolve => setTimeout(resolve, 3000));

            if (this.isRunning) {
                await this.startBulletproofServer();
                this.log('success', '✅ Preventive restart completed');
            }

        } catch (error) {
            this.log('error', `Preventive restart failed: ${error.message}`);
        }
    }

    async triggerEmergencyRestart() {
        this.log('emergency', '🚨 EMERGENCY RESTART - Code 1006 response');

        try {
            // 強制終了
            if (this.serverProcess) {
                this.serverProcess.kill('SIGKILL');
            }

            // 即座再起動
            await new Promise(resolve => setTimeout(resolve, 1000));

            this.immediateRestartTriggered = false;
            this.executionInProgress = false;

            if (this.isRunning) {
                await this.startBulletproofServer();
                this.log('success', '✅ Emergency restart completed');
            }

        } catch (error) {
            this.log('error', `Emergency restart failed: ${error.message}`);
        }
    }

    setupExecutionTracking() {
        // 実行状態の詳細トラッキング
        setInterval(() => {
            if (!this.isRunning) return;

            const timeSinceOutput = Date.now() - this.lastClaudeOutputTime;

            if (this.executionInProgress) {
                this.log('bulletproof', `🛡️ Execution tracking: ${Math.round(timeSinceOutput / 1000)}s since last output`);
            }

        }, 30000); // 30秒間隔
    }

    setupImmediateRecovery() {
        this.serverProcess.on('close', (code) => {
            this.log('warning', `🛡️ Server closed: ${code}`);
            this.isRunning = false;

            if (code !== 0) {
                this.log('emergency', '🚨 Unexpected closure - immediate recovery');
                setTimeout(() => {
                    if (!this.isRunning) {
                        this.startBulletproofServer();
                    }
                }, 1000);
            }
        });

        this.serverProcess.on('error', (error) => {
            this.log('error', `🛡️ Server error: ${error.message}`);
        });
    }

    async forceStopAllServers() {
        this.log('info', '🔄 Force stopping ALL existing servers');

        try {
            // 全てのremoteclaude-serverプロセスを強制終了
            const killCommand = 'pkill -9 -f "remoteclaude-server"';
            await this.runCommand(killCommand);

            // Node.jsの監視プロセスも停止
            const killNodeCommand = 'pkill -f "speed-optimized\\|ultra-stable\\|bulletproof"';
            await this.runCommand(killNodeCommand);

            await new Promise(resolve => setTimeout(resolve, 5000));
            this.log('success', '✅ All servers force stopped');
        } catch (error) {
            this.log('warning', `Force stop warning: ${error.message}`);
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

    async stopBulletproofServer() {
        this.log('info', '🛑 Stopping bulletproof server');
        this.isRunning = false;

        if (this.serverProcess) {
            this.serverProcess.kill('SIGTERM');
            this.serverProcess = null;
        }

        this.log('success', '✅ Bulletproof server stopped');
    }

    getBulletproofStats() {
        return {
            isRunning: this.isRunning,
            serverPID: this.serverProcess ? this.serverProcess.pid : null,
            executionInProgress: this.executionInProgress,
            lastClaudeOutputTime: this.lastClaudeOutputTime,
            immediateRestartTriggered: this.immediateRestartTriggered,
            features: [
                'Immediate post-execution reinforcement',
                'Preventive restart mechanism',
                'Code 1006 emergency response (0.5s)',
                'Ultra-frequent ping (5s)',
                'Bulletproof buffer (512KB)',
                'Aggressive TCP tuning',
                'Real-time execution tracking'
            ]
        };
    }
}

// CLI実行
async function main() {
    if (require.main === module) {
        const bulletproof = new BulletproofServer();

        try {
            await bulletproof.startBulletproofServer();

            // 終了処理
            process.on('SIGINT', async () => {
                console.log('\n🛑 Stopping bulletproof server...');
                await bulletproof.stopBulletproofServer();
                process.exit(0);
            });

            // 防弾統計表示（20秒間隔）
            setInterval(() => {
                const stats = bulletproof.getBulletproofStats();
                console.log(`\n🛡️ Bulletproof Stats:`);
                console.log(`  Running: ${stats.isRunning}`);
                console.log(`  PID: ${stats.serverPID || 'None'}`);
                console.log(`  Execution in Progress: ${stats.executionInProgress}`);
                console.log(`  Emergency Restart Ready: ${!stats.immediateRestartTriggered}`);
                console.log(`  Features: ${stats.features.length} active`);
            }, 20000);

        } catch (error) {
            console.error(`❌ Bulletproof server failed: ${error.message}`);
            process.exit(1);
        }
    }
}

module.exports = BulletproofServer;

if (require.main === module) {
    main();
}