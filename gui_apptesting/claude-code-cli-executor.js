#!/usr/bin/env node

/**
 * RemoteClaude v3.7.1 - Claude Code CLI Executor
 * 🚀 Complete CLI Command Pipeline with Preview
 */

const RobustWebSocketClient = require('./robust-websocket-client');
const axios = require('axios');
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

class ClaudeCodeCLIExecutor {
    constructor() {
        this.scriptDir = __dirname;
        this.reportsDir = path.join(this.scriptDir, 'reports');
        this.serverInfo = null;
        this.projectId = null;
        this.wsClient = null;
        this.commandQueue = [];
        this.executionHistory = [];
        this.isInitialized = false;

        // 実行統計
        this.stats = {
            commandsExecuted: 0,
            successfulCommands: 0,
            failedCommands: 0,
            totalExecutionTime: 0,
            previewsGenerated: 0
        };

        // レポートディレクトリ作成
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
        }
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

        console.log(`${color}${symbol} [${timestamp.split('T')[1].split('.')[0]}] ${message}${colors.reset}`);

        if (data && process.env.DEBUG) {
            console.log(`${colors.purple}   ${JSON.stringify(data, null, 2)}${colors.reset}`);
        }
    }

    async initialize() {
        if (this.isInitialized) {
            this.log('info', 'Already initialized');
            return true;
        }

        this.log('info', 'Initializing Claude Code CLI Executor...');

        try {
            // サーバ情報取得
            await this.fetchServerInfo();

            // WebSocket接続
            await this.setupWebSocketConnection();

            // プロジェクト情報取得
            await this.getProjectList();

            this.isInitialized = true;
            this.log('success', '🚀 Claude Code CLI Executor ready!');

            return true;

        } catch (error) {
            this.log('error', `Initialization failed: ${error.message}`);
            return false;
        }
    }

    async fetchServerInfo() {
        this.log('info', 'Fetching server information...');

        try {
            const response = await axios.get('http://localhost:3005/api/server-info', {
                timeout: 10000
            });

            this.serverInfo = response.data.server_info;
            this.log('success', `Connected to ${this.serverInfo.host}:${this.serverInfo.port}`);

        } catch (error) {
            throw new Error(`Server info fetch failed: ${error.message}`);
        }
    }

    async setupWebSocketConnection() {
        this.log('info', 'Setting up WebSocket connection...');

        const wsUrl = this.serverInfo.connection_url;
        this.wsClient = new RobustWebSocketClient(wsUrl, {
            maxReconnectAttempts: 10,
            reconnectInterval: 2000,
            pingInterval: 30000,
            connectionTimeout: 15000
        });

        // イベントリスナー設定
        this.wsClient.on('connected', (data) => {
            this.log('success', `WebSocket connected (${data.connectionId})`);
        });

        this.wsClient.on('disconnected', (data) => {
            this.log('warning', `WebSocket disconnected: ${data.code} ${data.reason}`);
        });

        this.wsClient.on('reconnecting', (data) => {
            this.log('info', `Reconnecting... (${data.attempt}/${data.maxAttempts})`);
        });

        this.wsClient.on('message', (message) => {
            this.handleWebSocketMessage(message);
        });

        this.wsClient.on('error', (error) => {
            this.log('error', `WebSocket error: ${error.message}`);
        });

        // 接続開始
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('WebSocket connection timeout'));
            }, 15000);

            this.wsClient.once('connected', () => {
                clearTimeout(timeout);
                resolve();
            });

            this.wsClient.once('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });

            this.wsClient.connect();
        });
    }

    handleWebSocketMessage(message) {
        this.log('debug', `Received: ${message.type}`);

        switch (message.type) {
            case 'project_list_response':
                this.handleProjectList(message.data);
                break;

            case 'claude_output':
                this.handleCommandOutput(message.data);
                break;

            case 'claude_error':
                this.handleCommandError(message.data);
                break;

            case 'pong':
                this.log('debug', 'Heartbeat pong received');
                break;
        }
    }

    handleProjectList(data) {
        if (data.projects && data.projects.length > 0) {
            this.projectId = data.projects[0].id;
            this.log('success', `Using project: ${this.projectId}`);
        } else {
            this.log('warning', 'No projects available');
        }
    }

    handleCommandOutput(data) {
        const execution = this.findPendingExecution(data.command);
        if (execution) {
            execution.resolve({
                success: true,
                output: data.output,
                projectId: data.project_id,
                sessionId: data.session_id,
                messageCount: data.message_count,
                executionTime: Date.now() - execution.startTime
            });

            this.stats.successfulCommands++;
            this.log('success', `✨ Command completed: ${data.command}`);

            // プレビュー生成
            this.generatePreview(data).catch(error => {
                this.log('warning', `Preview generation failed: ${error.message}`);
            });
        }
    }

    handleCommandError(data) {
        const execution = this.findPendingExecution(data.command);
        if (execution) {
            execution.reject(new Error(data.error || 'Command execution failed'));
            this.stats.failedCommands++;
        }

        this.log('error', `Command failed: ${data.error || 'Unknown error'}`);
    }

    findPendingExecution(command) {
        const index = this.commandQueue.findIndex(exec => exec.command === command && exec.status === 'pending');
        if (index !== -1) {
            const execution = this.commandQueue[index];
            this.commandQueue.splice(index, 1);
            return execution;
        }
        return null;
    }

    async getProjectList() {
        this.log('info', 'Getting project list...');

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Project list timeout'));
            }, 10000);

            const originalHandler = this.handleProjectList.bind(this);
            this.handleProjectList = (data) => {
                clearTimeout(timeout);
                originalHandler(data);
                resolve(data);
            };

            this.wsClient.send({
                type: 'project_list_request',
                data: {}
            });
        });
    }

    async executeCommand(command, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Executor not initialized');
        }

        if (!this.projectId) {
            throw new Error('No project available');
        }

        const executionId = Date.now().toString();
        const startTime = Date.now();

        this.log('info', `🔧 Executing: ${colors.bold}${command}${colors.reset}`);

        const execution = {
            id: executionId,
            command: command,
            projectId: this.projectId,
            startTime: startTime,
            status: 'pending',
            options: options
        };

        return new Promise((resolve, reject) => {
            execution.resolve = resolve;
            execution.reject = reject;

            // タイムアウト設定
            const timeout = setTimeout(() => {
                execution.status = 'timeout';
                reject(new Error('Command execution timeout'));
            }, options.timeout || 60000);

            execution.cleanup = () => {
                clearTimeout(timeout);
            };

            this.commandQueue.push(execution);

            // コマンド送信
            const message = {
                type: 'claude_execute',
                data: {
                    command: command,
                    project_id: this.projectId,
                    context: {
                        current_dir: options.workingDir || '/workspace',
                        git_branch: options.branch || 'main',
                        execution_id: executionId,
                        ...options.context
                    }
                }
            };

            try {
                this.wsClient.send(message);
                this.stats.commandsExecuted++;
            } catch (error) {
                execution.cleanup();
                reject(error);
            }
        });
    }

    async generatePreview(data) {
        try {
            const { command, output, project_id } = data;

            // プレビューデータ生成
            const preview = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                command: command,
                output: output,
                projectId: project_id,
                type: this.detectCommandType(command),
                files: this.extractFilesFromCommand(command),
                metrics: {
                    outputLength: output.length,
                    executionTime: data.executionTime || 0,
                    lineCount: output.split('\n').length
                }
            };

            // ファイル操作の場合、詳細プレビューを生成
            if (preview.type === 'file_operation' && preview.files.length > 0) {
                await this.generateFilePreview(preview);
            }

            // プレビューを保存
            await this.savePreview(preview);

            // プレビューを表示
            await this.displayPreview(preview);

            this.stats.previewsGenerated++;
            this.log('success', `📋 Preview generated: ${preview.id}`);

            return preview;

        } catch (error) {
            this.log('error', `Preview generation failed: ${error.message}`);
            throw error;
        }
    }

    detectCommandType(command) {
        const typeMap = {
            'file_operation': ['touch', 'echo', 'cat', 'nano', 'vim', 'code', 'write', 'create', '>', '>>'],
            'directory_listing': ['ls', 'dir', 'find'],
            'file_reading': ['cat', 'head', 'tail', 'less', 'more'],
            'search': ['grep', 'find', 'ag', 'rg'],
            'git_operation': ['git'],
            'package_management': ['npm', 'yarn', 'pip', 'cargo', 'go mod'],
            'container_operation': ['docker', 'kubectl'],
            'system_info': ['ps', 'top', 'df', 'free', 'uname'],
            'network': ['curl', 'wget', 'ping', 'netstat']
        };

        for (const [type, keywords] of Object.entries(typeMap)) {
            if (keywords.some(keyword => command.includes(keyword))) {
                return type;
            }
        }

        return 'general';
    }

    extractFilesFromCommand(command) {
        const files = [];

        // ファイルパターンを抽出
        const patterns = [
            /(\S+\.(js|ts|jsx|tsx|vue|svelte|html|css|json|md|py|go|java|cpp|h|txt|log))/g,
            /(?:>|>>)\s*(\S+)/g,
            /(?:touch|nano|vim|code|cat|head|tail)\s+(\S+)/g
        ];

        patterns.forEach(pattern => {
            const matches = command.match(pattern);
            if (matches) {
                files.push(...matches.filter(m => m && !m.startsWith('-')));
            }
        });

        return [...new Set(files)];
    }

    async generateFilePreview(preview) {
        for (const file of preview.files) {
            try {
                // ファイル内容を取得
                const result = await this.executeCommand(`cat "${file}"`, { timeout: 10000 });

                if (result.success) {
                    const content = result.output;
                    const filePreview = {
                        path: file,
                        extension: path.extname(file),
                        content: content.substring(0, 10000), // 最初の10KB
                        size: content.length,
                        lines: content.split('\n').length,
                        encoding: 'utf-8'
                    };

                    preview.fileDetails = preview.fileDetails || [];
                    preview.fileDetails.push(filePreview);
                }
            } catch (error) {
                this.log('warning', `File preview failed for ${file}: ${error.message}`);
            }
        }
    }

    async savePreview(preview) {
        const previewPath = path.join(this.reportsDir, `preview_${preview.id}.json`);
        const htmlPath = path.join(this.reportsDir, `preview_${preview.id}.html`);

        // JSON保存
        fs.writeFileSync(previewPath, JSON.stringify(preview, null, 2));

        // HTML生成
        const html = this.generateHTMLPreview(preview);
        fs.writeFileSync(htmlPath, html);

        preview.paths = {
            json: previewPath,
            html: htmlPath
        };
    }

    generateHTMLPreview(preview) {
        const fileDetailsHTML = preview.fileDetails ? preview.fileDetails.map(file => `
            <div class="file-detail">
                <h3>📄 ${file.path}</h3>
                <div class="file-meta">
                    <span>Size: ${file.size} bytes</span>
                    <span>Lines: ${file.lines}</span>
                    <span>Type: ${file.extension}</span>
                </div>
                <pre class="file-content">${this.escapeHtml(file.content)}</pre>
            </div>
        `).join('') : '';

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Code CLI Preview - ${preview.id}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 20px;
            background: #f8fafc;
            color: #334155;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .header {
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            color: #1e40af;
            font-size: 2.5em;
        }
        .meta-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .meta-item {
            padding: 20px;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-radius: 8px;
            border-left: 4px solid #0ea5e9;
        }
        .meta-label {
            font-weight: 600;
            color: #0c4a6e;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .meta-value {
            font-size: 1.1em;
            margin-top: 5px;
        }
        .command {
            background: #1e293b;
            color: #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 1.1em;
            margin: 20px 0;
            overflow-x: auto;
        }
        .output {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Monaco', 'Menlo', monospace;
            white-space: pre-wrap;
            max-height: 400px;
            overflow-y: auto;
            margin: 20px 0;
        }
        .file-detail {
            margin: 30px 0;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
        }
        .file-detail h3 {
            margin: 0;
            padding: 15px 20px;
            background: #f1f5f9;
            border-bottom: 1px solid #e2e8f0;
        }
        .file-meta {
            padding: 10px 20px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }
        .file-meta span {
            margin-right: 20px;
            font-size: 0.9em;
            color: #64748b;
        }
        .file-content {
            margin: 0;
            padding: 20px;
            background: #ffffff;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9em;
            max-height: 300px;
            overflow-y: auto;
        }
        .type-badge {
            display: inline-block;
            padding: 4px 12px;
            background: #3b82f6;
            color: white;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Claude Code CLI Preview</h1>
            <p>Generated at ${preview.timestamp}</p>
        </div>

        <div class="meta-grid">
            <div class="meta-item">
                <div class="meta-label">Command Type</div>
                <div class="meta-value">
                    <span class="type-badge">${preview.type}</span>
                </div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Project ID</div>
                <div class="meta-value">${preview.projectId}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Output Length</div>
                <div class="meta-value">${preview.metrics.outputLength} characters</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Line Count</div>
                <div class="meta-value">${preview.metrics.lineCount} lines</div>
            </div>
        </div>

        <div class="command">
            <strong>Command:</strong> ${this.escapeHtml(preview.command)}
        </div>

        <div class="output">${this.escapeHtml(preview.output)}</div>

        ${fileDetailsHTML}
    </div>
</body>
</html>
        `;
    }

    escapeHtml(text) {
        const div = { innerHTML: '' };
        div.textContent = text;
        return div.innerHTML;
    }

    async displayPreview(preview) {
        // コンソール表示
        console.log(`\n${colors.blue}════════════════════════════════════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.cyan}${colors.bold}📋 Claude Code CLI Preview${colors.reset}`);
        console.log(`${colors.blue}════════════════════════════════════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.yellow}ID:${colors.reset} ${preview.id}`);
        console.log(`${colors.yellow}Command:${colors.reset} ${colors.bold}${preview.command}${colors.reset}`);
        console.log(`${colors.yellow}Type:${colors.reset} ${preview.type}`);
        console.log(`${colors.yellow}Project:${colors.reset} ${preview.projectId}`);
        console.log(`${colors.yellow}Files:${colors.reset} ${preview.files.join(', ') || 'None'}`);
        console.log(`${colors.yellow}Output Lines:${colors.reset} ${preview.metrics.lineCount}`);
        console.log(`${colors.blue}────────────────────────────────────────────────────────────────────────────${colors.reset}`);

        // 出力の最初の500文字を表示
        const outputPreview = preview.output.length > 500 ?
            preview.output.substring(0, 500) + '...' :
            preview.output;
        console.log(outputPreview);

        console.log(`${colors.blue}════════════════════════════════════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.green}📄 Preview saved:${colors.reset} ${preview.paths.html}`);
        console.log(`${colors.blue}════════════════════════════════════════════════════════════════════════════${colors.reset}\n`);

        // 自動的にブラウザで開く（オプション）
        if (process.env.AUTO_OPEN_PREVIEW) {
            await this.openInBrowser(preview.paths.html);
        }
    }

    async openInBrowser(htmlPath) {
        const command = process.platform === 'darwin' ? 'open' :
                       process.platform === 'win32' ? 'start' : 'xdg-open';

        spawn(command, [htmlPath], { detached: true, stdio: 'ignore' });
        this.log('success', '🌐 Preview opened in browser');
    }

    getExecutionStats() {
        return {
            ...this.stats,
            totalExecutionTime: this.stats.totalExecutionTime,
            averageExecutionTime: this.stats.commandsExecuted > 0 ?
                this.stats.totalExecutionTime / this.stats.commandsExecuted : 0,
            successRate: this.stats.commandsExecuted > 0 ?
                (this.stats.successfulCommands / this.stats.commandsExecuted) * 100 : 0,
            queueLength: this.commandQueue.length,
            isConnected: this.wsClient ? this.wsClient.isAlive() : false
        };
    }

    async close() {
        this.log('info', 'Closing Claude Code CLI Executor...');

        if (this.wsClient) {
            this.wsClient.close();
        }

        // 実行中のコマンドをキャンセル
        this.commandQueue.forEach(execution => {
            if (execution.cleanup) execution.cleanup();
            if (execution.reject) execution.reject(new Error('Executor closing'));
        });

        this.commandQueue = [];
        this.isInitialized = false;

        this.log('success', 'Executor closed');
    }
}

// CLI実行
async function main() {
    if (require.main === module) {
        const executor = new ClaudeCodeCLIExecutor();

        try {
            // 初期化
            const initialized = await executor.initialize();
            if (!initialized) {
                process.exit(1);
            }

            // コマンドライン引数処理
            const args = process.argv.slice(2);

            if (args.length === 0) {
                // 統計表示
                const stats = executor.getExecutionStats();
                console.log(`\n${colors.cyan}📊 Executor Statistics:${colors.reset}`);
                console.log(`  Commands Executed: ${stats.commandsExecuted}`);
                console.log(`  Success Rate: ${stats.successRate.toFixed(1)}%`);
                console.log(`  Previews Generated: ${stats.previewsGenerated}`);
                console.log(`  Connected: ${stats.isConnected ? 'Yes' : 'No'}`);

                console.log(`\n${colors.green}🚀 Claude Code CLI Executor ready!${colors.reset}`);
                console.log(`${colors.cyan}Usage: node claude-code-cli-executor.js <command>${colors.reset}`);
                console.log(`${colors.cyan}Example: node claude-code-cli-executor.js "ls -la"${colors.reset}`);
                console.log(`${colors.cyan}Environment: AUTO_OPEN_PREVIEW=1 to auto-open previews${colors.reset}`);

                // 終了処理
                process.on('SIGINT', async () => {
                    await executor.close();
                    process.exit(0);
                });

                // 5分後に自動終了
                setTimeout(async () => {
                    console.log('\n⏰ Auto-closing after 5 minutes of inactivity...');
                    await executor.close();
                    process.exit(0);
                }, 5 * 60 * 1000);

            } else {
                // コマンド実行
                const command = args.join(' ');

                try {
                    const result = await executor.executeCommand(command);

                    if (result.success) {
                        console.log(result.output);
                        await executor.close();
                        process.exit(0);
                    } else {
                        console.error(`Command failed: ${result.error}`);
                        await executor.close();
                        process.exit(1);
                    }
                } catch (error) {
                    console.error(`Execution failed: ${error.message}`);
                    await executor.close();
                    process.exit(1);
                }
            }

        } catch (error) {
            console.error(`${colors.red}❌ Executor failed: ${error.message}${colors.reset}`);
            process.exit(1);
        }
    }
}

module.exports = ClaudeCodeCLIExecutor;

if (require.main === module) {
    main();
}