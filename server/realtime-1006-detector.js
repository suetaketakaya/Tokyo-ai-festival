#!/usr/bin/env node

/**
 * Real-time Code 1006 Detector for Go Server
 * 🔍 Direct stdout/stderr monitoring for WebSocket bad close
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class RealtimeCode1006Detector {
    constructor() {
        this.serverDir = '/Users/suetaketakaya/1.prog/remote_manual/server';
        this.logFile = path.join(this.serverDir, 'realtime-1006.log');
        this.code1006Count = 0;
        this.alertThreshold = 2; // 2回で即座に再起動
        this.restartCooldown = 30000; // 30秒のクールダウン
        this.lastRestartTime = 0;
        this.isMonitoring = false;
        this.serverProcess = null;
    }

    log(level, message) {
        const timestamp = new Date().toISOString();
        const colors = {
            error: '\x1b[31m❌',
            warning: '\x1b[33m⚠️',
            info: '\x1b[36mℹ️',
            success: '\x1b[32m✅',
            critical: '\x1b[35m🚨'
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

    async startRealTimeMonitoring() {
        this.log('info', '🔍 Starting real-time Code 1006 detection');
        this.isMonitoring = true;

        // 既存のサーバープロセスを終了
        await this.stopExistingServer();

        // 最適化された環境でサーバーを開始
        this.startOptimizedServer();
    }

    async stopExistingServer() {
        this.log('info', '🔄 Stopping existing server processes');

        try {
            // 既存のサーバープロセスを検索して終了
            const killCommand = 'pkill -f "remoteclaude-server --port=8091"';
            await this.runCommand(killCommand);

            // 少し待機
            await new Promise(resolve => setTimeout(resolve, 3000));

            this.log('success', '✅ Existing server processes stopped');
        } catch (error) {
            this.log('warning', `Server stop warning: ${error.message}`);
        }
    }

    startOptimizedServer() {
        this.log('info', '🚀 Starting optimized server with real-time monitoring');

        // 環境変数設定
        const env = {
            ...process.env,
            WEBSOCKET_READ_BUFFER: '32768',
            WEBSOCKET_WRITE_BUFFER: '32768',
            WEBSOCKET_PING_PERIOD: '25s',
            WEBSOCKET_PONG_WAIT: '60s',
            WEBSOCKET_WRITE_WAIT: '10s',
            WEBSOCKET_MAX_MESSAGE_SIZE: '65536',
            GOMAXPROCS: '4',
            GOMEMLIMIT: '2GiB',
            GOGC: '200'
        };

        // サーバーを起動
        this.serverProcess = spawn('./remoteclaude-server', ['--port=8091'], {
            cwd: this.serverDir,
            env: env,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // stdoutの監視
        this.serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            this.analyzeServerOutput(output, 'stdout');
        });

        // stderrの監視（ここが重要！）
        this.serverProcess.stderr.on('data', (data) => {
            const output = data.toString();
            this.analyzeServerOutput(output, 'stderr');
        });

        // プロセス終了の監視
        this.serverProcess.on('close', (code) => {
            this.log('warning', `Server process exited with code: ${code}`);
            if (this.isMonitoring && code !== 0) {
                this.log('critical', '🚨 Server crashed - restarting in 5 seconds');
                setTimeout(() => {
                    if (this.isMonitoring) {
                        this.startOptimizedServer();
                    }
                }, 5000);
            }
        });

        this.serverProcess.on('error', (error) => {
            this.log('error', `Server process error: ${error.message}`);
        });

        this.log('success', `✅ Optimized server started (PID: ${this.serverProcess.pid})`);
    }

    analyzeServerOutput(output, source) {
        const lines = output.split('\n').filter(line => line.trim());

        for (const line of lines) {
            // Code 1006 検出
            if (this.detectCode1006(line)) {
                this.handleCode1006Detection(line);
            }

            // その他の重要なWebSocketエラー
            if (this.detectWebSocketError(line)) {
                this.log('warning', `WebSocket error detected (${source}): ${line.trim()}`);
            }

            // 成功的な接続
            if (line.includes('Mobile app connected') || line.includes('WebSocket connection attempt')) {
                this.log('info', `📱 ${line.trim()}`);
                // 成功的な接続でカウンターを少し減らす
                if (this.code1006Count > 0) {
                    this.code1006Count = Math.max(0, this.code1006Count - 0.5);
                }
            }
        }
    }

    detectCode1006(line) {
        return (
            line.includes('close 1006') ||
            line.includes('bad close code 1006') ||
            line.includes('websocket: close 1006') ||
            line.includes('abnormal closure') ||
            line.includes('unexpected EOF')
        );
    }

    detectWebSocketError(line) {
        return (
            line.includes('websocket:') ||
            line.includes('WebSocket error') ||
            line.includes('connection reset') ||
            line.includes('broken pipe')
        );
    }

    handleCode1006Detection(line) {
        this.code1006Count++;
        this.log('critical', `🚨 Code 1006 detected! Count: ${this.code1006Count}`);
        this.log('critical', `Error details: ${line.trim()}`);

        // 緊急再起動の判定
        if (this.code1006Count >= this.alertThreshold) {
            const now = Date.now();
            if (now - this.lastRestartTime > this.restartCooldown) {
                this.triggerEmergencyRestart();
            } else {
                this.log('warning', `Restart cooldown active. Next restart available in ${Math.round((this.restartCooldown - (now - this.lastRestartTime)) / 1000)}s`);
            }
        }
    }

    async triggerEmergencyRestart() {
        this.log('critical', `🚨 EMERGENCY RESTART triggered after ${this.code1006Count} Code 1006 errors`);
        this.lastRestartTime = Date.now();

        try {
            // 現在のサーバーを停止
            if (this.serverProcess) {
                this.log('info', '🔄 Stopping current server process');
                this.serverProcess.kill('SIGTERM');

                // 強制終了の準備
                setTimeout(() => {
                    if (this.serverProcess && !this.serverProcess.killed) {
                        this.log('warning', '🔨 Force killing server process');
                        this.serverProcess.kill('SIGKILL');
                    }
                }, 5000);
            }

            // 少し待機してから再起動
            await new Promise(resolve => setTimeout(resolve, 8000));

            // カウンターリセット
            this.code1006Count = 0;

            // 最適化されたサーバーを再起動
            this.startOptimizedServer();

            this.log('success', '✅ Emergency restart completed');

        } catch (error) {
            this.log('error', `Emergency restart failed: ${error.message}`);
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

    async stopMonitoring() {
        this.log('info', '🛑 Stopping real-time monitoring');
        this.isMonitoring = false;

        if (this.serverProcess) {
            this.log('info', '🔄 Stopping monitored server');
            this.serverProcess.kill('SIGTERM');
            this.serverProcess = null;
        }

        this.log('success', '✅ Real-time monitoring stopped');
    }

    getStats() {
        return {
            isMonitoring: this.isMonitoring,
            code1006Count: this.code1006Count,
            alertThreshold: this.alertThreshold,
            lastRestartTime: this.lastRestartTime,
            serverPID: this.serverProcess ? this.serverProcess.pid : null,
            uptime: this.lastRestartTime ? Date.now() - this.lastRestartTime : 0
        };
    }
}

// CLI実行
async function main() {
    if (require.main === module) {
        const detector = new RealtimeCode1006Detector();

        try {
            await detector.startRealTimeMonitoring();

            // 終了処理
            process.on('SIGINT', async () => {
                console.log('\n🛑 Stopping real-time Code 1006 detector...');
                await detector.stopMonitoring();
                process.exit(0);
            });

            // 統計表示（30秒間隔）
            setInterval(() => {
                const stats = detector.getStats();
                console.log(`\n📊 Detector Stats:`);
                console.log(`  Monitoring: ${stats.isMonitoring}`);
                console.log(`  Code 1006 Count: ${stats.code1006Count}/${stats.alertThreshold}`);
                console.log(`  Server PID: ${stats.serverPID || 'None'}`);
                console.log(`  Uptime: ${Math.round(stats.uptime / 1000)}s`);
            }, 30000);

        } catch (error) {
            console.error(`❌ Detector failed: ${error.message}`);
            process.exit(1);
        }
    }
}

module.exports = RealtimeCode1006Detector;

if (require.main === module) {
    main();
}