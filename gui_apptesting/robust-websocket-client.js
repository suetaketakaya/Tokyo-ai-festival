#!/usr/bin/env node

/**
 * RemoteClaude v3.7.1 - Robust WebSocket Client
 * 🔗 Enhanced Connection Management with Auto-Recovery
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class RobustWebSocketClient extends EventEmitter {
    constructor(url, options = {}) {
        super();

        this.url = url;
        this.ws = null;
        this.isConnected = false;
        this.shouldReconnect = true;
        this.reconnectAttempts = 0;

        // 設定
        this.options = {
            maxReconnectAttempts: options.maxReconnectAttempts || 10,
            reconnectInterval: options.reconnectInterval || 2000,
            maxReconnectInterval: options.maxReconnectInterval || 30000,
            reconnectDecay: options.reconnectDecay || 1.5,
            connectionTimeout: options.connectionTimeout || 10000,
            pingInterval: options.pingInterval || 30000,
            pongTimeout: options.pongTimeout || 5000,
            maxRetries: options.maxRetries || 3,
            retryInterval: options.retryInterval || 1000,
            ...options
        };

        // 状態管理
        this.connectionId = null;
        this.lastPing = null;
        this.lastPong = null;
        this.pingTimer = null;
        this.pongTimer = null;
        this.reconnectTimer = null;
        this.messageQueue = [];
        this.pendingMessages = new Map();
        this.heartbeatEnabled = true;

        // 統計
        this.stats = {
            connectionsAttempted: 0,
            connectionsSucceeded: 0,
            messagesSent: 0,
            messagesReceived: 0,
            reconnections: 0,
            errors: 0
        };

        // イベントハンドラのバインド
        this.handleOpen = this.handleOpen.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handlePong = this.handlePong.bind(this);
    }

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
            this.emit('debug', 'Connection already in progress or established');
            return;
        }

        this.stats.connectionsAttempted++;
        this.emit('connecting', { attempt: this.reconnectAttempts + 1, url: this.url });

        try {
            this.ws = new WebSocket(this.url);
            this.connectionId = Date.now().toString();

            // イベントリスナー設定
            this.ws.on('open', this.handleOpen);
            this.ws.on('message', this.handleMessage);
            this.ws.on('close', this.handleClose);
            this.ws.on('error', this.handleError);
            this.ws.on('pong', this.handlePong);

            // 接続タイムアウト
            this.connectionTimer = setTimeout(() => {
                if (this.ws.readyState !== WebSocket.OPEN) {
                    this.emit('error', new Error('Connection timeout'));
                    this.ws.terminate();
                }
            }, this.options.connectionTimeout);

        } catch (error) {
            this.emit('error', error);
            this.scheduleReconnect();
        }
    }

    handleOpen() {
        clearTimeout(this.connectionTimer);

        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.stats.connectionsSucceeded++;

        this.emit('connected', { connectionId: this.connectionId });

        // キューされたメッセージを送信
        this.processMessageQueue();

        // ハートビート開始
        if (this.heartbeatEnabled) {
            this.startHeartbeat();
        }
    }

    handleMessage(data) {
        this.stats.messagesReceived++;
        this.lastActivity = Date.now();

        try {
            const message = JSON.parse(data);
            this.emit('message', message);

            // 特定のメッセージタイプの処理
            if (message.type === 'pong') {
                this.handlePongMessage(message);
            }

        } catch (error) {
            this.emit('parseError', { error, data: data.toString() });
        }
    }

    handleClose(code, reason) {
        clearTimeout(this.connectionTimer);
        this.stopHeartbeat();

        this.isConnected = false;
        const wasConnected = this.stats.connectionsSucceeded > 0;

        this.emit('disconnected', {
            code,
            reason: reason.toString(),
            wasConnected,
            connectionId: this.connectionId
        });

        // 予期しない切断の場合は再接続
        if (this.shouldReconnect && code !== 1000) {
            this.scheduleReconnect();
        }
    }

    handleError(error) {
        this.stats.errors++;
        this.emit('error', error);

        // 接続エラーの場合は再接続をスケジュール
        if (!this.isConnected && this.shouldReconnect) {
            this.scheduleReconnect();
        }
    }

    handlePong(data) {
        this.lastPong = Date.now();
        clearTimeout(this.pongTimer);
        this.emit('debug', 'Pong received');
    }

    handlePongMessage(message) {
        if (message.data && message.data.timestamp) {
            const latency = Date.now() - message.data.timestamp;
            this.emit('latency', { latency, timestamp: message.data.timestamp });
        }
    }

    scheduleReconnect() {
        if (!this.shouldReconnect || this.reconnectAttempts >= this.options.maxReconnectAttempts) {
            this.emit('maxReconnectAttemptsReached', { attempts: this.reconnectAttempts });
            return;
        }

        const delay = Math.min(
            this.options.reconnectInterval * Math.pow(this.options.reconnectDecay, this.reconnectAttempts),
            this.options.maxReconnectInterval
        );

        this.reconnectAttempts++;
        this.stats.reconnections++;

        this.emit('reconnecting', {
            attempt: this.reconnectAttempts,
            delay,
            maxAttempts: this.options.maxReconnectAttempts
        });

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);
    }

    startHeartbeat() {
        this.stopHeartbeat();

        this.pingTimer = setInterval(() => {
            if (this.isConnected) {
                this.sendPing();
            }
        }, this.options.pingInterval);
    }

    stopHeartbeat() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }

        if (this.pongTimer) {
            clearTimeout(this.pongTimer);
            this.pongTimer = null;
        }
    }

    sendPing() {
        if (!this.isConnected) return;

        this.lastPing = Date.now();

        try {
            // WebSocket ping frame
            this.ws.ping();

            // JSON ping message
            this.send({
                type: 'ping',
                data: { timestamp: this.lastPing }
            });

            // Pong タイムアウト設定
            this.pongTimer = setTimeout(() => {
                this.emit('pongTimeout');
                this.close(4000, 'Pong timeout');
            }, this.options.pongTimeout);

        } catch (error) {
            this.emit('error', error);
        }
    }

    send(message, options = {}) {
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        const messageId = options.id || Date.now().toString();

        if (!this.isConnected) {
            if (options.queue !== false) {
                this.messageQueue.push({ message: messageStr, options, messageId });
                this.emit('messageQueued', { messageId, queueLength: this.messageQueue.length });
                return messageId;
            } else {
                throw new Error('WebSocket not connected');
            }
        }

        try {
            this.ws.send(messageStr);
            this.stats.messagesSent++;
            this.emit('messageSent', { messageId, message: typeof message === 'object' ? message : messageStr });

            // リトライが有効な場合、保留メッセージとして追加
            if (options.retry !== false) {
                this.pendingMessages.set(messageId, {
                    message: messageStr,
                    options,
                    attempts: 0,
                    timestamp: Date.now()
                });

                // タイムアウト設定
                if (options.timeout) {
                    setTimeout(() => {
                        if (this.pendingMessages.has(messageId)) {
                            this.pendingMessages.delete(messageId);
                            this.emit('messageTimeout', { messageId });
                        }
                    }, options.timeout);
                }
            }

            return messageId;

        } catch (error) {
            this.emit('sendError', { error, messageId });
            throw error;
        }
    }

    processMessageQueue() {
        while (this.messageQueue.length > 0 && this.isConnected) {
            const { message, options, messageId } = this.messageQueue.shift();

            try {
                this.ws.send(message);
                this.stats.messagesSent++;
                this.emit('queuedMessageSent', { messageId });
            } catch (error) {
                this.emit('queuedMessageError', { error, messageId });
                // メッセージをキューの先頭に戻す
                this.messageQueue.unshift({ message, options, messageId });
                break;
            }
        }
    }

    retryPendingMessages() {
        for (const [messageId, pendingMessage] of this.pendingMessages) {
            if (pendingMessage.attempts < this.options.maxRetries) {
                pendingMessage.attempts++;

                setTimeout(() => {
                    if (this.isConnected && this.pendingMessages.has(messageId)) {
                        try {
                            this.ws.send(pendingMessage.message);
                            this.emit('messageRetried', { messageId, attempt: pendingMessage.attempts });
                        } catch (error) {
                            this.emit('retryError', { error, messageId, attempt: pendingMessage.attempts });
                        }
                    }
                }, this.options.retryInterval * pendingMessage.attempts);
            } else {
                this.pendingMessages.delete(messageId);
                this.emit('messageRetryFailed', { messageId, attempts: pendingMessage.attempts });
            }
        }
    }

    acknowledgeMessage(messageId) {
        if (this.pendingMessages.has(messageId)) {
            this.pendingMessages.delete(messageId);
            this.emit('messageAcknowledged', { messageId });
        }
    }

    close(code = 1000, reason = 'Normal closure') {
        this.shouldReconnect = false;

        clearTimeout(this.reconnectTimer);
        this.stopHeartbeat();

        if (this.ws) {
            this.ws.close(code, reason);
        }

        this.emit('closing', { code, reason });
    }

    terminate() {
        this.shouldReconnect = false;

        clearTimeout(this.reconnectTimer);
        this.stopHeartbeat();

        if (this.ws) {
            this.ws.terminate();
        }

        this.emit('terminated');
    }

    getState() {
        return {
            url: this.url,
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            shouldReconnect: this.shouldReconnect,
            connectionId: this.connectionId,
            queueLength: this.messageQueue.length,
            pendingMessages: this.pendingMessages.size,
            stats: { ...this.stats },
            lastPing: this.lastPing,
            lastPong: this.lastPong,
            readyState: this.ws ? this.ws.readyState : null
        };
    }

    getStats() {
        return {
            ...this.stats,
            queueLength: this.messageQueue.length,
            pendingMessages: this.pendingMessages.size,
            uptime: this.isConnected ? Date.now() - (this.lastPong || this.lastPing || 0) : 0,
            latency: this.lastPong && this.lastPing ? this.lastPong - this.lastPing : null
        };
    }

    // ユーティリティメソッド
    isAlive() {
        return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    resetStats() {
        this.stats = {
            connectionsAttempted: 0,
            connectionsSucceeded: 0,
            messagesSent: 0,
            messagesReceived: 0,
            reconnections: 0,
            errors: 0
        };
    }

    setHeartbeat(enabled) {
        this.heartbeatEnabled = enabled;
        if (enabled && this.isConnected) {
            this.startHeartbeat();
        } else {
            this.stopHeartbeat();
        }
    }

    clearQueue() {
        const cleared = this.messageQueue.length;
        this.messageQueue = [];
        this.emit('queueCleared', { clearedMessages: cleared });
        return cleared;
    }

    clearPendingMessages() {
        const cleared = this.pendingMessages.size;
        this.pendingMessages.clear();
        this.emit('pendingMessagesCleared', { clearedMessages: cleared });
        return cleared;
    }
}

// WebSocket 状態定数
RobustWebSocketClient.CONNECTING = WebSocket.CONNECTING;
RobustWebSocketClient.OPEN = WebSocket.OPEN;
RobustWebSocketClient.CLOSING = WebSocket.CLOSING;
RobustWebSocketClient.CLOSED = WebSocket.CLOSED;

module.exports = RobustWebSocketClient;