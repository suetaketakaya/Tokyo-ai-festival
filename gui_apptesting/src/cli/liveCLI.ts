#!/usr/bin/env node

/**
 * CLI Tool for Live GUI Testing
 * Command-line interface for running live tests on existing environment
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { LiveTestRunner } from '../runner/liveTestRunner';
import { TestLogger } from '../utils/logger';
import fs from 'fs-extra';
import path from 'path';

const program = new Command();
const logger = new TestLogger();

program
  .name('live-gui-test')
  .description('Live GUI Testing Tool for RemoteClaudeApp')
  .version('1.0.0');

program
  .command('run')
  .description('Run live tests on existing Go server and ExpoGo app')
  .option('-s, --server <url>', 'Go server URL', 'http://localhost:8080')
  .option('-p, --port <port>', 'Monitoring dashboard port', '3001')
  .option('-t, --timeout <ms>', 'Test timeout in milliseconds', '30000')
  .option('--no-screenshots', 'Disable screenshot capture')
  .option('--headless', 'Run browser in headless mode')
  .option('-c, --config <file>', 'Load configuration from file')
  .action(async (options) => {
    console.log(chalk.blue.bold('🧪 RemoteClaudeApp Live GUI Testing'));
    console.log(chalk.gray('Testing existing Go server and ExpoGo iPhone app\n'));

    let config = {
      goServerUrl: options.server,
      monitoringPort: parseInt(options.port),
      testTimeout: parseInt(options.timeout),
      screenshotEnabled: options.screenshots,
      headless: options.headless
    };

    // Load config file if specified
    if (options.config) {
      try {
        const configFile = await fs.readJSON(options.config);
        config = { ...config, ...configFile };
        console.log(chalk.green(`✅ Configuration loaded from ${options.config}`));
      } catch (error) {
        console.log(chalk.red(`❌ Failed to load config file: ${error.message}`));
        process.exit(1);
      }
    }

    const spinner = ora('Initializing live test environment...').start();

    try {
      const runner = new LiveTestRunner(config);

      // Initialize test environment
      await runner.initialize();
      spinner.succeed('Live test environment initialized');

      console.log(chalk.cyan(`📊 Live dashboard: http://localhost:${config.monitoringPort}/dashboard`));
      console.log(chalk.cyan(`🌐 Testing Go server: ${config.goServerUrl}`));
      console.log(chalk.cyan(`📱 Testing ExpoGo app on iPhone Simulator\n`));

      // Ask user if they want to proceed
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Ready to start live testing. Continue?',
          default: true
        }
      ]);

      if (!proceed) {
        console.log(chalk.yellow('🛑 Live testing cancelled by user'));
        await runner.cleanup();
        process.exit(0);
      }

      // Run live tests
      spinner.start('Running live tests...');
      await runner.runLiveTests();
      spinner.succeed('Live tests completed');

      console.log(chalk.green.bold('\n✅ Live testing completed successfully!'));
      console.log(chalk.cyan('📊 Check the dashboard for detailed results'));
      console.log(chalk.cyan('📁 Reports saved in ./reports/ directory'));

      // Ask if user wants to keep dashboard running
      const { keepDashboard } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'keepDashboard',
          message: 'Keep live dashboard running?',
          default: false
        }
      ]);

      if (!keepDashboard) {
        await runner.cleanup();
      } else {
        console.log(chalk.cyan('\n📊 Dashboard will continue running...'));
        console.log(chalk.gray('Press Ctrl+C to stop'));

        // Keep process alive
        process.on('SIGINT', async () => {
          console.log(chalk.yellow('\n🛑 Stopping live dashboard...'));
          await runner.cleanup();
          process.exit(0);
        });
      }

    } catch (error) {
      spinner.fail('Live testing failed');
      console.log(chalk.red(`❌ Error: ${error.message}`));
      console.log(chalk.gray('\nTroubleshooting:'));
      console.log(chalk.gray('- Ensure Go server is running on localhost:8080'));
      console.log(chalk.gray('- Ensure ExpoGo app is running in iPhone Simulator'));
      console.log(chalk.gray('- Check network connectivity'));
      process.exit(1);
    }
  });

program
  .command('monitor')
  .description('Start monitoring dashboard only')
  .option('-p, --port <port>', 'Dashboard port', '3001')
  .action(async (options) => {
    console.log(chalk.blue.bold('📊 RemoteClaudeApp Live Monitor'));

    const spinner = ora('Starting monitoring dashboard...').start();

    try {
      const { LiveMonitor } = await import('../utils/liveMonitor');
      const monitor = new LiveMonitor();

      await monitor.startMonitoring(parseInt(options.port));
      spinner.succeed('Monitoring dashboard started');

      console.log(chalk.cyan(`📊 Dashboard: http://localhost:${options.port}/dashboard`));
      console.log(chalk.gray('Press Ctrl+C to stop'));

      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n🛑 Stopping monitor...'));
        await monitor.stopMonitoring();
        process.exit(0);
      });

    } catch (error) {
      spinner.fail('Failed to start monitor');
      console.log(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('check')
  .description('Check environment readiness')
  .option('-s, --server <url>', 'Go server URL', 'http://localhost:8080')
  .action(async (options) => {
    console.log(chalk.blue.bold('🔍 Environment Check'));

    const checks = [
      { name: 'Go Server Connectivity', test: () => checkGoServer(options.server) },
      { name: 'ExpoGo App Availability', test: () => checkExpoApp() },
      { name: 'WebSocket Connectivity', test: () => checkWebSocket(options.server) },
      { name: 'Test Dependencies', test: () => checkDependencies() }
    ];

    const results = [];

    for (const check of checks) {
      const spinner = ora(`Checking ${check.name}...`).start();

      try {
        const result = await check.test();
        spinner.succeed(`${check.name}: ${result.message}`);
        results.push({ ...check, status: 'pass', result });
      } catch (error) {
        spinner.fail(`${check.name}: ${error.message}`);
        results.push({ ...check, status: 'fail', error });
      }
    }

    console.log(chalk.blue.bold('\n📋 Environment Check Summary:'));
    const passCount = results.filter(r => r.status === 'pass').length;
    const failCount = results.filter(r => r.status === 'fail').length;

    console.log(chalk.green(`✅ Passed: ${passCount}`));
    console.log(chalk.red(`❌ Failed: ${failCount}`));

    if (failCount > 0) {
      console.log(chalk.yellow('\n⚠️  Issues found:'));
      results.filter(r => r.status === 'fail').forEach(result => {
        console.log(chalk.red(`  • ${result.name}: ${result.error.message}`));
      });

      console.log(chalk.gray('\nRecommendations:'));
      console.log(chalk.gray('- Start Go server: go run main.go'));
      console.log(chalk.gray('- Open ExpoGo app in iPhone Simulator'));
      console.log(chalk.gray('- Check firewall settings'));
    } else {
      console.log(chalk.green.bold('\n🎉 Environment is ready for live testing!'));
    }
  });

program
  .command('report')
  .description('Generate test reports')
  .option('-f, --format <format>', 'Report format (html|json|junit)', 'html')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    console.log(chalk.blue.bold('📊 Generating Test Reports'));

    const spinner = ora('Generating reports...').start();

    try {
      const { TestReporter } = await import('../utils/testReporter');
      const reporter = new TestReporter();

      let reportPath: string;

      switch (options.format.toLowerCase()) {
        case 'html':
          reportPath = await reporter.generateHTMLReport();
          break;
        case 'json':
          reportPath = await reporter.exportTestData();
          break;
        case 'junit':
          reportPath = await reporter.generateJUnitReport();
          break;
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      if (options.output) {
        await fs.copy(reportPath, options.output);
        reportPath = options.output;
      }

      spinner.succeed(`Report generated: ${reportPath}`);
      console.log(chalk.cyan(`📄 Report saved to: ${reportPath}`));

    } catch (error) {
      spinner.fail('Report generation failed');
      console.log(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Generate configuration file')
  .option('-o, --output <file>', 'Output file path', './live-test-config.json')
  .action(async (options) => {
    console.log(chalk.blue.bold('⚙️  Configuration Generator'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'goServerUrl',
        message: 'Go server URL:',
        default: 'http://localhost:8080'
      },
      {
        type: 'number',
        name: 'monitoringPort',
        message: 'Monitoring dashboard port:',
        default: 3001
      },
      {
        type: 'number',
        name: 'testTimeout',
        message: 'Test timeout (ms):',
        default: 30000
      },
      {
        type: 'confirm',
        name: 'screenshotEnabled',
        message: 'Enable screenshots?',
        default: true
      },
      {
        type: 'confirm',
        name: 'videoRecording',
        message: 'Enable video recording?',
        default: false
      }
    ]);

    const config = {
      ...answers,
      expoAppBundle: 'com.remoteclaude.app',
      headless: false
    };

    await fs.writeJSON(options.output, config, { spaces: 2 });

    console.log(chalk.green(`✅ Configuration saved to: ${options.output}`));
    console.log(chalk.cyan('Use with: live-gui-test run --config ' + options.output));
  });

// Helper functions for environment checks
async function checkGoServer(url: string): Promise<{ message: string }> {
  try {
    const response = await fetch(url, { method: 'GET' });
    if (response.ok) {
      return { message: `Server responding (${response.status})` };
    } else {
      throw new Error(`Server returned ${response.status}`);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Connection refused - server not running');
    }
    throw new Error(`Connection failed: ${error.message}`);
  }
}

async function checkExpoApp(): Promise<{ message: string }> {
  // This would need platform-specific implementation
  // For now, assume ExpoGo is available if we're on macOS
  if (process.platform === 'darwin') {
    return { message: 'iOS Simulator platform detected' };
  } else {
    throw new Error('iOS Simulator not available on this platform');
  }
}

async function checkWebSocket(serverUrl: string): Promise<{ message: string }> {
  return new Promise((resolve, reject) => {
    try {
      const WebSocket = require('ws');
      const wsUrl = serverUrl.replace('http', 'ws') + '/ws';
      const ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 3000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        resolve({ message: 'WebSocket connection successful' });
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(new Error('WebSocket connection failed'));
      };
    } catch (error) {
      reject(new Error('WebSocket not available'));
    }
  });
}

async function checkDependencies(): Promise<{ message: string }> {
  const requiredDeps = ['puppeteer', 'detox', 'ws'];
  const missing = [];

  for (const dep of requiredDeps) {
    try {
      require.resolve(dep);
    } catch (error) {
      missing.push(dep);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing dependencies: ${missing.join(', ')}`);
  }

  return { message: 'All dependencies available' };
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.log(chalk.red('\n❌ Unhandled error occurred:'));
  console.log(chalk.red(error.toString()));
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.log(chalk.red('\n❌ Uncaught exception:'));
  console.log(chalk.red(error.toString()));
  process.exit(1);
});

// Parse command line arguments
program.parse();

// If no command specified, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}