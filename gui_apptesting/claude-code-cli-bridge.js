#!/usr/bin/env node

/**
 * RemoteClaude v3.7.1 - Claude Code CLI Bridge
 * 🌉 Stable CLI Integration with Preview Generation
 */

const WebSocket = require('ws');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

// カラー定義
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    purple: '\x1b[35m',
    cyan: '\x1b[36m'
};

class ClaudeCodeCLIBridge {
    constructor() {
        this.scriptDir = __dirname;
        this.serverInfo = null;
        this.projectId = null;
        this.ws = null;
        this.sessionId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 2000;
        this.heartbeatInterval = null;
        this.lastActivity = Date.now();
        this.messageQueue = [];
        this.pendingCommands = new Map();
        this.previewCache = new Map();

        // 設定
        this.config = {
            connectionTimeout: 10000,
            commandTimeout: 60000,
            heartbeatInterval: 30000,
            maxMessageRetries: 3,
            previewMaxSize: 1000000, // 1MB
            previewTypes: ['.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte', '.html', '.css', '.json', '.md']
        };
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

        console.log(`${color}${symbol} [${timestamp}] ${message}${colors.reset}`);

        if (data && process.env.DEBUG) {
            console.log(`   ${JSON.stringify(data, null, 2)}`);
        }
    }

    async initialize() {
        this.log('info', 'Initializing Claude Code CLI Bridge...');

        try {
            // サーバ情報取得
            await this.fetchServerInfo();

            // WebSocket接続確立
            await this.connect();

            // プロジェクト情報取得
            await this.getProjectList();

            // ハートビート開始
            this.startHeartbeat();

            this.log('success', 'Claude Code CLI Bridge initialized successfully');
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
                timeout: this.config.connectionTimeout
            });

            this.serverInfo = response.data.server_info;
            this.log('success', `Server info: ${this.serverInfo.host}:${this.serverInfo.port}`);

        } catch (error) {
            throw new Error(`Failed to fetch server info: ${error.message}`);
        }
    }

    async connect() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('WebSocket connection timeout'));
            }, this.config.connectionTimeout);

            try {
                const wsUrl = this.serverInfo.connection_url;
                this.log('info', `Connecting to: ${wsUrl}`);

                this.ws = new WebSocket(wsUrl);

                this.ws.on('open', () => {
                    clearTimeout(timeout);
                    this.reconnectAttempts = 0;
                    this.lastActivity = Date.now();
                    this.log('success', 'WebSocket connection established');
                    this.processMessageQueue();
                    resolve();
                });

                this.ws.on('message', (data) => {
                    this.handleMessage(data);
                });

                this.ws.on('close', (code, reason) => {
                    clearTimeout(timeout);
                    this.log('warning', `WebSocket closed: ${code} ${reason}`);
                    this.handleDisconnection();
                });

                this.ws.on('error', (error) => {
                    clearTimeout(timeout);
                    this.log('error', `WebSocket error: ${error.message}`);
                    reject(error);
                });

            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            this.lastActivity = Date.now();

            this.log('debug', `Received: ${message.type}`, message);

            switch (message.type) {
                case 'connection_established':
                    this.log('success', 'Connection established');
                    break;

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
                    this.log('debug', 'Pong received');
                    break;

                default:
                    this.log('debug', `Unknown message type: ${message.type}`);
            }

        } catch (error) {
            this.log('error', `Failed to parse message: ${error.message}`);
        }
    }

    handleProjectList(data) {
        if (data.projects && data.projects.length > 0) {
            this.projectId = data.projects[0].id;
            this.log('success', `Using project: ${this.projectId}`);

            // 保留中のコマンド実行
            this.processPendingCommands();
        } else {
            this.log('warning', 'No projects available');
        }
    }

    handleClaudeOutput(data) {
        const commandId = `${data.project_id}_${data.command}`;
        const pendingCommand = this.pendingCommands.get(commandId);

        if (pendingCommand) {
            pendingCommand.resolve({
                success: true,
                output: data.output,
                projectId: data.project_id,
                sessionId: data.session_id,
                messageCount: data.message_count
            });

            this.pendingCommands.delete(commandId);
            this.log('success', `Command completed: ${data.command}`);

            // プレビュー生成
            this.generatePreview(data);
        }
    }

    handleClaudeError(data) {
        const commandId = data.command ? `${data.project_id}_${data.command}` : 'unknown';
        const pendingCommand = this.pendingCommands.get(commandId);

        if (pendingCommand) {
            pendingCommand.reject(new Error(data.error || 'Command execution failed'));
            this.pendingCommands.delete(commandId);
        }

        this.log('error', `Command failed: ${data.error || 'Unknown error'}`);
    }

    handleDisconnection() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.log('info', `Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);

            setTimeout(() => {
                this.connect().catch(error => {
                    this.log('error', `Reconnection failed: ${error.message}`);
                });
            }, this.reconnectInterval * this.reconnectAttempts);
        } else {
            this.log('error', 'Max reconnection attempts reached');
        }
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                const now = Date.now();
                if (now - this.lastActivity > this.config.heartbeatInterval) {
                    this.sendMessage({
                        type: 'ping',
                        data: { timestamp: now }
                    });
                }
            }
        }, this.config.heartbeatInterval);
    }

    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            this.log('debug', `Sent: ${message.type}`, message);
            return true;
        } else {
            this.messageQueue.push(message);
            this.log('warning', 'Message queued (connection not ready)');
            return false;
        }
    }

    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.sendMessage(message);
        }
    }

    async getProjectList() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Project list request timeout'));
            }, this.config.connectionTimeout);

            const cleanup = () => {
                clearTimeout(timeout);
            };

            // プロジェクトリスト取得後の処理を準備
            const originalHandler = this.handleProjectList.bind(this);
            this.handleProjectList = (data) => {
                cleanup();
                originalHandler(data);
                resolve(data);
            };

            // リクエスト送信
            if (!this.sendMessage({
                type: 'project_list_request',
                data: {}
            })) {
                cleanup();
                reject(new Error('Failed to send project list request'));
            }
        });
    }

    async executeCommand(command, options = {}) {
        if (!this.projectId) {
            throw new Error('No project available');
        }

        const commandId = `${this.projectId}_${command}`;

        // 既存の実行中コマンドをチェック
        if (this.pendingCommands.has(commandId)) {
            throw new Error('Command already in progress');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingCommands.delete(commandId);
                reject(new Error('Command execution timeout'));
            }, options.timeout || this.config.commandTimeout);

            this.pendingCommands.set(commandId, {
                resolve: (result) => {
                    clearTimeout(timeout);
                    resolve(result);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    reject(error);
                }
            });

            const message = {
                type: 'claude_execute',
                data: {
                    command: command,
                    project_id: this.projectId,
                    context: {
                        current_dir: options.workingDir || '/workspace',
                        git_branch: options.branch || 'main',
                        ...options.context
                    }
                }
            };

            if (!this.sendMessage(message)) {
                clearTimeout(timeout);
                this.pendingCommands.delete(commandId);
                reject(new Error('Failed to send command'));
            }

            this.log('info', `Executing command: ${command}`);
        });
    }

    async processPendingCommands() {
        // 待機中のコマンドを実行
        // 実装は必要に応じて追加
    }

    async generatePreview(data) {
        try {
            const { command, output, project_id } = data;

            // ファイル作成・編集コマンドの場合
            if (this.isFileOperationCommand(command)) {
                const filePaths = this.extractFilePathsFromCommand(command);

                for (const filePath of filePaths) {
                    await this.generateFilePreview(filePath, project_id);
                }
            }

            // 一般的なプレビュー情報
            const preview = {
                timestamp: new Date().toISOString(),
                command: command,
                output: output.substring(0, 500), // 最初の500文字
                project_id: project_id,
                type: this.detectCommandType(command)
            };

            this.previewCache.set(`${project_id}_${Date.now()}`, preview);
            this.log('success', 'Preview generated', preview);

            // プレビューを表示
            await this.displayPreview(preview);

        } catch (error) {
            this.log('error', `Preview generation failed: ${error.message}`);
        }
    }

    isFileOperationCommand(command) {
        const fileOps = ['touch', 'echo', 'cat', 'nano', 'vim', 'code', 'write', 'create'];
        return fileOps.some(op => command.includes(op)) || command.includes('>');
    }

    extractFilePathsFromCommand(command) {
        const paths = [];

        // 基本的なファイルパス抽出
        const patterns = [
            /(\S+\.(js|ts|jsx|tsx|vue|svelte|html|css|json|md|py|go|java|cpp|h))/g,
            /(?:>|>>)\s*(\S+)/g,
            /(?:touch|nano|vim|code)\s+(\S+)/g
        ];

        patterns.forEach(pattern => {
            const matches = command.match(pattern);
            if (matches) {
                paths.push(...matches);
            }
        });

        return [...new Set(paths)].filter(p => p && !p.startsWith('-'));
    }

    detectCommandType(command) {
        if (command.includes('ls') || command.includes('dir')) return 'directory_listing';
        if (command.includes('cat') || command.includes('head') || command.includes('tail')) return 'file_reading';
        if (command.includes('grep') || command.includes('find')) return 'search';
        if (command.includes('git')) return 'git_operation';
        if (command.includes('npm') || command.includes('yarn') || command.includes('pip')) return 'package_management';
        if (command.includes('docker')) return 'container_operation';
        if (this.isFileOperationCommand(command)) return 'file_operation';
        return 'general';
    }

    async generateFilePreview(filePath, projectId) {
        try {
            // ファイル内容を取得
            const result = await this.executeCommand(`cat "${filePath}"`, {
                timeout: 10000
            });

            if (result.success) {
                const content = result.output;
                const extension = path.extname(filePath);

                if (this.config.previewTypes.includes(extension)) {
                    const preview = {
                        type: 'file_preview',
                        filePath: filePath,
                        extension: extension,
                        content: content.substring(0, this.config.previewMaxSize),
                        size: content.length,
                        lines: content.split('\n').length,
                        timestamp: new Date().toISOString()
                    };

                    // ファイルプレビューを保存
                    const previewPath = path.join(this.scriptDir, 'reports', `preview_${Date.now()}.json`);
                    fs.writeFileSync(previewPath, JSON.stringify(preview, null, 2));

                    this.log('success', `File preview saved: ${previewPath}`);
                    return preview;
                }
            }

        } catch (error) {
            this.log('warning', `File preview failed for ${filePath}: ${error.message}`);
        }

        return null;
    }

    async displayPreview(preview) {
        // コンソール表示
        console.log(`\n${colors.blue}════════════════════════════════════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.cyan}📋 Command Preview${colors.reset}`);
        console.log(`${colors.blue}════════════════════════════════════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.yellow}Command:${colors.reset} ${preview.command}`);
        console.log(`${colors.yellow}Type:${colors.reset} ${preview.type}`);
        console.log(`${colors.yellow}Project:${colors.reset} ${preview.project_id}`);
        console.log(`${colors.yellow}Output:${colors.reset}\n${preview.output}`);
        console.log(`${colors.blue}════════════════════════════════════════════════════════════════════════════${colors.reset}\n`);

        // ブラウザでプレビューを開く（オプション）
        if (process.env.OPEN_PREVIEW) {
            await this.openPreviewInBrowser(preview);
        }
    }

    async openPreviewInBrowser(preview) {
        try {
            // HTMLプレビューを生成
            const htmlPath = await this.generateHTMLPreview(preview);

            // ブラウザで開く
            const command = process.platform === 'darwin' ? 'open' :
                           process.platform === 'win32' ? 'start' : 'xdg-open';

            exec(`${command} "${htmlPath}"`);
            this.log('success', 'Preview opened in browser');

        } catch (error) {
            this.log('error', `Failed to open preview in browser: ${error.message}`);
        }
    }

    async generateHTMLPreview(preview) {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Code CLI Preview</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #007acc; padding-bottom: 10px; margin-bottom: 20px; }
        .command { background: #f8f8f8; padding: 15px; border-radius: 5px; margin: 10px 0; font-family: monospace; }
        .output { background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; }
        .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 20px 0; }
        .meta-item { padding: 10px; background: #f0f9ff; border-radius: 5px; }
        .label { font-weight: bold; color: #1e40af; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Claude Code CLI Preview</h1>
            <p>Generated at ${preview.timestamp}</p>
        </div>
        <div class="meta">
            <div class="meta-item">
                <div class="label">Project ID</div>
                <div>${preview.project_id}</div>
            </div>
            <div class="meta-item">
                <div class="label">Command Type</div>
                <div>${preview.type}</div>
            </div>
        </div>
        <div class="command">
            <div class="label">Command:</div>
            ${preview.command}
        </div>
        <div class="output">
${preview.output}
        </div>
    </div>
</body>
</html>
        `;

        const htmlPath = path.join(this.scriptDir, 'reports', `preview_${Date.now()}.html`);
        fs.writeFileSync(htmlPath, html);

        return htmlPath;
    }

    // Claude Code CLI インターフェース
    async executeCLICommand(command, options = {}) {
        try {
            this.log('info', `Claude Code CLI: ${command}`);

            const result = await this.executeCommand(command, {
                workingDir: options.cwd || process.cwd(),
                timeout: options.timeout || 30000,
                context: options.context || {}
            });

            if (result.success) {
                this.log('success', 'Command completed successfully');
                return {
                    success: true,
                    output: result.output,
                    sessionId: result.sessionId,
                    messageCount: result.messageCount
                };
            } else {
                throw new Error('Command execution failed');
            }

        } catch (error) {
            this.log('error', `CLI command failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getProjectStatus() {
        try {
            const result = await this.executeCommand('pwd && ls -la && git status || echo "No git repository"');
            return {
                success: true,
                projectId: this.projectId,
                status: result.output
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async close() {
        this.log('info', 'Closing Claude Code CLI Bridge...');

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        if (this.ws) {
            this.ws.close(1000, 'Normal closure');
        }

        // 保留中のコマンドをキャンセル
        for (const [commandId, command] of this.pendingCommands) {
            command.reject(new Error('Bridge closing'));
        }
        this.pendingCommands.clear();

        this.log('success', 'Bridge closed successfully');
    }
}

// CLI インターフェース
async function main() {
    if (require.main === module) {
        const bridge = new ClaudeCodeCLIBridge();

        try {
            await bridge.initialize();

            // コマンドライン引数から実行
            const args = process.argv.slice(2);
            if (args.length > 0) {
                const command = args.join(' ');
                const result = await bridge.executeCLICommand(command);

                if (result.success) {
                    console.log(result.output);
                    process.exit(0);
                } else {
                    console.error(result.error);
                    process.exit(1);
                }
            } else {
                // インタラクティブモード
                console.log(`${colors.green}🚀 Claude Code CLI Bridge ready!${colors.reset}`);
                console.log(`${colors.cyan}Usage: node claude-code-cli-bridge.js <command>${colors.reset}`);
                console.log(`${colors.cyan}Example: node claude-code-cli-bridge.js "ls -la"${colors.reset}`);

                // プロジェクト状態表示
                const status = await bridge.getProjectStatus();
                if (status.success) {
                    console.log(`\n${colors.yellow}Project Status:${colors.reset}\n${status.status}`);
                }

                // 終了処理
                process.on('SIGINT', async () => {
                    await bridge.close();
                    process.exit(0);
                });
            }

        } catch (error) {
            console.error(`${colors.red}❌ Bridge failed: ${error.message}${colors.reset}`);
            process.exit(1);
        }
    }
}

// エクスポート
module.exports = ClaudeCodeCLIBridge;

// 実行
if (require.main === module) {
    main();
}