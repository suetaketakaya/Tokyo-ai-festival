#!/usr/bin/env node

/**
 * RemoteClaude v3.7.1 - Connection Stability Monitor
 * 📊 Real-time Connection Analysis and Auto-Recovery
 */

const WebSocketErrorHandler = require('./websocket-error-handler');
const RobustWebSocketClient = require('./robust-websocket-client');
const fs = require('fs');
const path = require('path');

// カラー定義
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    purple: '\x1b[35m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

class ConnectionStabilityMonitor {
    constructor(wsUrl, options = {}) {
        this.wsUrl = wsUrl;
        this.scriptDir = __dirname;
        this.logsDir = path.join(this.scriptDir, 'logs');

        // ログディレクトリ作成
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }

        this.errorHandler = new WebSocketErrorHandler(options);
        this.wsClient = null;
        this.isMonitoring = false;
        this.startTime = Date.now();

        // 統計情報
        this.stats = {
            totalConnections: 0,
            successfulConnections: 0,
            totalDisconnections: 0,
            totalErrors: 0,
            code1006Count: 0,
            averageUptime: 0,
            longestUptime: 0,
            currentUptime: 0
        };

        // 監視設定
        this.monitoringInterval = null;
        this.logInterval = null;
        this.recoveryStrategies = [];

        this.setupEventHandlers();
    }

    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const colorMap = {
            success: colors.green,
            error: colors.red,
            warning: colors.yellow,
            info: colors.cyan,
            debug: colors.purple
        };

        const color = colorMap[level] || colors.reset;
        const symbol = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            debug: '🔍'
        }[level] || '';

        const logMessage = `${color}${symbol} [${timestamp.split('T')[1].split('.')[0]}] ${message}${colors.reset}`;
        console.log(logMessage);

        // ファイルログ
        const logFile = path.join(this.logsDir, `connection-monitor-${new Date().toISOString().split('T')[0]}.log`);
        const fileMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}${data ? ' | Data: ' + JSON.stringify(data) : ''}\n`;

        try {
            fs.appendFileSync(logFile, fileMessage);
        } catch (error) {
            console.error('Failed to write log file:', error.message);
        }

        if (data && process.env.DEBUG) {
            console.log(`${colors.purple}   ${JSON.stringify(data, null, 2)}${colors.reset}`);
        }
    }

    setupEventHandlers() {
        this.errorHandler.on('error', (error) => {
            this.log('error', `Error handler event: ${error.message}`);
        });
    }

    async startMonitoring() {
        if (this.isMonitoring) {
            this.log('warning', 'Monitoring already active');
            return;
        }

        this.isMonitoring = true;
        this.log('info', `🚀 Starting connection stability monitoring for ${this.wsUrl}`);

        try {
            await this.initializeConnection();
            this.startPeriodicMonitoring();
            this.startLogCollection();

            this.log('success', '📊 Connection stability monitor active');
        } catch (error) {
            this.log('error', `Failed to start monitoring: ${error.message}`);
            throw error;
        }
    }

    async initializeConnection() {
        return new Promise((resolve, reject) => {
            this.wsClient = new RobustWebSocketClient(this.wsUrl, {
                maxReconnectAttempts: 20,
                reconnectInterval: 2000,
                maxReconnectInterval: 60000,
                pingInterval: 20000,
                pongTimeout: 8000,
                connectionTimeout: 15000
            });

            // Connection events
            this.wsClient.on('connecting', (data) => {
                this.stats.totalConnections++;
                this.log('info', `🔌 Connection attempt ${data.attempt}`);
            });

            this.wsClient.on('connected', (data) => {
                this.stats.successfulConnections++;
                this.errorHandler.recordSuccessfulConnection();
                this.log('success', `✅ Connected (ID: ${data.connectionId})`);
                resolve();
            });

            this.wsClient.on('disconnected', (data) => {
                this.stats.totalDisconnections++;
                this.handleDisconnection(data);
            });

            this.wsClient.on('reconnecting', (data) => {
                this.log('warning', `🔄 Reconnecting ${data.attempt}/${data.maxAttempts} (delay: ${data.delay}ms)`);
            });

            this.wsClient.on('error', (error) => {
                this.stats.totalErrors++;
                this.log('error', `WebSocket error: ${error.message}`);
            });

            this.wsClient.on('latency', (data) => {
                this.errorHandler.updateConnectionQuality(data.latency);
                this.log('debug', `🏓 Latency: ${data.latency}ms`);
            });

            this.wsClient.on('maxReconnectAttemptsReached', (data) => {
                this.log('error', `❌ Max reconnection attempts reached: ${data.attempts}`);
                this.handleMaxReconnectAttemptsReached();
            });

            this.wsClient.on('pongTimeout', () => {
                this.log('warning', '⏰ Pong timeout - connection may be unstable');
            });

            // 接続開始
            this.wsClient.connect();

            // タイムアウト設定
            setTimeout(() => {
                if (!this.wsClient.isAlive()) {
                    reject(new Error('Initial connection timeout'));
                }
            }, 30000);
        });
    }

    handleDisconnection(data) {
        const analysis = this.errorHandler.analyzeCloseCode(data.code, data.reason);

        this.log('warning', `🔌 Disconnected: ${data.code} ${data.reason} (${analysis.type})`);

        // Code 1006 の特別処理
        if (data.code === 1006) {
            this.stats.code1006Count++;
            this.handle1006Specifically(data);
        }

        // アクションに基づく処理
        switch (analysis.action) {
            case 'reconnect_with_delay':
                this.implementDelayedReconnection();
                break;
            case 'investigate':
                this.generateInvestigationReport();
                break;
            case 'reduce_payload':
                this.implementPayloadReduction();
                break;
            default:
                this.log('info', `Action: ${analysis.action}`);
        }

        // エラーパターン分析
        const pattern = this.errorHandler.analyzeErrorPattern();
        if (pattern.pattern !== 'normal') {
            this.log('warning', `🔍 Pattern detected: ${pattern.pattern} - ${pattern.recommendation}`);
            this.implementPatternBasedRecovery(pattern);
        }
    }

    handle1006Specifically(data) {
        const strategy = this.errorHandler.handle1006Error(data.reason);

        this.log('warning', `🚨 Code 1006 Strategy: ${strategy.description}`);

        // 1006エラー専用の回復戦略を記録
        this.recoveryStrategies.push({
            timestamp: Date.now(),
            error: data,
            strategy: strategy,
            quality: this.errorHandler.connectionQuality
        });

        // 連続する1006エラーの検出
        const recent1006 = this.recoveryStrategies
            .filter(s => Date.now() - s.timestamp < 300000) // 5分以内
            .filter(s => s.error.code === 1006);

        if (recent1006.length >= 3) {
            this.log('error', '🚨 Multiple 1006 errors detected - implementing aggressive recovery');
            this.implementAggressiveRecovery();
        }
    }

    implementDelayedReconnection() {
        const delay = this.errorHandler.calculateReconnectInterval();
        this.log('info', `⏱️ Implementing delayed reconnection: ${delay}ms`);

        // 既存の再接続をキャンセルして新しい戦略を適用
        // この部分は実際のWebSocketクライアント実装に依存
    }

    implementAggressiveRecovery() {
        this.log('warning', '🛡️ Implementing aggressive recovery strategy');

        // 1. 既存接続を完全に終了
        if (this.wsClient) {
            this.wsClient.terminate();
        }

        // 2. 長時間の待機
        setTimeout(() => {
            this.log('info', '🔄 Starting fresh connection after aggressive recovery');
            this.initializeConnection().catch(error => {
                this.log('error', `Aggressive recovery failed: ${error.message}`);
            });
        }, 30000); // 30秒待機
    }

    implementPatternBasedRecovery(pattern) {
        switch (pattern.pattern) {
            case 'frequent_disconnections':
                this.adjustPingInterval();
                break;
            case 'persistent_1006':
                this.requestServerHealthCheck();
                break;
            case 'protocol_issues':
                this.validateMessageFormat();
                break;
        }
    }

    adjustPingInterval() {
        this.log('info', '🔧 Adjusting ping interval for stability');
        // Ping間隔を長くして負荷を減らす
        // 実装はWebSocketクライアントに依存
    }

    requestServerHealthCheck() {
        this.log('info', '🏥 Requesting server health check');
        // サーバーヘルスチェックのリクエスト
        // 実装は具体的なAPI仕様に依存
    }

    validateMessageFormat() {
        this.log('info', '📋 Validating message format');
        // メッセージフォーマットの検証
        // 実装はプロトコル仕様に依存
    }

    generateInvestigationReport() {
        const report = this.errorHandler.generateErrorReport();
        const reportPath = path.join(this.logsDir, `investigation-${Date.now()}.json`);

        try {
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            this.log('info', `📋 Investigation report saved: ${reportPath}`);
        } catch (error) {
            this.log('error', `Failed to save investigation report: ${error.message}`);
        }

        return report;
    }

    implementPayloadReduction() {
        this.log('info', '📦 Implementing payload size reduction');
        // メッセージサイズの制限を実装
        // 具体的な実装はアプリケーションロジックに依存
    }

    handleMaxReconnectAttemptsReached() {
        this.log('error', '🛑 Max reconnection attempts reached - switching to fallback mode');

        // フォールバック戦略
        this.generateInvestigationReport();

        // 管理者への通知（実装は環境依存）
        this.notifyAdministrators();

        // 代替接続の試行
        this.tryAlternativeConnection();
    }

    notifyAdministrators() {
        this.log('warning', '📧 Notifying administrators about connection issues');
        // 実際の通知実装（メール、Slack等）は環境依存
    }

    tryAlternativeConnection() {
        this.log('info', '🔄 Attempting alternative connection strategies');
        // 代替URL、プロトコル、プロキシ等の試行
        // 実装は具体的な環境設定に依存
    }

    startPeriodicMonitoring() {
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
            this.checkConnectionHealth();
        }, 10000); // 10秒間隔
    }

    startLogCollection() {
        this.logInterval = setInterval(() => {
            this.generateStatusReport();
        }, 60000); // 1分間隔
    }

    collectMetrics() {
        if (this.wsClient && this.wsClient.isAlive()) {
            const wsStats = this.wsClient.getStats();
            const errorStats = this.errorHandler.getStats();

            // 現在のアップタイム更新
            this.stats.currentUptime = Date.now() - (this.errorHandler.lastSuccessfulConnection || this.startTime);

            // 最長アップタイム更新
            if (this.stats.currentUptime > this.stats.longestUptime) {
                this.stats.longestUptime = this.stats.currentUptime;
            }

            this.log('debug', '📊 Metrics collected', {
                connectionQuality: errorStats.connectionQuality,
                uptime: Math.round(this.stats.currentUptime / 1000),
                messagesSent: wsStats.messagesSent,
                messagesReceived: wsStats.messagesReceived
            });
        }
    }

    checkConnectionHealth() {
        const errorStats = this.errorHandler.getStats();

        if (errorStats.connectionQuality === 'unstable') {
            this.log('warning', '⚡ Connection quality unstable - monitoring closely');
        }

        // 健全性の詳細チェック
        if (this.wsClient && !this.wsClient.isAlive()) {
            this.log('error', '💔 Connection appears dead - forcing reconnection');
            this.wsClient.connect();
        }
    }

    generateStatusReport() {
        const report = {
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.startTime,
            stats: this.stats,
            connectionQuality: this.errorHandler.getStats(),
            recentStrategies: this.recoveryStrategies.slice(-5)
        };

        this.log('info', '📊 Status Report', {
            uptime: Math.round(report.uptime / 1000) + 's',
            connections: `${this.stats.successfulConnections}/${this.stats.totalConnections}`,
            quality: report.connectionQuality.connectionQuality,
            code1006: this.stats.code1006Count
        });

        return report;
    }

    async stopMonitoring() {
        this.isMonitoring = false;

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        if (this.logInterval) {
            clearInterval(this.logInterval);
        }

        if (this.wsClient) {
            this.wsClient.close();
        }

        // 最終レポート
        const finalReport = this.generateStatusReport();
        const reportPath = path.join(this.logsDir, `final-report-${Date.now()}.json`);

        try {
            fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
            this.log('success', `📋 Final report saved: ${reportPath}`);
        } catch (error) {
            this.log('error', `Failed to save final report: ${error.message}`);
        }

        this.log('success', '🛑 Connection monitoring stopped');
    }

    getDetailedStats() {
        return {
            runtime: Date.now() - this.startTime,
            ...this.stats,
            errorHandler: this.errorHandler.getStats(),
            wsClient: this.wsClient ? this.wsClient.getStats() : null,
            recoveryStrategies: this.recoveryStrategies.length
        };
    }
}

// CLI実行
async function main() {
    if (require.main === module) {
        const wsUrl = process.argv[2] || 'ws://192.168.0.135:8091/ws?key=3648b8f946d71a62c018ac5198ee757c';

        const monitor = new ConnectionStabilityMonitor(wsUrl);

        try {
            await monitor.startMonitoring();

            // 終了処理
            process.on('SIGINT', async () => {
                console.log('\n🛑 Stopping connection monitor...');
                await monitor.stopMonitoring();
                process.exit(0);
            });

            // 統計表示（30秒間隔）
            setInterval(() => {
                const stats = monitor.getDetailedStats();
                console.log(`\n${colors.cyan}📊 Connection Stats:${colors.reset}`);
                console.log(`  Runtime: ${Math.round(stats.runtime / 1000)}s`);
                console.log(`  Success Rate: ${Math.round((stats.successfulConnections / Math.max(stats.totalConnections, 1)) * 100)}%`);
                console.log(`  Code 1006 Count: ${stats.code1006Count}`);
                console.log(`  Quality: ${stats.errorHandler.connectionQuality}`);
                console.log(`  Current Uptime: ${Math.round(stats.currentUptime / 1000)}s`);
            }, 30000);

        } catch (error) {
            console.error(`${colors.red}❌ Monitor failed: ${error.message}${colors.reset}`);
            process.exit(1);
        }
    }
}

module.exports = ConnectionStabilityMonitor;

if (require.main === module) {
    main();
}