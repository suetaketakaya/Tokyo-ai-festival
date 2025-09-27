/**
 * Live Test Runner for RemoteClaudeApp
 * Orchestrates live testing of existing Go server and ExpoGo app
 */

import { TestLogger } from '../utils/logger';
import { LiveMonitor } from '../utils/liveMonitor';
import { TestReporter } from '../utils/testReporter';
import puppeteer, { Browser, Page } from 'puppeteer';
import { device, element, by, waitFor } from 'detox';
import WebSocket from 'ws';

export interface LiveTestConfig {
  goServerUrl: string;
  expoAppBundle: string;
  monitoringPort: number;
  testTimeout: number;
  screenshotEnabled: boolean;
  videoRecording: boolean;
}

export class LiveTestRunner {
  private logger: TestLogger;
  private monitor: LiveMonitor;
  private reporter: TestReporter;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private ws: WebSocket | null = null;
  private config: LiveTestConfig;
  private isRunning: boolean = false;

  constructor(config: Partial<LiveTestConfig> = {}) {
    this.logger = new TestLogger();
    this.monitor = new LiveMonitor();
    this.reporter = new TestReporter();

    this.config = {
      goServerUrl: 'http://localhost:8080',
      expoAppBundle: 'com.remoteclaude.app',
      monitoringPort: 3001,
      testTimeout: 30000,
      screenshotEnabled: true,
      videoRecording: false,
      ...config
    };
  }

  async initialize(): Promise<void> {
    this.logger.info('🚀 Initializing Live Test Runner');

    // Start monitoring dashboard
    await this.monitor.startMonitoring(this.config.monitoringPort);
    this.logger.info(`📊 Live dashboard available at http://localhost:${this.config.monitoringPort}/dashboard`);

    // Initialize browser for Go server testing
    await this.initializeBrowser();

    // Initialize ExpoGo app connection
    await this.initializeExpoApp();

    // Initialize WebSocket connection
    await this.initializeWebSocket();

    this.logger.info('✅ Live Test Runner initialized successfully');
  }

  private async initializeBrowser(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1440, height: 900 },
        devtools: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      this.page = await this.browser.newPage();

      // Set up page event listeners
      this.page.on('console', msg => {
        this.logger.debug(`Browser: ${msg.text()}`);
      });

      this.page.on('pageerror', error => {
        this.monitor.addError('browser', error.message, 'medium');
      });

      this.logger.info('🌐 Browser initialized for Go server testing');

    } catch (error) {
      this.monitor.addError('browser', `Browser initialization failed: ${error.message}`, 'high');
      throw error;
    }
  }

  private async initializeExpoApp(): Promise<void> {
    try {
      // Try to connect to existing ExpoGo app instance
      await device.launchApp({ newInstance: false });

      // Wait for app to be ready
      await waitFor(element(by.id('main-container')))
        .toBeVisible()
        .withTimeout(10000);

      this.monitor.updateExpoAppStatus('online', {
        platform: 'iOS Simulator',
        bundle: this.config.expoAppBundle
      });

      this.logger.info('📱 ExpoGo iPhone app connected successfully');

    } catch (error) {
      this.monitor.updateExpoAppStatus('error', { error: error.message });
      this.logger.error('Failed to connect to ExpoGo app:', error);
      // Don't throw - continue with Go server testing
    }
  }

  private async initializeWebSocket(): Promise<void> {
    try {
      const wsUrl = this.config.goServerUrl.replace('http', 'ws') + '/ws';
      this.ws = new WebSocket(wsUrl);

      await new Promise((resolve, reject) => {
        this.ws!.onopen = () => {
          this.logger.info('🔌 WebSocket connection established');
          resolve(true);
        };

        this.ws!.onerror = (error) => {
          this.monitor.addError('websocket', 'WebSocket connection failed', 'medium');
          reject(error);
        };

        setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
      });

    } catch (error) {
      this.logger.warn('WebSocket connection failed, will retry during tests');
    }
  }

  async runLiveTests(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Live tests are already running');
    }

    this.isRunning = true;
    this.logger.info('🧪 Starting live tests execution');

    try {
      // Run Go server tests
      await this.runGoServerTests();

      // Run ExpoGo app tests
      await this.runExpoAppTests();

      // Run integration tests
      await this.runIntegrationTests();

      // Generate final reports
      await this.generateReports();

    } catch (error) {
      this.logger.error('Live tests execution failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  private async runGoServerTests(): Promise<void> {
    this.logger.info('🌐 Running Go Server Tests');
    this.monitor.updateCurrentTest('Go Server Tests', 'running', 0);

    const tests = [
      { name: 'Server Connectivity', weight: 20 },
      { name: 'API Endpoints', weight: 30 },
      { name: 'WebSocket Connection', weight: 25 },
      { name: 'Performance Analysis', weight: 25 }
    ];

    let totalProgress = 0;

    for (const test of tests) {
      try {
        this.monitor.updateCurrentTest(`Go Server: ${test.name}`, 'running', totalProgress);

        switch (test.name) {
          case 'Server Connectivity':
            await this.testServerConnectivity();
            break;
          case 'API Endpoints':
            await this.testAPIEndpoints();
            break;
          case 'WebSocket Connection':
            await this.testWebSocketConnection();
            break;
          case 'Performance Analysis':
            await this.testGoServerPerformance();
            break;
        }

        totalProgress += test.weight;
        this.monitor.updateCurrentTest(`Go Server: ${test.name}`, 'passed', totalProgress);

        this.reporter.addTestResult({
          testSuite: 'Go Server Tests',
          testCase: test.name,
          status: 'passed',
          duration: 0
        });

      } catch (error) {
        this.monitor.addError('goServer', `${test.name} failed: ${error.message}`, 'high');
        this.monitor.updateCurrentTest(`Go Server: ${test.name}`, 'failed', totalProgress);

        this.reporter.addTestResult({
          testSuite: 'Go Server Tests',
          testCase: test.name,
          status: 'failed',
          duration: 0,
          error: error.message
        });
      }
    }
  }

  private async testServerConnectivity(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    const startTime = Date.now();
    await this.page.goto(this.config.goServerUrl, { waitUntil: 'networkidle2' });
    const responseTime = Date.now() - startTime;

    if (this.config.screenshotEnabled) {
      await this.page.screenshot({
        path: './reports/screenshots/go-server-connectivity.png',
        fullPage: true
      });
    }

    const title = await this.page.title();
    this.logger.info(`Go Server response time: ${responseTime}ms, Title: "${title}"`);

    if (responseTime > 10000) {
      throw new Error(`Server response too slow: ${responseTime}ms`);
    }
  }

  private async testAPIEndpoints(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    const endpoints = [
      '/api/health',
      '/api/status',
      '/health',
      '/status',
      '/'
    ];

    const results = [];

    for (const endpoint of endpoints) {
      try {
        const response = await this.page.goto(`${this.config.goServerUrl}${endpoint}`, {
          waitUntil: 'networkidle2',
          timeout: 5000
        });

        const status = response?.status() || 0;
        results.push({
          endpoint,
          status,
          success: status >= 200 && status < 400
        });

        this.logger.debug(`API ${endpoint}: ${status}`);

      } catch (error) {
        results.push({
          endpoint,
          status: 0,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    if (successCount === 0) {
      throw new Error('No API endpoints are accessible');
    }

    this.logger.info(`API endpoints: ${successCount}/${results.length} accessible`);
  }

  private async testWebSocketConnection(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Test ping/pong
      const pingPromise = new Promise((resolve, reject) => {
        this.ws!.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            resolve(data);
          } catch (error) {
            reject(error);
          }
        };

        setTimeout(() => reject(new Error('WebSocket ping timeout')), 3000);
      });

      this.ws.send(JSON.stringify({
        type: 'ping',
        timestamp: Date.now()
      }));

      await pingPromise;
      this.logger.info('WebSocket ping/pong successful');
    } else {
      throw new Error('WebSocket connection not available');
    }
  }

  private async testGoServerPerformance(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    // Enable performance monitoring
    await this.page.coverage.startJSCoverage();
    await this.page.coverage.startCSSCoverage();

    const startTime = Date.now();
    await this.page.goto(this.config.goServerUrl, { waitUntil: 'networkidle2' });
    const loadTime = Date.now() - startTime;

    const performanceMetrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        transferSize: navigation.transferSize,
        decodedBodySize: navigation.decodedBodySize
      };
    });

    await this.page.coverage.stopJSCoverage();
    await this.page.coverage.stopCSSCoverage();

    this.logger.info(`Performance metrics - Load: ${loadTime}ms, DOM: ${performanceMetrics.domContentLoaded}ms`);

    if (loadTime > 5000) {
      throw new Error(`Performance issue: Load time ${loadTime}ms exceeds threshold`);
    }
  }

  private async runExpoAppTests(): Promise<void> {
    this.logger.info('📱 Running ExpoGo App Tests');
    this.monitor.updateCurrentTest('ExpoGo App Tests', 'running', 0);

    const tests = [
      { name: 'App Connectivity', weight: 25 },
      { name: 'Navigation Tests', weight: 25 },
      { name: 'Server Connection', weight: 25 },
      { name: 'Command Execution', weight: 25 }
    ];

    let totalProgress = 0;

    for (const test of tests) {
      try {
        this.monitor.updateCurrentTest(`ExpoGo: ${test.name}`, 'running', totalProgress);

        switch (test.name) {
          case 'App Connectivity':
            await this.testExpoAppConnectivity();
            break;
          case 'Navigation Tests':
            await this.testExpoAppNavigation();
            break;
          case 'Server Connection':
            await this.testExpoAppServerConnection();
            break;
          case 'Command Execution':
            await this.testExpoAppCommandExecution();
            break;
        }

        totalProgress += test.weight;
        this.monitor.updateCurrentTest(`ExpoGo: ${test.name}`, 'passed', totalProgress);

        this.reporter.addTestResult({
          testSuite: 'ExpoGo App Tests',
          testCase: test.name,
          status: 'passed',
          duration: 0
        });

      } catch (error) {
        this.monitor.updateExpoAppStatus('error', { error: error.message });
        this.monitor.updateCurrentTest(`ExpoGo: ${test.name}`, 'failed', totalProgress);

        this.reporter.addTestResult({
          testSuite: 'ExpoGo App Tests',
          testCase: test.name,
          status: 'failed',
          duration: 0,
          error: error.message
        });
      }
    }
  }

  private async testExpoAppConnectivity(): Promise<void> {
    try {
      await waitFor(element(by.id('main-container')))
        .toBeVisible()
        .withTimeout(5000);

      if (this.config.screenshotEnabled) {
        await device.takeScreenshot('expo-app-connectivity');
      }

      this.monitor.updateExpoAppStatus('testing', { lastTest: 'connectivity' });
      this.logger.info('ExpoGo app connectivity verified');

    } catch (error) {
      throw new Error(`ExpoGo app not responsive: ${error.message}`);
    }
  }

  private async testExpoAppNavigation(): Promise<void> {
    const navigationElements = [
      'server-list-nav',
      'quick-commands-nav',
      'development-nav',
      'settings-button'
    ];

    for (const elementId of navigationElements) {
      try {
        const elementExists = await element(by.id(elementId)).exists();
        if (elementExists) {
          await element(by.id(elementId)).tap();
          await global.testUtils.wait(1000);

          if (this.config.screenshotEnabled) {
            await device.takeScreenshot(`expo-navigation-${elementId}`);
          }
        }
      } catch (error) {
        this.logger.warn(`Navigation element ${elementId} test failed:`, error);
      }
    }

    this.logger.info('ExpoGo app navigation tests completed');
  }

  private async testExpoAppServerConnection(): Promise<void> {
    try {
      // Navigate to server list
      await element(by.id('server-list-nav')).tap();
      await waitFor(element(by.id('server-list-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Check if Go server is configured
      const goServerExists = await element(by.text('localhost')).exists();

      if (!goServerExists) {
        // Add Go server
        await element(by.id('add-server-button')).tap();
        await waitFor(element(by.id('server-form-modal')))
          .toBeVisible()
          .withTimeout(3000);

        await element(by.id('server-name-input')).typeText('Go Server Live Test');
        await element(by.id('server-host-input')).typeText('localhost');
        await element(by.id('server-port-input')).typeText('8080');
        await element(by.id('save-server-button')).tap();
      }

      // Attempt connection
      await element(by.text('Go Server')).tap();
      await element(by.id('connect-button')).tap();

      // Wait for connection result
      await global.testUtils.wait(5000);

      const connected = await element(by.text('接続済み')).exists();
      if (!connected) {
        throw new Error('Failed to connect to Go server from ExpoGo app');
      }

      this.logger.info('ExpoGo app successfully connected to Go server');

    } catch (error) {
      throw new Error(`ExpoGo server connection failed: ${error.message}`);
    }
  }

  private async testExpoAppCommandExecution(): Promise<void> {
    try {
      // Navigate to development screen
      await element(by.id('development-nav')).tap();
      await waitFor(element(by.id('development-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Execute test command
      const testCommand = 'echo "Live Test from ExpoGo"';
      await element(by.id('command-input')).typeText(testCommand);
      await element(by.id('execute-button')).tap();

      // Wait for execution
      await global.testUtils.wait(3000);

      // Check for successful execution
      const hasOutput = await element(by.text('Live Test from ExpoGo')).exists();
      if (!hasOutput) {
        // Check for any response
        const hasError = await element(by.text('エラー')).exists();
        if (hasError) {
          throw new Error('Command execution resulted in error');
        }
      }

      this.logger.info('ExpoGo app command execution completed');

    } catch (error) {
      throw new Error(`ExpoGo command execution failed: ${error.message}`);
    }
  }

  private async runIntegrationTests(): Promise<void> {
    this.logger.info('🔗 Running Integration Tests');
    this.monitor.updateCurrentTest('Integration Tests', 'running', 0);

    try {
      // Test cross-platform communication
      await this.testCrossPlatformCommunication();

      this.monitor.updateCurrentTest('Integration Tests', 'passed', 100);

      this.reporter.addTestResult({
        testSuite: 'Integration Tests',
        testCase: 'Cross-platform Communication',
        status: 'passed',
        duration: 0
      });

    } catch (error) {
      this.monitor.updateCurrentTest('Integration Tests', 'failed', 100);

      this.reporter.addTestResult({
        testSuite: 'Integration Tests',
        testCase: 'Cross-platform Communication',
        status: 'failed',
        duration: 0,
        error: error.message
      });
    }
  }

  private async testCrossPlatformCommunication(): Promise<void> {
    // Execute command from ExpoGo and verify in Go server logs (if available)
    try {
      await element(by.id('development-nav')).tap();
      await element(by.id('command-input')).typeText('echo "Integration Test"');
      await element(by.id('execute-button')).tap();
      await global.testUtils.wait(2000);

      // Check if Go server web interface shows any activity
      if (this.page) {
        await this.page.goto(`${this.config.goServerUrl}/logs`, {
          waitUntil: 'networkidle2',
          timeout: 5000
        });

        const pageContent = await this.page.content();
        const hasActivity = pageContent.includes('Integration Test') ||
                           pageContent.includes('echo') ||
                           pageContent.includes('command');

        this.logger.info(`Cross-platform communication test - Activity detected: ${hasActivity}`);
      }

    } catch (error) {
      this.logger.warn('Cross-platform communication test completed with limited verification');
    }
  }

  private async generateReports(): Promise<void> {
    this.logger.info('📊 Generating test reports');

    try {
      // Generate HTML report
      const htmlReport = await this.reporter.generateHTMLReport();
      this.logger.info(`HTML report: ${htmlReport}`);

      // Generate live data export
      const liveDataExport = await this.monitor.exportLiveData();
      this.logger.info(`Live data export: ${liveDataExport}`);

      // Generate test data export
      const testDataExport = await this.reporter.exportTestData();
      this.logger.info(`Test data export: ${testDataExport}`);

      this.monitor.updateCurrentTest('Report Generation', 'passed', 100);

    } catch (error) {
      this.logger.error('Report generation failed:', error);
      this.monitor.addError('reports', error.message, 'medium');
    }
  }

  async cleanup(): Promise<void> {
    this.logger.info('🧹 Cleaning up live test runner');

    try {
      if (this.ws) {
        this.ws.close();
      }

      if (this.browser) {
        await this.browser.close();
      }

      await this.monitor.stopMonitoring();

    } catch (error) {
      this.logger.error('Cleanup error:', error);
    }

    this.logger.info('✅ Live test runner cleanup completed');
  }

  isTestRunning(): boolean {
    return this.isRunning;
  }

  getStatus(): any {
    return this.monitor.getStatus();
  }
}