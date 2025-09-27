#!/usr/bin/env node

/**
 * RemoteClaude v3.7.1 - Stable Claude Code CLI Bridge
 * 🔗 Enhanced Bridge with Connection Stability and Preview Generation
 */

const WebSocketErrorHandler = require('./websocket-error-handler');
const RobustWebSocketClient = require('./robust-websocket-client');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

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

class StableClaudeCliBridge {
    constructor(wsUrl, options = {}) {
        this.wsUrl = wsUrl;
        this.scriptDir = __dirname;
        this.logsDir = path.join(this.scriptDir, 'logs');
        this.previewDir = path.join(this.scriptDir, 'previews');

        // ディレクトリ作成
        [this.logsDir, this.previewDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        this.errorHandler = new WebSocketErrorHandler({
            maxReconnectAttempts: 20,
            baseReconnectInterval: 2000,
            maxReconnectInterval: 60000,
            qualityThreshold: 3000
        });

        this.wsClient = null;
        this.isConnected = false;
        this.commandQueue = [];
        this.executionHistory = [];
        this.previewCache = new Map();

        // プレビュー設定
        this.previewOptions = {
            generateHtml: true,
            generateMarkdown: true,
            includeFileOperations: true,
            includeDiagnostics: true,
            maxPreviewSize: 1024 * 1024, // 1MB
            supportedExtensions: ['.js', '.ts', '.json', '.md', '.txt', '.css', '.html', '.py', '.go', '.sh']
        };

        // 統計情報
        this.stats = {
            commandsExecuted: 0,
            previewsGenerated: 0,
            connectionDrops: 0,
            recoveryAttempts: 0,
            averageExecutionTime: 0,
            successRate: 0
        };

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
        const logFile = path.join(this.logsDir, `stable-cli-bridge-${new Date().toISOString().split('T')[0]}.log`);
        const fileMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}${data ? ' | Data: ' + JSON.stringify(data, null, 2) : ''}\n`;

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

    async initializeConnection() {
        return new Promise((resolve, reject) => {
            this.wsClient = new RobustWebSocketClient(this.wsUrl, {
                maxReconnectAttempts: 30,
                reconnectInterval: 1000,
                maxReconnectInterval: 30000,
                pingInterval: 15000,
                pongTimeout: 5000,
                connectionTimeout: 10000
            });

            // Connection events with enhanced stability
            this.wsClient.on('connecting', (data) => {
                this.log('info', `🔌 Connection attempt ${data.attempt}`);
            });

            this.wsClient.on('connected', (data) => {
                this.isConnected = true;
                this.errorHandler.recordSuccessfulConnection();
                this.log('success', `✅ CLI Bridge connected (ID: ${data.connectionId})`);

                // プロジェクト情報を取得
                this.requestProjectList();
                resolve();
            });

            this.wsClient.on('disconnected', (data) => {
                this.isConnected = false;
                this.stats.connectionDrops++;
                this.handleConnectionDrop(data);
            });

            this.wsClient.on('message', (message) => {
                this.handleServerMessage(message);
            });

            this.wsClient.on('error', (error) => {
                this.log('error', `WebSocket error: ${error.message}`);
            });

            this.wsClient.on('maxReconnectAttemptsReached', () => {
                this.log('error', '❌ Max reconnection attempts reached - implementing failover');
                this.implementFailoverStrategy();
            });

            // 接続開始
            this.wsClient.connect();

            // タイムアウト設定
            setTimeout(() => {
                if (!this.isConnected) {
                    reject(new Error('Initial connection timeout'));
                }
            }, 30000);
        });
    }

    handleConnectionDrop(data) {
        const analysis = this.errorHandler.analyzeCloseCode(data.code, data.reason);
        this.log('warning', `🔌 Connection dropped: ${data.code} ${data.reason} (${analysis.type})`);

        // コマンドキューの保護
        this.protectCommandQueue();

        // 1006エラーの特別処理
        if (data.code === 1006) {
            this.handle1006Specifically(data);
        }

        // 回復戦略の実装
        this.implementRecoveryStrategy(analysis);
    }

    protectCommandQueue() {
        if (this.commandQueue.length > 0) {
            this.log('info', `📦 Protecting ${this.commandQueue.length} queued commands`);

            // キューをファイルに保存
            const queueBackup = {
                timestamp: Date.now(),
                commands: this.commandQueue,
                connectionDropCount: this.stats.connectionDrops
            };

            const backupFile = path.join(this.logsDir, `command-queue-backup-${Date.now()}.json`);
            try {
                fs.writeFileSync(backupFile, JSON.stringify(queueBackup, null, 2));
                this.log('success', `📦 Command queue backed up to ${backupFile}`);
            } catch (error) {
                this.log('error', `Failed to backup command queue: ${error.message}`);
            }
        }
    }

    handle1006Specifically(data) {
        const strategy = this.errorHandler.handle1006Error(data.reason);
        this.log('warning', `🚨 1006 Error Strategy: ${strategy.description}`);

        // アグレッシブ回復戦略
        if (this.stats.connectionDrops >= 3) {
            this.log('warning', '🛡️ Implementing aggressive recovery for repeated 1006 errors');
            this.implementAggressiveRecovery();
        }
    }

    implementRecoveryStrategy(analysis) {
        this.stats.recoveryAttempts++;

        switch (analysis.action) {
            case 'reconnect_with_delay':
                this.scheduleDelayedReconnection();
                break;
            case 'investigate':
                this.generateConnectionReport();
                break;
            case 'reduce_payload':
                this.enablePayloadReduction();
                break;
            default:
                this.log('info', `🔧 Implementing default recovery: ${analysis.action}`);
        }
    }

    scheduleDelayedReconnection() {
        const delay = this.errorHandler.calculateReconnectInterval();
        this.log('info', `⏱️ Scheduling reconnection in ${delay}ms`);

        setTimeout(() => {
            if (!this.isConnected) {
                this.log('info', '🔄 Attempting delayed reconnection');
                this.wsClient.connect();
            }
        }, delay);
    }

    implementAggressiveRecovery() {
        this.log('warning', '🛡️ Implementing aggressive recovery strategy');

        // 既存接続を完全に終了
        if (this.wsClient) {
            this.wsClient.terminate();
        }

        // 長時間の待機後に再接続
        setTimeout(() => {
            this.log('info', '🔄 Starting fresh connection after aggressive recovery');
            this.initializeConnection().catch(error => {
                this.log('error', `Aggressive recovery failed: ${error.message}`);
                this.implementFailoverStrategy();
            });
        }, 30000);
    }

    implementFailoverStrategy() {
        this.log('warning', '🔄 Implementing failover strategy');

        // フォールバック URL の試行
        const fallbackUrls = [
            'ws://localhost:8091/ws?key=3648b8f946d71a62c018ac5198ee757c',
            'ws://127.0.0.1:8091/ws?key=3648b8f946d71a62c018ac5198ee757c',
            'ws://192.168.0.135:8090/ws?key=3648b8f946d71a62c018ac5198ee757c'
        ];

        for (const url of fallbackUrls) {
            if (url !== this.wsUrl) {
                this.log('info', `🔄 Trying fallback URL: ${url}`);
                this.wsUrl = url;
                setTimeout(() => {
                    this.initializeConnection().catch(() => {
                        this.log('error', `Fallback ${url} failed`);
                    });
                }, 5000);
                break;
            }
        }
    }

    async requestProjectList() {
        if (!this.isConnected) {
            this.log('warning', 'Cannot request project list - not connected');
            return;
        }

        const message = {
            type: 'project_list_request',
            data: {}
        };

        try {
            this.wsClient.send(message);
            this.log('info', '📋 Project list requested');
        } catch (error) {
            this.log('error', `Failed to request project list: ${error.message}`);
        }
    }

    handleServerMessage(message) {
        try {
            switch (message.type) {
                case 'project_list_response':
                    this.handleProjectList(message.data);
                    break;
                case 'claude_output':
                    this.handleClaudeOutput(message.data);
                    break;
                case 'claude_error':
                    this.handleClaudeError(message.data);
                    break;
                case 'pong':
                    this.handlePong(message.data);
                    break;
                default:
                    this.log('debug', `Received message type: ${message.type}`);
            }
        } catch (error) {
            this.log('error', `Failed to handle server message: ${error.message}`);
        }
    }

    handleProjectList(data) {
        this.log('success', `📋 Received ${data.total} projects`);
        this.projectList = data.projects;

        if (data.projects.length > 0) {
            this.defaultProjectId = data.projects[0].id;
            this.log('info', `🎯 Default project: ${this.defaultProjectId}`);
        }
    }

    handleClaudeOutput(data) {
        this.log('success', `📤 Claude output received: ${data.status}`);

        if (data.output) {
            this.generatePreview(data);
        }

        // 実行履歴に追加
        this.executionHistory.push({
            timestamp: Date.now(),
            command: data.command,
            output: data.output,
            status: data.status,
            projectId: data.project_id
        });

        this.stats.commandsExecuted++;
        this.updateSuccessRate();
    }

    handleClaudeError(data) {
        this.log('error', `❌ Claude error: ${data.error || 'Unknown error'}`);

        // エラーの分析と対応
        if (data.error && data.error.includes('project not found')) {
            this.log('warning', '🔄 Project not found - refreshing project list');
            this.requestProjectList();
        }
    }

    handlePong(data) {
        if (data.timestamp) {
            const latency = Date.now() - data.timestamp.timestamp;
            this.errorHandler.updateConnectionQuality(latency);
            this.log('debug', `🏓 Pong received - latency: ${latency}ms`);
        }
    }

    async executeClaudeCommand(command, options = {}) {
        const startTime = Date.now();

        if (!this.isConnected) {
            this.log('warning', `📦 Queueing command (not connected): ${command}`);
            this.commandQueue.push({ command, options, timestamp: startTime });
            return null;
        }

        const projectId = options.projectId || this.defaultProjectId;
        if (!projectId) {
            this.log('error', 'No project available for command execution');
            return null;
        }

        const message = {
            type: 'claude_execute',
            data: {
                command: command,
                project_id: projectId,
                context: {
                    current_dir: options.workingDir || '/workspace',
                    git_branch: options.branch || 'main'
                }
            }
        };

        try {
            this.wsClient.send(message);
            this.log('info', `🚀 Executing: ${command}`);

            // 実行時間の記録
            const executionTime = Date.now() - startTime;
            this.updateAverageExecutionTime(executionTime);

            return {
                messageId: Date.now().toString(),
                command: command,
                projectId: projectId,
                startTime: startTime
            };

        } catch (error) {
            this.log('error', `Failed to execute command: ${error.message}`);
            return null;
        }
    }

    generatePreview(data) {
        try {
            const previewId = `preview-${Date.now()}`;
            const preview = {
                id: previewId,
                timestamp: new Date().toISOString(),
                command: data.command,
                output: data.output,
                status: data.status,
                projectId: data.project_id,
                type: this.detectOutputType(data.output)
            };

            // HTML プレビュー生成
            if (this.previewOptions.generateHtml) {
                const htmlPreview = this.generateHtmlPreview(preview);
                const htmlFile = path.join(this.previewDir, `${previewId}.html`);
                fs.writeFileSync(htmlFile, htmlPreview);
                preview.htmlFile = htmlFile;
            }

            // Markdown プレビュー生成
            if (this.previewOptions.generateMarkdown) {
                const mdPreview = this.generateMarkdownPreview(preview);
                const mdFile = path.join(this.previewDir, `${previewId}.md`);
                fs.writeFileSync(mdFile, mdPreview);
                preview.markdownFile = mdFile;
            }

            // ファイル操作の検出
            if (this.previewOptions.includeFileOperations) {
                preview.fileOperations = this.detectFileOperations(data.command, data.output);
            }

            this.previewCache.set(previewId, preview);
            this.stats.previewsGenerated++;

            this.log('success', `📋 Preview generated: ${previewId}`);
            return preview;

        } catch (error) {
            this.log('error', `Failed to generate preview: ${error.message}`);
            return null;
        }
    }

    detectOutputType(output) {
        if (!output) return 'empty';

        // JSON検出
        try {
            JSON.parse(output);
            return 'json';
        } catch {}

        // コードブロック検出
        if (output.includes('```')) return 'code';

        // エラー検出
        if (output.toLowerCase().includes('error') || output.includes('failed')) {
            return 'error';
        }

        // ファイルリスト検出
        if (output.includes('\n') && output.split('\n').length > 3) {
            return 'list';
        }

        return 'text';
    }

    generateHtmlPreview(preview) {
        const escapedOutput = this.escapeHtml(preview.output);
        const timestamp = new Date(preview.timestamp).toLocaleString();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Code CLI Preview - ${preview.id}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .command { background: #1e1e1e; color: #f8f8f2; padding: 15px; border-radius: 4px; font-family: 'Monaco', 'Menlo', monospace; margin: 15px 0; }
        .output { background: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; border-radius: 4px; white-space: pre-wrap; font-family: monospace; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .status.completed { background: #d4edda; color: #155724; }
        .status.error { background: #f8d7da; color: #721c24; }
        .meta { color: #6c757d; font-size: 14px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Claude Code CLI Preview</h1>
            <p>Generated on ${timestamp}</p>
        </div>
        <div class="content">
            <div class="meta">
                <strong>Preview ID:</strong> ${preview.id}<br>
                <strong>Project:</strong> ${preview.projectId}<br>
                <strong>Status:</strong> <span class="status ${preview.status}">${preview.status}</span><br>
                <strong>Type:</strong> ${preview.type}
            </div>

            <h3>Command Executed</h3>
            <div class="command">$ ${this.escapeHtml(preview.command)}</div>

            <h3>Output</h3>
            <div class="output">${escapedOutput}</div>

            ${preview.fileOperations ? `
            <h3>File Operations Detected</h3>
            <ul>
                ${preview.fileOperations.map(op => `<li><strong>${op.type}:</strong> ${op.file}</li>`).join('')}
            </ul>
            ` : ''}

            <div class="meta">
                Preview generated by Stable Claude CLI Bridge v3.7.1
            </div>
        </div>
    </div>
</body>
</html>`;
    }

    generateMarkdownPreview(preview) {
        const timestamp = new Date(preview.timestamp).toLocaleString();

        return `# 🤖 Claude Code CLI Preview

**Generated:** ${timestamp}
**Preview ID:** ${preview.id}
**Project:** ${preview.projectId}
**Status:** ${preview.status}
**Type:** ${preview.type}

## Command Executed

\`\`\`bash
${preview.command}
\`\`\`

## Output

\`\`\`
${preview.output}
\`\`\`

${preview.fileOperations ? `
## File Operations Detected

${preview.fileOperations.map(op => `- **${op.type}:** ${op.file}`).join('\n')}
` : ''}

---
*Preview generated by Stable Claude CLI Bridge v3.7.1*`;
    }

    detectFileOperations(command, output) {
        const operations = [];

        // コマンドベースの検出
        if (command.includes('touch ') || command.includes('echo ') && command.includes(' > ')) {
            const match = command.match(/(?:touch|echo.*>)\s+([^\s]+)/);
            if (match) operations.push({ type: 'create', file: match[1] });
        }

        if (command.includes('rm ') || command.includes('del ')) {
            const match = command.match(/(?:rm|del)\s+([^\s]+)/);
            if (match) operations.push({ type: 'delete', file: match[1] });
        }

        if (command.includes('mv ') || command.includes('cp ')) {
            const match = command.match(/(?:mv|cp)\s+([^\s]+)\s+([^\s]+)/);
            if (match) operations.push({ type: command.includes('mv') ? 'move' : 'copy', file: match[1], target: match[2] });
        }

        // 出力ベースの検出
        if (output.includes('created') || output.includes('Created')) {
            const lines = output.split('\n');
            lines.forEach(line => {
                const match = line.match(/(?:created|Created).*?([^\s]+\.[a-zA-Z]+)/);
                if (match) operations.push({ type: 'create', file: match[1] });
            });
        }

        return operations;
    }

    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    updateAverageExecutionTime(newTime) {
        const count = this.stats.commandsExecuted;
        this.stats.averageExecutionTime = (this.stats.averageExecutionTime * (count - 1) + newTime) / count;
    }

    updateSuccessRate() {
        const total = this.stats.commandsExecuted;
        const successful = this.executionHistory.filter(h => h.status === 'completed').length;
        this.stats.successRate = total > 0 ? (successful / total) * 100 : 0;
    }

    enablePayloadReduction() {
        this.log('info', '📦 Enabling payload reduction mode');
        this.payloadReductionEnabled = true;
    }

    generateConnectionReport() {
        const report = this.errorHandler.generateErrorReport();
        const reportPath = path.join(this.logsDir, `connection-report-${Date.now()}.json`);

        try {
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            this.log('success', `📋 Connection report saved: ${reportPath}`);
        } catch (error) {
            this.log('error', `Failed to save connection report: ${error.message}`);
        }

        return report;
    }

    async processCommandQueue() {
        if (!this.isConnected || this.commandQueue.length === 0) return;

        this.log('info', `📦 Processing ${this.commandQueue.length} queued commands`);

        while (this.commandQueue.length > 0 && this.isConnected) {
            const { command, options } = this.commandQueue.shift();
            await this.executeClaudeCommand(command, options);

            // 短い待機時間でサーバー負荷を軽減
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        this.log('success', '📦 Command queue processed');
    }

    getStats() {
        return {
            ...this.stats,
            connected: this.isConnected,
            queueLength: this.commandQueue.length,
            historyLength: this.executionHistory.length,
            previewCacheSize: this.previewCache.size,
            connectionQuality: this.errorHandler.connectionQuality,
            uptime: this.errorHandler.lastSuccessfulConnection ?
                Date.now() - this.errorHandler.lastSuccessfulConnection : 0
        };
    }

    getRecentPreviews(limit = 10) {
        const previews = Array.from(this.previewCache.values())
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);

        return previews.map(p => ({
            id: p.id,
            timestamp: p.timestamp,
            command: p.command,
            status: p.status,
            type: p.type,
            htmlFile: p.htmlFile,
            markdownFile: p.markdownFile
        }));
    }

    async startBridge() {
        this.log('info', '🚀 Starting Stable Claude CLI Bridge');

        try {
            await this.initializeConnection();

            // キューの処理を定期的に実行
            setInterval(() => {
                this.processCommandQueue();
            }, 2000);

            // 統計情報の定期出力
            setInterval(() => {
                const stats = this.getStats();
                this.log('info', '📊 Bridge Stats', {
                    commands: stats.commandsExecuted,
                    success: `${Math.round(stats.successRate)}%`,
                    quality: stats.connectionQuality,
                    queue: stats.queueLength
                });
            }, 30000);

            this.log('success', '✅ Stable Claude CLI Bridge active');
            return true;

        } catch (error) {
            this.log('error', `Failed to start bridge: ${error.message}`);
            throw error;
        }
    }

    async stopBridge() {
        this.log('info', '🛑 Stopping Stable Claude CLI Bridge');

        if (this.wsClient) {
            this.wsClient.close();
        }

        // 最終統計レポート
        const finalStats = this.getStats();
        const reportPath = path.join(this.logsDir, `final-bridge-report-${Date.now()}.json`);

        try {
            fs.writeFileSync(reportPath, JSON.stringify(finalStats, null, 2));
            this.log('success', `📋 Final report saved: ${reportPath}`);
        } catch (error) {
            this.log('error', `Failed to save final report: ${error.message}`);
        }

        this.log('success', '🛑 Bridge stopped');
    }
}

// CLI実行
async function main() {
    if (require.main === module) {
        const wsUrl = process.argv[2] || 'ws://192.168.0.135:8091/ws?key=3648b8f946d71a62c018ac5198ee757c';

        const bridge = new StableClaudeCliBridge(wsUrl);

        try {
            await bridge.startBridge();

            // 終了処理
            process.on('SIGINT', async () => {
                console.log('\n🛑 Stopping bridge...');
                await bridge.stopBridge();
                process.exit(0);
            });

            // テストコマンドの実行例
            setTimeout(async () => {
                console.log('\n🧪 Testing CLI commands...');
                await bridge.executeClaudeCommand('pwd');
                await bridge.executeClaudeCommand('ls -la');
                await bridge.executeClaudeCommand('echo "Hello from Stable CLI Bridge"');
            }, 5000);

        } catch (error) {
            console.error(`${colors.red}❌ Bridge failed: ${error.message}${colors.reset}`);
            process.exit(1);
        }
    }
}

module.exports = StableClaudeCliBridge;

if (require.main === module) {
    main();
}