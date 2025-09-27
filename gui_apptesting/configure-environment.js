#!/usr/bin/env node

/**
 * RemoteClaude v3.7.1 Environment Configuration Script
 * ⚙️ Interactive Environment Configuration & Setup
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');

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

class EnvironmentConfigurator {
    constructor() {
        this.scriptDir = __dirname;
        this.configDir = path.join(this.scriptDir, 'config');
        this.config = {
            environment: 'development',
            servers: {},
            logging: {},
            testing: {},
            performance: {},
            security: {}
        };

        // インターフェース作成
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    log(level, message) {
        const colorMap = {
            success: colors.green,
            error: colors.red,
            warning: colors.yellow,
            info: colors.cyan,
            header: colors.blue
        };

        const color = colorMap[level] || colors.reset;
        const symbol = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            header: '⚙️'
        }[level] || '';

        console.log(`${color}${symbol} ${message}${colors.reset}`);
    }

    async prompt(question, defaultValue = '') {
        return new Promise((resolve) => {
            const displayDefault = defaultValue ? ` (${defaultValue})` : '';
            this.rl.question(`${colors.cyan}${question}${displayDefault}: ${colors.reset}`, (answer) => {
                resolve(answer.trim() || defaultValue);
            });
        });
    }

    async confirmPrompt(question, defaultValue = false) {
        const defaultText = defaultValue ? ' (Y/n)' : ' (y/N)';
        const answer = await this.prompt(`${question}${defaultText}`);

        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            return true;
        } else if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
            return false;
        }

        return defaultValue;
    }

    async selectFromList(question, options, defaultIndex = 0) {
        console.log(`${colors.cyan}${question}${colors.reset}`);
        options.forEach((option, index) => {
            const marker = index === defaultIndex ? '→' : ' ';
            console.log(`  ${marker} ${index + 1}. ${option}`);
        });

        const answer = await this.prompt('Select option (number)', (defaultIndex + 1).toString());
        const selected = parseInt(answer) - 1;

        if (selected >= 0 && selected < options.length) {
            return selected;
        }

        return defaultIndex;
    }

    async configureBasicSettings() {
        this.log('header', 'Basic Environment Configuration');

        // 環境タイプ選択
        const environments = ['development', 'staging', 'production'];
        const envIndex = await this.selectFromList(
            'Select environment type:',
            environments,
            0
        );
        this.config.environment = environments[envIndex];

        // プロジェクト名
        const projectName = await this.prompt(
            'Project name',
            'RemoteClaude GUI Testing'
        );
        this.config.projectName = projectName;

        // バージョン
        const version = await this.prompt('Version', '3.7.1');
        this.config.version = version;

        // 開発者情報
        const developer = await this.prompt('Developer/Team name', os.userInfo().username);
        this.config.developer = developer;

        this.log('success', `Environment configured as: ${this.config.environment}`);
    }

    async configureServerSettings() {
        this.log('header', 'Server Configuration');

        // Go Server設定
        console.log(`${colors.purple}Go Server Configuration:${colors.reset}`);

        const goPort1 = await this.prompt('Go Server Primary Port', '8090');
        const goPort2 = await this.prompt('Go Server Secondary Port', '8091');
        const goHost = await this.prompt('Go Server Host', 'localhost');

        this.config.servers.go_primary = {
            port: parseInt(goPort1),
            host: goHost,
            ssl: false,
            timeout: 30000
        };

        this.config.servers.go_secondary = {
            port: parseInt(goPort2),
            host: goHost,
            ssl: false,
            timeout: 30000
        };

        // Expo Server設定
        console.log(`${colors.purple}Expo Server Configuration:${colors.reset}`);

        const expoPort1 = await this.prompt('Expo Primary Port', '8081');
        const expoPort2 = await this.prompt('Expo Secondary Port', '8082');

        this.config.servers.expo_primary = {
            port: parseInt(expoPort1),
            host: 'localhost',
            tunnel: false
        };

        this.config.servers.expo_secondary = {
            port: parseInt(expoPort2),
            host: 'localhost',
            tunnel: false
        };

        // GUI Tools設定
        console.log(`${colors.purple}GUI Tools Configuration:${colors.reset}`);

        const guiMonitorPort = await this.prompt('GUI Monitor Port', '3002');
        const commandTesterPort = await this.prompt('Command Tester Port', '3005');

        this.config.servers.gui_monitor = {
            port: parseInt(guiMonitorPort),
            host: 'localhost',
            auto_open: await this.confirmPrompt('Auto-open browser for GUI Monitor?', true)
        };

        this.config.servers.command_tester = {
            port: parseInt(commandTesterPort),
            host: 'localhost',
            auto_open: await this.confirmPrompt('Auto-open browser for Command Tester?', false)
        };

        this.log('success', 'Server configuration completed');
    }

    async configureLogging() {
        this.log('header', 'Logging Configuration');

        // ログレベル選択
        const logLevels = ['debug', 'info', 'warn', 'error'];
        const levelIndex = await this.selectFromList(
            'Select logging level:',
            logLevels,
            1 // info がデフォルト
        );

        this.config.logging = {
            level: logLevels[levelIndex],
            directory: './logs',
            max_file_size: '10MB',
            max_files: 5,
            console_output: await this.confirmPrompt('Enable console logging?', true),
            timestamp_format: 'ISO',
            rotation: await this.confirmPrompt('Enable log rotation?', true)
        };

        // 詳細ログ設定
        if (await this.confirmPrompt('Configure detailed logging options?', false)) {
            this.config.logging.request_logging = await this.confirmPrompt('Log HTTP requests?', true);
            this.config.logging.websocket_logging = await this.confirmPrompt('Log WebSocket messages?', false);
            this.config.logging.performance_logging = await this.confirmPrompt('Log performance metrics?', true);
        }

        this.log('success', 'Logging configuration completed');
    }

    async configureTesting() {
        this.log('header', 'Testing Configuration');

        // テスト設定
        const testTimeout = await this.prompt('Test timeout (ms)', '30000');
        const testRetries = await this.prompt('Test retry attempts', '3');

        this.config.testing = {
            timeout: parseInt(testTimeout),
            retries: parseInt(testRetries),
            parallel_tests: await this.confirmPrompt('Enable parallel testing?', true),
            auto_screenshot: await this.confirmPrompt('Auto-capture screenshots on failure?', true),
            performance_monitoring: await this.confirmPrompt('Enable performance monitoring during tests?', true)
        };

        // テストレポート設定
        if (await this.confirmPrompt('Configure test reporting?', true)) {
            const reportFormats = ['json', 'html', 'markdown', 'xml'];
            const selectedFormats = [];

            for (const format of reportFormats) {
                if (await this.confirmPrompt(`Generate ${format.toUpperCase()} reports?`, format === 'json')) {
                    selectedFormats.push(format);
                }
            }

            this.config.testing.report_formats = selectedFormats;
            this.config.testing.report_directory = './reports';
        }

        this.log('success', 'Testing configuration completed');
    }

    async configurePerformance() {
        this.log('header', 'Performance Configuration');

        // パフォーマンス監視
        this.config.performance = {
            monitoring_enabled: await this.confirmPrompt('Enable performance monitoring?', true),
            memory_threshold_mb: parseInt(await this.prompt('Memory usage threshold (MB)', '512')),
            cpu_threshold_percent: parseInt(await this.prompt('CPU usage threshold (%)', '80')),
            response_time_threshold_ms: parseInt(await this.prompt('Response time threshold (ms)', '1000'))
        };

        // 最適化設定
        if (await this.confirmPrompt('Configure optimization settings?', true)) {
            this.config.performance.optimizations = {
                compression: await this.confirmPrompt('Enable response compression?', true),
                caching: await this.confirmPrompt('Enable caching?', true),
                connection_pooling: await this.confirmPrompt('Enable connection pooling?', true),
                lazy_loading: await this.confirmPrompt('Enable lazy loading?', true)
            };
        }

        this.log('success', 'Performance configuration completed');
    }

    async configureSecurity() {
        this.log('header', 'Security Configuration');

        // セキュリティ設定
        this.config.security = {
            cors_enabled: await this.confirmPrompt('Enable CORS protection?', true),
            helmet_enabled: await this.confirmPrompt('Enable Helmet security headers?', true),
            rate_limiting: await this.confirmPrompt('Enable rate limiting?', false)
        };

        // CORS設定
        if (this.config.security.cors_enabled) {
            const allowedOrigins = await this.prompt(
                'Allowed CORS origins (comma-separated)',
                'http://localhost:3000,http://localhost:8080,http://localhost:8081'
            );
            this.config.security.cors_origins = allowedOrigins.split(',').map(o => o.trim());
        }

        // レート制限設定
        if (this.config.security.rate_limiting) {
            this.config.security.rate_limit = {
                window_ms: parseInt(await this.prompt('Rate limit window (ms)', '900000')), // 15分
                max_requests: parseInt(await this.prompt('Max requests per window', '100'))
            };
        }

        // セキュリティヘッダー
        if (await this.confirmPrompt('Configure additional security headers?', false)) {
            this.config.security.headers = {
                content_security_policy: await this.confirmPrompt('Enable CSP?', true),
                x_frame_options: await this.confirmPrompt('Enable X-Frame-Options?', true),
                x_content_type_options: await this.confirmPrompt('Enable X-Content-Type-Options?', true)
            };
        }

        this.log('success', 'Security configuration completed');
    }

    async saveConfiguration() {
        this.log('header', 'Saving Configuration');

        // config ディレクトリ作成
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
            this.log('success', 'Created config directory');
        }

        try {
            // メイン設定ファイル
            const configPath = path.join(this.configDir, 'environment.json');
            fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
            this.log('success', `Main configuration saved: ${configPath}`);

            // 環境変数ファイル
            const envPath = path.join(this.scriptDir, '.env');
            const envContent = this.generateEnvFile();
            fs.writeFileSync(envPath, envContent);
            this.log('success', `Environment variables saved: ${envPath}`);

            // Docker設定（オプション）
            if (await this.confirmPrompt('Generate Docker configuration?', false)) {
                await this.generateDockerConfig();
            }

            // npm scripts 更新
            await this.updatePackageJsonScripts();

            this.log('success', 'All configuration files saved successfully');

        } catch (error) {
            this.log('error', `Failed to save configuration: ${error.message}`);
            throw error;
        }
    }

    generateEnvFile() {
        let envContent = `# RemoteClaude v${this.config.version} Environment Configuration
# Generated on ${new Date().toISOString()}

# Environment
NODE_ENV=${this.config.environment}
PROJECT_NAME="${this.config.projectName}"
VERSION=${this.config.version}
DEVELOPER="${this.config.developer}"

# Server Ports
GO_SERVER_PORT_PRIMARY=${this.config.servers.go_primary.port}
GO_SERVER_PORT_SECONDARY=${this.config.servers.go_secondary.port}
EXPO_PORT_PRIMARY=${this.config.servers.expo_primary.port}
EXPO_PORT_SECONDARY=${this.config.servers.expo_secondary.port}
GUI_MONITOR_PORT=${this.config.servers.gui_monitor.port}
COMMAND_TESTER_PORT=${this.config.servers.command_tester.port}

# Logging
LOG_LEVEL=${this.config.logging.level}
LOG_DIRECTORY=${this.config.logging.directory}
LOG_MAX_SIZE=${this.config.logging.max_file_size}
LOG_MAX_FILES=${this.config.logging.max_files}

# Testing
TEST_TIMEOUT=${this.config.testing.timeout}
TEST_RETRIES=${this.config.testing.retries}

# Performance
MEMORY_THRESHOLD_MB=${this.config.performance.memory_threshold_mb}
CPU_THRESHOLD_PERCENT=${this.config.performance.cpu_threshold_percent}
RESPONSE_TIME_THRESHOLD_MS=${this.config.performance.response_time_threshold_ms}

# Security
CORS_ENABLED=${this.config.security.cors_enabled}
HELMET_ENABLED=${this.config.security.helmet_enabled}
RATE_LIMITING_ENABLED=${this.config.security.rate_limiting}
`;

        if (this.config.security.cors_origins) {
            envContent += `CORS_ORIGINS="${this.config.security.cors_origins.join(',')}"\n`;
        }

        return envContent;
    }

    async generateDockerConfig() {
        // Dockerfile
        const dockerfile = `FROM node:18-alpine

WORKDIR /app

# システム依存関係
RUN apk add --no-cache git go

# Node.js 依存関係
COPY package*.json ./
RUN npm ci --only=production

# アプリケーションコード
COPY . .

# ポート公開
EXPOSE ${this.config.servers.gui_monitor.port}
EXPOSE ${this.config.servers.command_tester.port}

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:${this.config.servers.gui_monitor.port}/health || exit 1

# 実行
CMD ["npm", "start"]
`;

        // docker-compose.yml
        const dockerCompose = `version: '3.8'

services:
  remoteclaude-gui:
    build: .
    ports:
      - "${this.config.servers.gui_monitor.port}:${this.config.servers.gui_monitor.port}"
      - "${this.config.servers.command_tester.port}:${this.config.servers.command_tester.port}"
    environment:
      - NODE_ENV=${this.config.environment}
      - LOG_LEVEL=${this.config.logging.level}
    volumes:
      - ./logs:/app/logs
      - ./reports:/app/reports
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${this.config.servers.gui_monitor.port}/health"]
      interval: 30s
      timeout: 10s
      retries: 3
`;

        fs.writeFileSync(path.join(this.scriptDir, 'Dockerfile'), dockerfile);
        fs.writeFileSync(path.join(this.scriptDir, 'docker-compose.yml'), dockerCompose);

        this.log('success', 'Docker configuration files generated');
    }

    async updatePackageJsonScripts() {
        const packagePath = path.join(this.scriptDir, 'package.json');

        try {
            let packageJson = {};
            if (fs.existsSync(packagePath)) {
                packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            }

            // scripts セクション更新
            packageJson.scripts = {
                ...packageJson.scripts,
                "config": "node configure-environment.js",
                "validate": "node validate-environment.js",
                "setup": "bash setup.sh",
                "install-deps": "bash install-dependencies.sh",
                "start": "bash start-servers.sh",
                "stop": "bash stop-servers.sh",
                "test": "node comprehensive-gui-test.js",
                "monitor": "node reliable-gui-monitor.js",
                "test-commands": "node fixed-command-tester.js",
                "analyze": "node performance-analyzer.js"
            };

            // config セクション追加
            packageJson.config = {
                environment: this.config.environment,
                version: this.config.version
            };

            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
            this.log('success', 'package.json scripts updated');

        } catch (error) {
            this.log('warning', `Failed to update package.json: ${error.message}`);
        }
    }

    async displaySummary() {
        console.log('');
        console.log(`${colors.purple}📋 Configuration Summary${colors.reset}`);
        console.log(`${colors.blue}────────────────────────────────────────────────────────────────────────────${colors.reset}`);

        console.log(`${colors.cyan}Environment:${colors.reset} ${this.config.environment}`);
        console.log(`${colors.cyan}Project:${colors.reset} ${this.config.projectName} v${this.config.version}`);
        console.log(`${colors.cyan}Developer:${colors.reset} ${this.config.developer}`);

        console.log('');
        console.log(`${colors.cyan}Server Ports:${colors.reset}`);
        console.log(`  Go Primary:      ${this.config.servers.go_primary.port}`);
        console.log(`  Go Secondary:    ${this.config.servers.go_secondary.port}`);
        console.log(`  Expo Primary:    ${this.config.servers.expo_primary.port}`);
        console.log(`  Expo Secondary:  ${this.config.servers.expo_secondary.port}`);
        console.log(`  GUI Monitor:     ${this.config.servers.gui_monitor.port}`);
        console.log(`  Command Tester:  ${this.config.servers.command_tester.port}`);

        console.log('');
        console.log(`${colors.cyan}Configuration:${colors.reset}`);
        console.log(`  Log Level:       ${this.config.logging.level}`);
        console.log(`  Test Timeout:    ${this.config.testing.timeout}ms`);
        console.log(`  CORS Enabled:    ${this.config.security.cors_enabled}`);
        console.log(`  Performance:     ${this.config.performance.monitoring_enabled ? 'Enabled' : 'Disabled'}`);
    }

    async run() {
        console.log(`${colors.blue}================================================================================================${colors.reset}`);
        console.log(`${colors.cyan}⚙️ RemoteClaude v3.7.1 - Interactive Environment Configuration${colors.reset}`);
        console.log(`${colors.blue}================================================================================================${colors.reset}`);

        try {
            await this.configureBasicSettings();
            await this.configureServerSettings();
            await this.configureLogging();
            await this.configureTesting();
            await this.configurePerformance();
            await this.configureSecurity();

            await this.displaySummary();

            console.log('');
            if (await this.confirmPrompt('Save this configuration?', true)) {
                await this.saveConfiguration();

                console.log('');
                console.log(`${colors.green}🎉 Environment configuration completed successfully!${colors.reset}`);
                console.log('');
                console.log(`${colors.cyan}Next steps:${colors.reset}`);
                console.log('1. Run ./setup.sh to apply the configuration');
                console.log('2. Run ./start-servers.sh to start all services');
                console.log('3. Run node validate-environment.js to verify setup');
            } else {
                console.log(`${colors.yellow}Configuration cancelled${colors.reset}`);
            }

        } catch (error) {
            this.log('error', `Configuration failed: ${error.message}`);
        } finally {
            this.rl.close();
        }

        console.log(`${colors.blue}================================================================================================${colors.reset}`);
    }
}

// メイン実行
if (require.main === module) {
    const configurator = new EnvironmentConfigurator();
    configurator.run().catch(error => {
        console.error(`${colors.red}❌ Configuration script crashed: ${error.message}${colors.reset}`);
        process.exit(1);
    });
}

module.exports = EnvironmentConfigurator;