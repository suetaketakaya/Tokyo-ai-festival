#!/usr/bin/env node

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
        const logMessage = `[${timestamp}] ${message}\n`;

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
                this.log(`Tail error: ${data}`);
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

            this.log(`🚨 Code 1006 detected! Count: ${this.errorCount}`);

            // 閾値に達した場合の自動対応
            if (this.errorCount >= this.alertThreshold) {
                this.triggerEmergencyRestart();
            }
        }

        // 接続統計の記録
        if (logLine.includes('Mobile app connected') ||
            logLine.includes('Mobile app disconnected')) {
            this.log(`📱 Connection event: ${logLine.trim()}`);
        }
    }

    async triggerEmergencyRestart() {
        this.log(`🚨 EMERGENCY: ${this.errorCount} Code 1006 errors detected - triggering restart`);

        try {
            // スマートリスタートスクリプトを実行
            const restartScript = path.join(this.serverDir, 'smart-server-manager.sh');
            spawn('bash', [restartScript, 'restart'], { detached: true });

            this.log('🔄 Emergency restart initiated');
            this.errorCount = 0; // カウンターリセット

        } catch (error) {
            this.log(`❌ Emergency restart failed: ${error.message}`);
        }
    }

    performHealthCheck() {
        const now = Date.now();
        const timeSinceLastError = now - this.lastErrorTime;

        // 1時間以上エラーがない場合はカウンターリセット
        if (timeSinceLastError > 3600000) {
            if (this.errorCount > 0) {
                this.log(`✅ No errors for 1 hour - resetting counter (was: ${this.errorCount})`);
                this.errorCount = 0;
            }
        }

        this.log(`💓 Health check: ${this.errorCount} recent errors`);
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
