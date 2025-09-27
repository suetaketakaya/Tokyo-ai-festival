#!/usr/bin/env node

/**
 * RemoteClaude v3.7.1 - Emergency Connection Fixer
 * 🚨 Ultra-Aggressive Connection Stability Solution
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class EmergencyConnectionFixer {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.connections = new Map();
        this.reconnectQueue = [];
        this.failureCount = 0;
        this.lastSuccessfulConnect = Date.now();
        this.isEmergencyMode = false;

        // 超積極的な設定
        this.config = {
            maxConnections: 5,           // 複数接続でリダンダンシー
            heartbeatInterval: 5000,     // 5秒間隔
            reconnectDelay: 500,         // 500ms即座再接続
            emergencyThreshold: 3,       // 3回失敗で緊急モード
            connectionTimeout: 8000,     // 8秒タイムアウト
            maxRetries: 50              // 50回まで試行
        };

        this.setupEmergencyMode();
    }

    log(level, message) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const colors = {
            error: '\x1b[31m❌',
            warning: '\x1b[33m⚠️',
            info: '\x1b[36mℹ️',
            success: '\x1b[32m✅',
            emergency: '\x1b[35m🚨'
        };

        const color = colors[level] || '\x1b[37m';
        console.log(`${color} [${timestamp}] ${message}\x1b[0m`);
    }

    async setupEmergencyMode() {
        this.log('emergency', '🚨 Emergency Connection Fixer activated');

        // 1. 複数接続の開始
        await this.createMultipleConnections();

        // 2. 連続監視の開始
        this.startContinuousMonitoring();

        // 3. プロアクティブ修復の開始
        this.startProactiveRepair();

        // 4. ネットワーク最適化
        this.optimizeNetwork();
    }

    async createMultipleConnections() {
        this.log('info', `🔗 Creating ${this.config.maxConnections} redundant connections`);

        for (let i = 0; i < this.config.maxConnections; i++) {
            setTimeout(() => {
                this.createSingleConnection(i);
            }, i * 1000); // 1秒間隔で接続
        }
    }

    createSingleConnection(id) {
        try {
            const ws = new WebSocket(this.wsUrl);
            const connectionData = {
                id: id,
                ws: ws,
                isAlive: false,
                lastPing: 0,
                failures: 0,
                created: Date.now()
            };

            ws.on('open', () => {
                connectionData.isAlive = true;
                this.connections.set(id, connectionData);
                this.log('success', `✅ Connection ${id} established`);
                this.failureCount = Math.max(0, this.failureCount - 1);
                this.lastSuccessfulConnect = Date.now();

                // プロジェクトリストを即座に要求
                this.requestProjectList(ws);
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(id, message);
                } catch (error) {
                    this.log('warning', `Connection ${id} received invalid JSON`);
                }
            });

            ws.on('close', (code, reason) => {
                this.handleConnectionClose(id, code, reason);
            });

            ws.on('error', (error) => {
                this.log('error', `Connection ${id} error: ${error.message}`);
                this.handleConnectionError(id, error);
            });

            ws.on('pong', () => {
                if (connectionData) {
                    connectionData.lastPing = Date.now();
                }
            });

            // タイムアウト処理
            setTimeout(() => {
                if (!connectionData.isAlive) {
                    this.log('warning', `Connection ${id} timeout - forcing close`);
                    ws.terminate();
                }
            }, this.config.connectionTimeout);

        } catch (error) {
            this.log('error', `Failed to create connection ${id}: ${error.message}`);
            this.scheduleReconnect(id);
        }
    }

    handleConnectionClose(id, code, reason) {
        this.log('warning', `🔌 Connection ${id} closed: ${code} ${reason}`);

        const connection = this.connections.get(id);
        if (connection) {
            connection.isAlive = false;
            connection.failures++;
        }

        // Code 1006 の積極的処理
        if (code === 1006) {
            this.handleCode1006Emergency(id, reason);
        }

        // 即座に再接続をスケジュール
        this.scheduleReconnect(id);

        // 全接続が失われた場合の緊急処理
        if (this.getActiveConnections().length === 0) {
            this.triggerEmergencyRecovery();
        }
    }

    handleCode1006Emergency(id, reason) {
        this.failureCount++;
        this.log('emergency', `🚨 Code 1006 on connection ${id}: ${reason} (failures: ${this.failureCount})`);

        if (this.failureCount >= this.config.emergencyThreshold) {
            this.activateEmergencyMode();
        }

        // 即座に複数接続を作成
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const newId = Date.now() + i;
                this.createSingleConnection(newId);
            }, i * 200);
        }
    }

    activateEmergencyMode() {
        if (this.isEmergencyMode) return;

        this.isEmergencyMode = true;
        this.log('emergency', '🚨 EMERGENCY MODE ACTIVATED');

        // 1. 全接続を終了
        this.terminateAllConnections();

        // 2. ネットワークリセット
        this.resetNetwork();

        // 3. アグレッシブ再接続
        setTimeout(() => {
            this.log('emergency', '🔄 Starting aggressive reconnection');
            this.startAggressiveReconnection();
        }, 2000);
    }

    terminateAllConnections() {
        this.log('warning', '🔄 Terminating all connections');

        for (const [id, connection] of this.connections) {
            if (connection.ws) {
                connection.ws.terminate();
            }
        }

        this.connections.clear();
    }

    resetNetwork() {
        this.log('info', '🔧 Resetting network stack');

        // DNS フラッシュ (macOS)
        try {
            spawn('sudo', ['dscacheutil', '-flushcache'], { detached: true });
            spawn('sudo', ['killall', '-HUP', 'mDNSResponder'], { detached: true });
        } catch (error) {
            this.log('warning', 'Network reset failed (permissions?)');
        }
    }

    startAggressiveReconnection() {
        this.log('emergency', '⚡ Starting ultra-aggressive reconnection');

        let attemptCount = 0;
        const attemptInterval = setInterval(() => {
            attemptCount++;

            if (this.getActiveConnections().length > 0) {
                this.log('success', '✅ Emergency recovery successful');
                clearInterval(attemptInterval);
                this.isEmergencyMode = false;
                return;
            }

            if (attemptCount > this.config.maxRetries) {
                this.log('error', '❌ Emergency recovery failed - trying fallback');
                clearInterval(attemptInterval);
                this.tryFallbackServers();
                return;
            }

            // 複数の並列接続試行
            for (let i = 0; i < 3; i++) {
                const id = Date.now() + i;
                this.createSingleConnection(id);
            }

            this.log('info', `🔄 Emergency attempt ${attemptCount}/${this.config.maxRetries}`);

        }, this.config.reconnectDelay);
    }

    tryFallbackServers() {
        const fallbackUrls = [
            'ws://localhost:8091/ws?key=3648b8f946d71a62c018ac5198ee757c',
            'ws://127.0.0.1:8091/ws?key=3648b8f946d71a62c018ac5198ee757c',
            'ws://192.168.0.135:8090/ws?key=3648b8f946d71a62c018ac5198ee757c',
            'ws://localhost:8090/ws?key=3648b8f946d71a62c018ac5198ee757c'
        ];

        this.log('warning', '🔄 Trying fallback servers');

        for (let i = 0; i < fallbackUrls.length; i++) {
            const url = fallbackUrls[i];
            if (url !== this.wsUrl) {
                setTimeout(() => {
                    this.log('info', `🔄 Trying fallback: ${url}`);
                    this.wsUrl = url;
                    this.createSingleConnection(Date.now() + i);
                }, i * 2000);
            }
        }
    }

    scheduleReconnect(id) {
        setTimeout(() => {
            if (!this.connections.has(id) || !this.connections.get(id).isAlive) {
                this.createSingleConnection(id);
            }
        }, this.config.reconnectDelay);
    }

    handleConnectionError(id, error) {
        const connection = this.connections.get(id);
        if (connection) {
            connection.failures++;

            if (connection.failures > 5) {
                this.log('warning', `Connection ${id} has too many failures - recreating`);
                this.connections.delete(id);
                setTimeout(() => {
                    this.createSingleConnection(Date.now());
                }, 1000);
            }
        }
    }

    requestProjectList(ws) {
        try {
            const message = {
                type: 'project_list_request',
                data: {}
            };
            ws.send(JSON.stringify(message));
        } catch (error) {
            this.log('warning', 'Failed to request project list');
        }
    }

    handleMessage(connectionId, message) {
        switch (message.type) {
            case 'connection_established':
                this.log('success', `Connection ${connectionId} established with server`);
                break;
            case 'project_list_response':
                this.log('info', `Connection ${connectionId} received project list`);
                break;
            case 'pong':
                // レイテンシー処理
                if (message.data && message.data.timestamp) {
                    const latency = Date.now() - message.data.timestamp.timestamp;
                    this.log('info', `Connection ${connectionId} latency: ${latency}ms`);
                }
                break;
        }
    }

    startContinuousMonitoring() {
        setInterval(() => {
            this.performHealthCheck();
        }, this.config.heartbeatInterval);
    }

    performHealthCheck() {
        const activeConnections = this.getActiveConnections();

        if (activeConnections.length === 0) {
            this.log('warning', '⚠️ No active connections - creating emergency connections');
            this.createMultipleConnections();
            return;
        }

        // 各接続のpingテスト
        activeConnections.forEach(([id, connection]) => {
            if (connection.ws && connection.ws.readyState === WebSocket.OPEN) {
                try {
                    connection.ws.ping();
                    const pingMessage = {
                        type: 'ping',
                        data: { timestamp: Date.now() }
                    };
                    connection.ws.send(JSON.stringify(pingMessage));
                } catch (error) {
                    this.log('warning', `Ping failed for connection ${id}`);
                    this.handleConnectionError(id, error);
                }
            }
        });

        // 統計出力
        this.log('info', `📊 Active connections: ${activeConnections.length}/${this.config.maxConnections}, Failures: ${this.failureCount}`);
    }

    startProactiveRepair() {
        setInterval(() => {
            this.proactiveRepair();
        }, 10000); // 10秒間隔
    }

    proactiveRepair() {
        const activeConnections = this.getActiveConnections();
        const targetConnections = this.config.maxConnections;

        // 接続数が不足している場合
        if (activeConnections.length < targetConnections) {
            const needed = targetConnections - activeConnections.length;
            this.log('info', `🔧 Proactive repair: creating ${needed} connections`);

            for (let i = 0; i < needed; i++) {
                setTimeout(() => {
                    this.createSingleConnection(Date.now() + i);
                }, i * 500);
            }
        }

        // 古い接続の更新
        const now = Date.now();
        activeConnections.forEach(([id, connection]) => {
            const age = now - connection.created;
            if (age > 300000) { // 5分以上古い接続
                this.log('info', `🔄 Refreshing old connection ${id}`);
                connection.ws.close(1000, 'Proactive refresh');
            }
        });
    }

    optimizeNetwork() {
        // TCP設定の最適化 (macOS)
        try {
            const commands = [
                ['sysctl', 'net.inet.tcp.keepintvl=1000'],
                ['sysctl', 'net.inet.tcp.keepidle=2000'],
                ['sysctl', 'net.inet.tcp.always_keepalive=1']
            ];

            commands.forEach(cmd => {
                spawn('sudo', cmd, { detached: true });
            });

            this.log('info', '🔧 Network optimizations applied');
        } catch (error) {
            this.log('warning', 'Network optimization failed (permissions?)');
        }
    }

    getActiveConnections() {
        return Array.from(this.connections.entries()).filter(([id, connection]) =>
            connection.isAlive &&
            connection.ws &&
            connection.ws.readyState === WebSocket.OPEN
        );
    }

    getBestConnection() {
        const activeConnections = this.getActiveConnections();
        if (activeConnections.length === 0) return null;

        // 最も安定している接続を選択
        return activeConnections.reduce((best, current) => {
            const [currentId, currentConn] = current;
            const [bestId, bestConn] = best;

            if (currentConn.failures < bestConn.failures) {
                return current;
            }

            if (currentConn.failures === bestConn.failures &&
                currentConn.lastPing > bestConn.lastPing) {
                return current;
            }

            return best;
        });
    }

    async executeCommand(command, projectId) {
        const bestConnection = this.getBestConnection();
        if (!bestConnection) {
            this.log('error', 'No active connections for command execution');
            return null;
        }

        const [connectionId, connection] = bestConnection;
        const message = {
            type: 'claude_execute',
            data: {
                command: command,
                project_id: projectId,
                context: {
                    current_dir: '/workspace',
                    git_branch: 'main'
                }
            }
        };

        try {
            connection.ws.send(JSON.stringify(message));
            this.log('success', `📤 Command sent via connection ${connectionId}: ${command}`);
            return connectionId;
        } catch (error) {
            this.log('error', `Failed to send command: ${error.message}`);
            return null;
        }
    }

    getStats() {
        const activeConnections = this.getActiveConnections();
        const totalFailures = Array.from(this.connections.values())
            .reduce((sum, conn) => sum + conn.failures, 0);

        return {
            activeConnections: activeConnections.length,
            totalConnections: this.connections.size,
            totalFailures: totalFailures,
            failureCount: this.failureCount,
            isEmergencyMode: this.isEmergencyMode,
            lastSuccessfulConnect: this.lastSuccessfulConnect,
            uptime: Date.now() - this.lastSuccessfulConnect
        };
    }

    async startEmergencyFixer() {
        this.log('emergency', '🚨 Emergency Connection Fixer started');

        // 終了処理
        process.on('SIGINT', () => {
            this.log('info', '🛑 Shutting down Emergency Connection Fixer');
            this.terminateAllConnections();
            process.exit(0);
        });

        // 統計出力
        setInterval(() => {
            const stats = this.getStats();
            this.log('info', `📊 Emergency Fixer Stats: ${stats.activeConnections}/${stats.totalConnections} active, ${stats.totalFailures} failures, Emergency: ${stats.isEmergencyMode}`);
        }, 15000);

        this.log('success', '✅ Emergency Connection Fixer operational');
    }
}

// CLI実行
async function main() {
    if (require.main === module) {
        const wsUrl = process.argv[2] || 'ws://192.168.0.135:8091/ws?key=3648b8f946d71a62c018ac5198ee757c';

        const fixer = new EmergencyConnectionFixer(wsUrl);
        await fixer.startEmergencyFixer();

        // テストコマンドの実行
        setTimeout(async () => {
            console.log('\n🧪 Testing emergency command execution...');
            await fixer.executeCommand('echo "Emergency test successful"', 'test2-1758332419');
        }, 10000);
    }
}

module.exports = EmergencyConnectionFixer;

if (require.main === module) {
    main();
}