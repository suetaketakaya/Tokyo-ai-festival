#!/usr/bin/env node

/**
 * RemoteClaude v3.7.1 - WebSocket Error Handler
 * 🔧 Advanced Error Recovery for Code 1006 and Connection Issues
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class WebSocketErrorHandler extends EventEmitter {
    constructor(options = {}) {
        super();

        this.options = {
            maxReconnectAttempts: options.maxReconnectAttempts || 10,
            baseReconnectInterval: options.baseReconnectInterval || 1000,
            maxReconnectInterval: options.maxReconnectInterval || 30000,
            healthCheckInterval: options.healthCheckInterval || 20000,
            connectionTimeout: options.connectionTimeout || 15000,
            pingInterval: options.pingInterval || 25000,
            pongTimeout: options.pongTimeout || 10000,
            qualityThreshold: options.qualityThreshold || 5000, // 5秒以上は品質不良
            ...options
        };

        this.reconnectAttempts = 0;
        this.connectionQuality = 'unknown'; // unknown, excellent, good, poor, unstable
        this.lastLatencies = [];
        this.maxLatencyHistory = 10;
        this.lastSuccessfulConnection = null;
        this.errorHistory = [];
        this.maxErrorHistory = 20;
    }

    /**
     * WebSocketエラーコードの詳細分析
     */
    analyzeCloseCode(code, reason) {
        const codeAnalysis = {
            1000: { type: 'normal', severity: 'info', action: 'none' },
            1001: { type: 'going_away', severity: 'warning', action: 'reconnect' },
            1002: { type: 'protocol_error', severity: 'error', action: 'investigate' },
            1003: { type: 'unsupported_data', severity: 'error', action: 'investigate' },
            1005: { type: 'no_status_received', severity: 'warning', action: 'reconnect' },
            1006: { type: 'abnormal_closure', severity: 'critical', action: 'reconnect_with_delay' },
            1007: { type: 'invalid_frame_payload', severity: 'error', action: 'investigate' },
            1008: { type: 'policy_violation', severity: 'error', action: 'investigate' },
            1009: { type: 'message_too_big', severity: 'error', action: 'reduce_payload' },
            1010: { type: 'mandatory_extension', severity: 'error', action: 'investigate' },
            1011: { type: 'internal_error', severity: 'error', action: 'reconnect' },
            1012: { type: 'service_restart', severity: 'info', action: 'reconnect' },
            1013: { type: 'try_again_later', severity: 'warning', action: 'reconnect_with_delay' },
            1014: { type: 'bad_gateway', severity: 'error', action: 'reconnect' },
            1015: { type: 'tls_handshake', severity: 'error', action: 'investigate' }
        };

        const analysis = codeAnalysis[code] || {
            type: 'unknown',
            severity: 'warning',
            action: 'reconnect'
        };

        // エラー履歴に追加
        this.errorHistory.push({
            timestamp: Date.now(),
            code,
            reason: reason || '',
            type: analysis.type,
            severity: analysis.severity
        });

        // 履歴のクリーンアップ
        if (this.errorHistory.length > this.maxErrorHistory) {
            this.errorHistory = this.errorHistory.slice(-this.maxErrorHistory);
        }

        return analysis;
    }

    /**
     * 接続品質の評価
     */
    updateConnectionQuality(latency) {
        // 無効なレイテンシーをスキップ
        if (latency < 0 || latency > 60000) {
            return this.connectionQuality;
        }

        this.lastLatencies.push(latency);
        if (this.lastLatencies.length > this.maxLatencyHistory) {
            this.lastLatencies = this.lastLatencies.slice(-this.maxLatencyHistory);
        }

        if (this.lastLatencies.length >= 3) {
            const avgLatency = this.lastLatencies.reduce((a, b) => a + b, 0) / this.lastLatencies.length;
            const maxLatency = Math.max(...this.lastLatencies);

            if (avgLatency < 100 && maxLatency < 500) {
                this.connectionQuality = 'excellent';
            } else if (avgLatency < 500 && maxLatency < 2000) {
                this.connectionQuality = 'good';
            } else if (avgLatency < 2000 && maxLatency < 5000) {
                this.connectionQuality = 'poor';
            } else {
                this.connectionQuality = 'unstable';
            }
        }

        return this.connectionQuality;
    }

    /**
     * 接続品質に基づく再接続間隔の計算
     */
    calculateReconnectInterval() {
        const baseInterval = this.options.baseReconnectInterval;
        const attempt = this.reconnectAttempts;

        // 品質に基づく調整
        let qualityMultiplier = 1;
        switch (this.connectionQuality) {
            case 'excellent':
                qualityMultiplier = 1;
                break;
            case 'good':
                qualityMultiplier = 1.5;
                break;
            case 'poor':
                qualityMultiplier = 2;
                break;
            case 'unstable':
                qualityMultiplier = 3;
                break;
            default:
                qualityMultiplier = 2;
        }

        // 指数バックオフ + 品質調整
        const interval = Math.min(
            baseInterval * Math.pow(1.5, attempt) * qualityMultiplier,
            this.options.maxReconnectInterval
        );

        // ジッター追加（±20%）
        const jitter = 0.8 + (Math.random() * 0.4);
        return Math.floor(interval * jitter);
    }

    /**
     * エラーパターンの分析
     */
    analyzeErrorPattern() {
        if (this.errorHistory.length < 3) {
            return { pattern: 'insufficient_data', recommendation: 'continue_monitoring' };
        }

        const recentErrors = this.errorHistory.slice(-5);
        const timeWindow = 60000; // 1分
        const now = Date.now();

        // 短時間での頻繁なエラー
        const recentFrequentErrors = recentErrors.filter(
            error => now - error.timestamp < timeWindow
        );

        if (recentFrequentErrors.length >= 3) {
            return {
                pattern: 'frequent_disconnections',
                recommendation: 'increase_reconnect_delay'
            };
        }

        // 特定エラーコードの連続発生
        const code1006Count = recentErrors.filter(error => error.code === 1006).length;
        if (code1006Count >= 3) {
            return {
                pattern: 'persistent_1006',
                recommendation: 'investigate_network_or_server'
            };
        }

        // プロトコルエラーの連続発生
        const protocolErrors = recentErrors.filter(
            error => [1002, 1007, 1008].includes(error.code)
        ).length;

        if (protocolErrors >= 2) {
            return {
                pattern: 'protocol_issues',
                recommendation: 'check_message_format'
            };
        }

        return { pattern: 'normal', recommendation: 'continue_monitoring' };
    }

    /**
     * 1006エラー専用の回復戦略
     */
    handle1006Error(reason) {
        const strategies = [
            {
                attempt: 1,
                action: 'immediate_reconnect',
                delay: 1000,
                description: 'Immediate reconnection attempt'
            },
            {
                attempt: 2,
                action: 'delayed_reconnect',
                delay: 3000,
                description: 'Short delay reconnection'
            },
            {
                attempt: 3,
                action: 'extended_delay',
                delay: 8000,
                description: 'Extended delay reconnection'
            },
            {
                attempt: 4,
                action: 'protocol_reset',
                delay: 15000,
                description: 'Protocol reset and reconnection'
            },
            {
                attempt: 5,
                action: 'connection_diagnostics',
                delay: 30000,
                description: 'Full connection diagnostics'
            }
        ];

        const strategy = strategies.find(s => s.attempt === this.reconnectAttempts) ||
                        strategies[strategies.length - 1];

        return {
            ...strategy,
            qualityAdjustedDelay: this.calculateReconnectInterval()
        };
    }

    /**
     * 詳細なエラーレポート生成
     */
    generateErrorReport() {
        const now = Date.now();
        const lastHour = now - 3600000; // 1時間前

        const recentErrors = this.errorHistory.filter(
            error => error.timestamp > lastHour
        );

        const errorCounts = {};
        recentErrors.forEach(error => {
            errorCounts[error.code] = (errorCounts[error.code] || 0) + 1;
        });

        const report = {
            timestamp: new Date().toISOString(),
            connectionQuality: this.connectionQuality,
            reconnectAttempts: this.reconnectAttempts,
            lastSuccessfulConnection: this.lastSuccessfulConnection,
            recentErrorCount: recentErrors.length,
            errorBreakdown: errorCounts,
            averageLatency: this.lastLatencies.length > 0 ?
                Math.round(this.lastLatencies.reduce((a, b) => a + b, 0) / this.lastLatencies.length) : null,
            pattern: this.analyzeErrorPattern(),
            recommendations: this.generateRecommendations()
        };

        return report;
    }

    /**
     * 推奨事項の生成
     */
    generateRecommendations() {
        const recommendations = [];
        const pattern = this.analyzeErrorPattern();

        switch (pattern.pattern) {
            case 'frequent_disconnections':
                recommendations.push('Consider increasing ping interval');
                recommendations.push('Check network stability');
                recommendations.push('Implement connection pooling');
                break;

            case 'persistent_1006':
                recommendations.push('Investigate server health');
                recommendations.push('Check firewall/proxy settings');
                recommendations.push('Monitor server logs');
                break;

            case 'protocol_issues':
                recommendations.push('Validate message format');
                recommendations.push('Check protocol version compatibility');
                recommendations.push('Review message size limits');
                break;
        }

        if (this.connectionQuality === 'unstable') {
            recommendations.push('Consider fallback server');
            recommendations.push('Implement progressive backoff');
        }

        if (this.reconnectAttempts > 5) {
            recommendations.push('Implement circuit breaker pattern');
            recommendations.push('Alert system administrators');
        }

        return recommendations;
    }

    /**
     * 接続成功時の記録
     */
    recordSuccessfulConnection() {
        this.lastSuccessfulConnection = Date.now();
        this.reconnectAttempts = 0;

        // 成功時に品質をリセット（徐々に改善）
        if (this.connectionQuality === 'unstable') {
            this.connectionQuality = 'poor';
        } else if (this.connectionQuality === 'poor') {
            this.connectionQuality = 'good';
        }
    }

    /**
     * 統計情報の取得
     */
    getStats() {
        const now = Date.now();
        const uptime = this.lastSuccessfulConnection ? now - this.lastSuccessfulConnection : 0;

        return {
            connectionQuality: this.connectionQuality,
            reconnectAttempts: this.reconnectAttempts,
            uptime: uptime,
            averageLatency: this.lastLatencies.length > 0 ?
                Math.round(this.lastLatencies.reduce((a, b) => a + b, 0) / this.lastLatencies.length) : null,
            errorCount: this.errorHistory.length,
            lastError: this.errorHistory[this.errorHistory.length - 1] || null
        };
    }

    /**
     * エラーハンドラーのリセット
     */
    reset() {
        this.reconnectAttempts = 0;
        this.connectionQuality = 'unknown';
        this.lastLatencies = [];
        this.lastSuccessfulConnection = null;
        this.errorHistory = [];
    }
}

module.exports = WebSocketErrorHandler;