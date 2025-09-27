#!/usr/bin/env node

/**
 * Speed-Optimized RemoteClaude Server
 * 高速処理に特化したサーバー実装
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class SpeedOptimizedServer {
    constructor() {
        this.serverDir = '/Users/suetaketakaya/1.prog/remote_manual/server';
        this.logFile = path.join(this.serverDir, 'speed-optimized.log');
        this.serverProcess = null;
        this.isRunning = false;
    }

    log(level, message) {
        const timestamp = new Date().toISOString();
        const colors = {
            error: '\x1b[31m❌',
            warning: '\x1b[33m⚠️',
            info: '\x1b[36mℹ️',
            success: '\x1b[32m✅',
            speed: '\x1b[35m🚀'
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

    async startOptimizedServer() {
        this.log('speed', '🚀 Starting speed-optimized RemoteClaude server');

        // 既存サーバー停止
        await this.stopExistingServers();

        // 最適化環境変数
        const optimizedEnv = {
            ...process.env,

            // WebSocket最適化 (接続安定性優先から速度優先に変更)
            WEBSOCKET_READ_BUFFER: '131072',      // 128KB (2倍)
            WEBSOCKET_WRITE_BUFFER: '131072',     // 128KB (2倍)
            WEBSOCKET_PING_PERIOD: '30s',         // 30秒 (短縮)
            WEBSOCKET_PONG_WAIT: '90s',           // 90秒 (短縮)
            WEBSOCKET_WRITE_WAIT: '30s',          // 30秒 (短縮)
            WEBSOCKET_MAX_MESSAGE_SIZE: '2097152', // 2MB

            // Go runtime最適化
            GOMAXPROCS: '8',                      // CPUコア数を最大活用
            GOMEMLIMIT: '4GiB',                   // メモリ制限緩和
            GOGC: '100',                          // GC頻度を標準に

            // Claude処理最適化
            CLAUDE_TIMEOUT: '60s',                // Claude処理タイムアウト延長
            CLAUDE_PARALLEL_REQUESTS: '4',        // 並列リクエスト数増加
            CLAUDE_CACHE_SIZE: '1000',            // キャッシュサイズ増加

            // システム最適化
            TCP_NODELAY: '1',                     // TCP Nagle無効化
            TCP_QUICKACK: '1',                    // TCP Quick ACK有効
            SO_REUSEPORT: '1',                    // ポート再利用

            // ファイル処理最適化
            FILE_SCAN_PARALLEL: '8',              // ファイルスキャン並列数
            DOCKER_EXEC_TIMEOUT: '30s',           // Docker実行タイムアウト

            // ログ最適化
            LOG_LEVEL: 'INFO',                    // ログレベル調整
            LOG_BUFFER_SIZE: '65536'              // ログバッファサイズ
        };

        // 高速化サーバー起動
        this.log('speed', '⚡ Launching with performance optimizations');

        this.serverProcess = spawn('./remoteclaude-server', ['--port=8092'], {
            cwd: this.serverDir,
            env: optimizedEnv,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // 出力監視
        this.setupOutputMonitoring();

        // プロセス監視
        this.setupProcessMonitoring();

        this.isRunning = true;
        this.log('success', `✅ Speed-optimized server started (PID: ${this.serverProcess.pid})`);

        return this.serverProcess.pid;
    }

    setupOutputMonitoring() {
        // stdout監視
        this.serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            this.analyzePerformance(output, 'stdout');
        });

        // stderr監視
        this.serverProcess.stderr.on('data', (data) => {
            const output = data.toString();
            this.analyzePerformance(output, 'stderr');
        });
    }

    analyzePerformance(output, source) {
        const lines = output.split('\n').filter(line => line.trim());

        for (const line of lines) {
            // 接続時間測定
            if (line.includes('Mobile app connected')) {
                this.log('speed', `📱 Fast connection established: ${line.trim()}`);
            }

            // 処理時間測定
            if (line.includes('Executing in') || line.includes('find /workspace')) {
                const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
                this.log('speed', `⚡ Fast execution [${timestamp}]: ${line.trim()}`);
            }

            // WebSocket送信最適化
            if (line.includes('Successfully sent WebSocket message')) {
                this.log('speed', `📤 Optimized send: ${line.trim()}`);
            }

            // エラー監視
            if (line.includes('error') || line.includes('Error') || line.includes('failed')) {
                this.log('warning', `Performance warning: ${line.trim()}`);
            }

            // タイムアウト監視
            if (line.includes('timeout') || line.includes('slow')) {
                this.log('warning', `Speed bottleneck detected: ${line.trim()}`);
            }
        }
    }

    setupProcessMonitoring() {
        this.serverProcess.on('close', (code) => {
            this.log('warning', `Speed-optimized server exited: ${code}`);
            this.isRunning = false;

            if (code !== 0) {
                this.log('error', '🚨 Performance degradation - restarting in 3 seconds');
                setTimeout(() => {
                    if (!this.isRunning) {
                        this.startOptimizedServer();
                    }
                }, 3000);
            }
        });

        this.serverProcess.on('error', (error) => {
            this.log('error', `Server process error: ${error.message}`);
        });
    }

    async stopExistingServers() {
        this.log('info', '🔄 Stopping existing servers for optimization');

        try {
            // 既存のremoteclaude-serverプロセスを停止
            const killCommand = 'pkill -f "remoteclaude-server"';
            await this.runCommand(killCommand);

            // 少し待機
            await new Promise(resolve => setTimeout(resolve, 2000));

            this.log('success', '✅ Existing servers stopped for optimization');
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

    async stopOptimizedServer() {
        this.log('info', '🛑 Stopping speed-optimized server');
        this.isRunning = false;

        if (this.serverProcess) {
            this.serverProcess.kill('SIGTERM');
            this.serverProcess = null;
        }

        this.log('success', '✅ Speed-optimized server stopped');
    }

    getPerformanceStats() {
        return {
            isRunning: this.isRunning,
            serverPID: this.serverProcess ? this.serverProcess.pid : null,
            optimizations: [
                'WebSocket buffer expansion (256KB)',
                'Parallel processing (8 cores)',
                'Extended memory limit (4GB)',
                'TCP optimization (no-delay)',
                'Fast file scanning (8 parallel)',
                'Claude timeout extension (60s)',
                'Response caching (1000 entries)'
            ],
            startTime: this.startTime || Date.now()
        };
    }
}

// CLI実行
async function main() {
    if (require.main === module) {
        const optimizer = new SpeedOptimizedServer();

        try {
            await optimizer.startOptimizedServer();

            // 終了処理
            process.on('SIGINT', async () => {
                console.log('\n🛑 Stopping speed-optimized server...');
                await optimizer.stopOptimizedServer();
                process.exit(0);
            });

            // パフォーマンス統計表示（20秒間隔）
            setInterval(() => {
                const stats = optimizer.getPerformanceStats();
                console.log(`\n⚡ Performance Stats:`);
                console.log(`  Running: ${stats.isRunning}`);
                console.log(`  PID: ${stats.serverPID || 'None'}`);
                console.log(`  Uptime: ${Math.round((Date.now() - stats.startTime) / 1000)}s`);
                console.log(`  Optimizations: ${stats.optimizations.length} active`);
            }, 20000);

        } catch (error) {
            console.error(`❌ Speed optimization failed: ${error.message}`);
            process.exit(1);
        }
    }
}

module.exports = SpeedOptimizedServer;

if (require.main === module) {
    main();
}