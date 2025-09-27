#!/usr/bin/env node

/**
 * RemoteClaude v3.7.1 Environment Validation Script
 * 🔍 Complete Project Structure & Configuration Validation
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
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

class EnvironmentValidator {
    constructor() {
        this.scriptDir = __dirname;
        this.serverDir = path.join(path.dirname(this.scriptDir), 'server');
        this.expoDir = path.join(path.dirname(this.scriptDir), 'RemoteClaudeApp');
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            details: []
        };
    }

    log(level, message, details = null) {
        const timestamp = new Date().toISOString();
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
            header: '📋'
        }[level] || '';

        console.log(`${color}${symbol} ${message}${colors.reset}`);

        if (details) {
            console.log(`   ${JSON.stringify(details, null, 2)}`);
        }

        this.results.details.push({
            timestamp,
            level,
            message,
            details
        });

        if (level === 'success') this.results.passed++;
        else if (level === 'error') this.results.failed++;
        else if (level === 'warning') this.results.warnings++;
    }

    async checkSystemRequirements() {
        this.log('header', 'System Requirements Validation');

        // Node.js version check
        try {
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

            if (majorVersion >= 18) {
                this.log('success', `Node.js version: ${nodeVersion} (Compatible)`);
            } else {
                this.log('error', `Node.js version: ${nodeVersion} (Requires v18+)`);
            }
        } catch (error) {
            this.log('error', 'Node.js version check failed', error.message);
        }

        // System info
        this.log('info', `Operating System: ${os.type()} ${os.release()}`);
        this.log('info', `Architecture: ${os.arch()}`);
        this.log('info', `Platform: ${os.platform()}`);
        this.log('info', `CPU Cores: ${os.cpus().length}`);
        this.log('info', `Total Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`);

        // Required commands
        const requiredCommands = ['node', 'npm', 'git'];
        const optionalCommands = ['go', 'docker', 'expo'];

        for (const cmd of requiredCommands) {
            try {
                const version = execSync(`${cmd} --version`, { encoding: 'utf8', timeout: 5000 }).trim();
                this.log('success', `${cmd}: ${version}`);
            } catch (error) {
                this.log('error', `${cmd}: Not found or not accessible`);
            }
        }

        for (const cmd of optionalCommands) {
            try {
                const version = execSync(`${cmd} --version`, { encoding: 'utf8', timeout: 5000 }).trim();
                this.log('success', `${cmd}: ${version} (Optional)`);
            } catch (error) {
                this.log('warning', `${cmd}: Not found (Optional)`);
            }
        }
    }

    async validateProjectStructure() {
        this.log('header', 'Project Structure Validation');

        // Required files
        const requiredFiles = [
            'package.json',
            'setup.sh',
            'start-servers.sh',
            'stop-servers.sh',
            'install-dependencies.sh',
            'comprehensive-gui-test.js',
            'fixed-command-tester.js',
            'reliable-gui-monitor.js',
            'performance-analyzer.js'
        ];

        // Required directories
        const requiredDirs = [
            'logs',
            'pids',
            'reports',
            'config'
        ];

        // Optional files
        const optionalFiles = [
            'simple-monitor.js',
            'simple-command-tester.js',
            '.env',
            '.gitignore'
        ];

        // Check required files
        for (const file of requiredFiles) {
            const filePath = path.join(this.scriptDir, file);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                this.log('success', `Required file: ${file} (${stats.size} bytes)`);
            } else {
                this.log('error', `Required file missing: ${file}`);
            }
        }

        // Check required directories
        for (const dir of requiredDirs) {
            const dirPath = path.join(this.scriptDir, dir);
            if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
                const files = fs.readdirSync(dirPath);
                this.log('success', `Required directory: ${dir} (${files.length} files)`);
            } else {
                this.log('error', `Required directory missing: ${dir}`);
            }
        }

        // Check optional files
        for (const file of optionalFiles) {
            const filePath = path.join(this.scriptDir, file);
            if (fs.existsSync(filePath)) {
                this.log('success', `Optional file: ${file}`);
            } else {
                this.log('warning', `Optional file missing: ${file}`);
            }
        }

        // Check external directories
        if (fs.existsSync(this.serverDir)) {
            this.log('success', `Server directory found: ${this.serverDir}`);

            // Check Go server binary
            const serverBinary = path.join(this.serverDir, 'remoteclaude-server');
            if (fs.existsSync(serverBinary)) {
                this.log('success', 'Go server binary found');
            } else {
                this.log('warning', 'Go server binary not found');
            }
        } else {
            this.log('warning', `Server directory not found: ${this.serverDir}`);
        }

        if (fs.existsSync(this.expoDir)) {
            this.log('success', `Expo app directory found: ${this.expoDir}`);
        } else {
            this.log('warning', `Expo app directory not found: ${this.expoDir}`);
        }
    }

    async validatePackageJson() {
        this.log('header', 'Package.json Validation');

        const packagePath = path.join(this.scriptDir, 'package.json');

        try {
            const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

            // Basic package.json structure
            const requiredFields = ['name', 'version', 'description', 'scripts', 'dependencies'];
            for (const field of requiredFields) {
                if (packageContent[field]) {
                    this.log('success', `package.json field: ${field}`);
                } else {
                    this.log('error', `package.json missing field: ${field}`);
                }
            }

            // Dependencies check
            if (packageContent.dependencies) {
                const depCount = Object.keys(packageContent.dependencies).length;
                this.log('success', `Production dependencies: ${depCount}`);

                // Check critical dependencies
                const criticalDeps = ['express', 'ws', 'axios'];
                for (const dep of criticalDeps) {
                    if (packageContent.dependencies[dep]) {
                        this.log('success', `Critical dependency: ${dep} v${packageContent.dependencies[dep]}`);
                    } else {
                        this.log('error', `Missing critical dependency: ${dep}`);
                    }
                }
            }

            if (packageContent.devDependencies) {
                const devDepCount = Object.keys(packageContent.devDependencies).length;
                this.log('success', `Development dependencies: ${devDepCount}`);
            }

            // Scripts check
            if (packageContent.scripts) {
                const scriptCount = Object.keys(packageContent.scripts).length;
                this.log('success', `npm scripts: ${scriptCount}`);

                const importantScripts = ['test', 'start', 'stop'];
                for (const script of importantScripts) {
                    if (packageContent.scripts[script]) {
                        this.log('success', `Script available: ${script}`);
                    } else {
                        this.log('warning', `Script missing: ${script}`);
                    }
                }
            }

        } catch (error) {
            this.log('error', 'Failed to parse package.json', error.message);
        }
    }

    async validateNodeModules() {
        this.log('header', 'Node Modules Validation');

        const nodeModulesPath = path.join(this.scriptDir, 'node_modules');

        if (fs.existsSync(nodeModulesPath)) {
            try {
                const modules = fs.readdirSync(nodeModulesPath);
                const moduleCount = modules.filter(m => !m.startsWith('.')).length;
                this.log('success', `Node modules installed: ${moduleCount} packages`);

                // Check for critical modules
                const criticalModules = ['express', 'ws', 'axios', 'cors'];
                for (const module of criticalModules) {
                    const modulePath = path.join(nodeModulesPath, module);
                    if (fs.existsSync(modulePath)) {
                        this.log('success', `Critical module found: ${module}`);
                    } else {
                        this.log('error', `Critical module missing: ${module}`);
                    }
                }

                // Check package-lock.json
                const lockPath = path.join(this.scriptDir, 'package-lock.json');
                if (fs.existsSync(lockPath)) {
                    this.log('success', 'package-lock.json found');
                } else {
                    this.log('warning', 'package-lock.json missing');
                }

            } catch (error) {
                this.log('error', 'Failed to read node_modules', error.message);
            }
        } else {
            this.log('error', 'node_modules directory not found - run npm install');
        }
    }

    async validateConfigurations() {
        this.log('header', 'Configuration Files Validation');

        // Environment configuration
        const envConfigPath = path.join(this.scriptDir, 'config', 'environment.json');
        if (fs.existsSync(envConfigPath)) {
            try {
                const envConfig = JSON.parse(fs.readFileSync(envConfigPath, 'utf8'));
                this.log('success', 'Environment configuration found');

                if (envConfig.servers) {
                    const serverCount = Object.keys(envConfig.servers).length;
                    this.log('success', `Server configurations: ${serverCount}`);
                }
            } catch (error) {
                this.log('error', 'Failed to parse environment.json', error.message);
            }
        } else {
            this.log('warning', 'Environment configuration missing');
        }

        // Script configuration
        const scriptConfigPath = path.join(this.scriptDir, 'config', 'scripts.json');
        if (fs.existsSync(scriptConfigPath)) {
            try {
                const scriptConfig = JSON.parse(fs.readFileSync(scriptConfigPath, 'utf8'));
                this.log('success', 'Script configuration found');
            } catch (error) {
                this.log('error', 'Failed to parse scripts.json', error.message);
            }
        } else {
            this.log('warning', 'Script configuration missing');
        }

        // .env file
        const envPath = path.join(this.scriptDir, '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const envLines = envContent.split('\n').filter(line => line.includes('='));
            this.log('success', `Environment variables: ${envLines.length} defined`);
        } else {
            this.log('warning', '.env file missing');
        }
    }

    async validateScriptPermissions() {
        this.log('header', 'Script Permissions Validation');

        const scripts = [
            'setup.sh',
            'start-servers.sh',
            'stop-servers.sh',
            'install-dependencies.sh'
        ];

        for (const script of scripts) {
            const scriptPath = path.join(this.scriptDir, script);
            if (fs.existsSync(scriptPath)) {
                try {
                    fs.accessSync(scriptPath, fs.constants.F_OK | fs.constants.R_OK);

                    const stats = fs.statSync(scriptPath);
                    const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;

                    if (isExecutable) {
                        this.log('success', `Script executable: ${script}`);
                    } else {
                        this.log('warning', `Script not executable: ${script} (run chmod +x)`);
                    }
                } catch (error) {
                    this.log('error', `Script access error: ${script}`, error.message);
                }
            } else {
                this.log('error', `Script missing: ${script}`);
            }
        }
    }

    async validatePorts() {
        this.log('header', 'Port Availability Check');

        const { execSync } = require('child_process');
        const ports = [8080, 8081, 8082, 8090, 8091, 3001, 3002, 3004, 3005];

        for (const port of ports) {
            try {
                // macOS/Linux用のlsofコマンド
                const result = execSync(`lsof -i :${port}`, { encoding: 'utf8', timeout: 2000 });
                if (result.trim()) {
                    this.log('warning', `Port ${port}: In use`);
                } else {
                    this.log('success', `Port ${port}: Available`);
                }
            } catch (error) {
                // lsofがエラーを返す場合はポートが空いている
                this.log('success', `Port ${port}: Available`);
            }
        }
    }

    async checkDiskSpace() {
        this.log('header', 'Disk Space Check');

        try {
            const stats = fs.statSync(this.scriptDir);

            // ディスク使用量計算（概算）
            const calculateSize = (dirPath) => {
                let totalSize = 0;
                try {
                    const files = fs.readdirSync(dirPath);
                    for (const file of files) {
                        const filePath = path.join(dirPath, file);
                        const stat = fs.statSync(filePath);
                        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                            totalSize += calculateSize(filePath);
                        } else if (stat.isFile()) {
                            totalSize += stat.size;
                        }
                    }
                } catch (error) {
                    // アクセスエラーは無視
                }
                return totalSize;
            };

            const projectSize = calculateSize(this.scriptDir);
            const projectSizeMB = Math.round(projectSize / 1024 / 1024);

            this.log('success', `Project size: ${projectSizeMB} MB`);

            // node_modules のサイズ
            const nodeModulesPath = path.join(this.scriptDir, 'node_modules');
            if (fs.existsSync(nodeModulesPath)) {
                const nodeModulesSize = calculateSize(nodeModulesPath);
                const nodeModulesSizeMB = Math.round(nodeModulesSize / 1024 / 1024);
                this.log('info', `node_modules size: ${nodeModulesSizeMB} MB`);
            }

            // 利用可能スペース（概算）
            const freeSpaceGB = Math.round(os.freemem() / 1024 / 1024 / 1024);
            this.log('info', `Available memory: ${freeSpaceGB} GB`);

        } catch (error) {
            this.log('warning', 'Disk space check failed', error.message);
        }
    }

    generateReport() {
        this.log('header', 'Validation Report Generation');

        const report = {
            timestamp: new Date().toISOString(),
            environment: 'gui_apptesting',
            validation_results: {
                total_checks: this.results.passed + this.results.failed + this.results.warnings,
                passed: this.results.passed,
                failed: this.results.failed,
                warnings: this.results.warnings,
                success_rate: Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)
            },
            details: this.results.details,
            recommendations: this.generateRecommendations()
        };

        // JSONレポート保存
        const reportPath = path.join(this.scriptDir, 'reports', 'environment-validation.json');
        try {
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            this.log('success', `Validation report saved: ${reportPath}`);
        } catch (error) {
            this.log('error', 'Failed to save validation report', error.message);
        }

        return report;
    }

    generateRecommendations() {
        const recommendations = [];

        if (this.results.failed > 0) {
            recommendations.push('🔴 Critical issues found - please address failed validations');
        }

        if (this.results.warnings > 5) {
            recommendations.push('🟡 Multiple warnings detected - consider addressing for better stability');
        }

        const successRate = Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100);
        if (successRate >= 90) {
            recommendations.push('🟢 Excellent validation score - environment is well configured');
        } else if (successRate >= 70) {
            recommendations.push('🟡 Good validation score - minor improvements recommended');
        } else {
            recommendations.push('🔴 Low validation score - significant setup issues detected');
        }

        if (this.results.details.some(d => d.message.includes('node_modules'))) {
            recommendations.push('📦 Ensure all dependencies are properly installed');
        }

        return recommendations;
    }

    async run() {
        console.log(`${colors.blue}================================================================================================${colors.reset}`);
        console.log(`${colors.cyan}🔍 RemoteClaude v3.7.1 - Environment Validation Script${colors.reset}`);
        console.log(`${colors.blue}================================================================================================${colors.reset}`);

        try {
            await this.checkSystemRequirements();
            await this.validateProjectStructure();
            await this.validatePackageJson();
            await this.validateNodeModules();
            await this.validateConfigurations();
            await this.validateScriptPermissions();
            await this.validatePorts();
            await this.checkDiskSpace();

            const report = this.generateReport();

            console.log('');
            console.log(`${colors.purple}📊 Validation Summary${colors.reset}`);
            console.log(`${colors.blue}────────────────────────────────────────────────────────────────────────────${colors.reset}`);
            console.log(`${colors.green}✅ Passed: ${this.results.passed}${colors.reset}`);
            console.log(`${colors.red}❌ Failed: ${this.results.failed}${colors.reset}`);
            console.log(`${colors.yellow}⚠️  Warnings: ${this.results.warnings}${colors.reset}`);
            console.log(`${colors.cyan}🎯 Success Rate: ${report.validation_results.success_rate}%${colors.reset}`);

            console.log('');
            console.log(`${colors.purple}💡 Recommendations${colors.reset}`);
            for (const rec of report.recommendations) {
                console.log(`   ${rec}`);
            }

            console.log('');
            if (this.results.failed === 0) {
                console.log(`${colors.green}🎉 Environment validation completed successfully!${colors.reset}`);
            } else {
                console.log(`${colors.yellow}⚠️  Environment validation completed with issues${colors.reset}`);
            }
            console.log(`${colors.blue}================================================================================================${colors.reset}`);

            return this.results.failed === 0;

        } catch (error) {
            this.log('error', 'Validation process failed', error.message);
            return false;
        }
    }
}

// メイン実行
if (require.main === module) {
    const validator = new EnvironmentValidator();
    validator.run().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error(`${colors.red}❌ Validation script crashed: ${error.message}${colors.reset}`);
        process.exit(1);
    });
}

module.exports = EnvironmentValidator;