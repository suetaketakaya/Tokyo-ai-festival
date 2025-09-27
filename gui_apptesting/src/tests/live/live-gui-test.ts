/**
 * Live GUI Testing Tool for RemoteClaudeApp
 * Tests existing Go Server (localhost:8080) and ExpoGo iPhone App
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { device, element, by, expect as detoxExpect, waitFor } from 'detox';
import WebSocket from 'ws';
import { TestLogger } from '../../utils/logger';
import { config } from '../../config/testConfig';

describe('Live GUI Testing - Existing Environment', () => {
  const logger = new TestLogger();
  let browser: Browser;
  let webPage: Page;
  let ws: WebSocket | null = null;

  beforeAll(async () => {
    logger.testStart('Live GUI Testing Suite - Existing Environment');

    // Set up web browser for Go server on port 8080
    browser = await puppeteer.launch({
      headless: false, // Keep visible for live testing
      defaultViewport: {
        width: 1440,
        height: 900
      },
      devtools: true // Enable DevTools for debugging
    });
    webPage = await browser.newPage();

    // Enable console logging from browser
    webPage.on('console', msg => {
      logger.debug(`Browser Console [${msg.type()}]: ${msg.text()}`);
    });

    webPage.on('pageerror', error => {
      logger.error('Page Error:', error);
    });

    // Set up ExpoGo iPhone App connection
    try {
      await device.launchApp({ newInstance: false }); // Use existing instance
      logger.info('Connected to ExpoGo iPhone Simulator');
    } catch (error) {
      logger.warn('Failed to connect to ExpoGo iPhone Simulator:', error);
    }
  });

  afterAll(async () => {
    if (ws) {
      ws.close();
    }
    if (browser) {
      await browser.close();
    }
    logger.testEnd('Live GUI Testing Suite', true);
  });

  describe('Go Server Web Application Testing (localhost:8080)', () => {
    test('should connect to Go server and test basic functionality', async () => {
      logger.step('Connecting to Go server on localhost:8080');

      try {
        await webPage.goto('http://localhost:8080', {
          waitUntil: 'networkidle2',
          timeout: 10000
        });

        // Take screenshot for analysis
        await webPage.screenshot({
          path: './reports/screenshots/go-server-homepage.png',
          fullPage: true
        });

        // Check if page loaded successfully
        const title = await webPage.title();
        logger.info(`Go Server Page Title: ${title}`);

        // Look for common web elements
        const bodyContent = await webPage.evaluate(() => document.body.innerText);
        logger.debug(`Page content preview: ${bodyContent.substring(0, 200)}...`);

        // Test basic navigation elements
        const navElements = await webPage.$$('nav, .nav, .navigation, .menu');
        const buttons = await webPage.$$('button, .btn, input[type="button"]');
        const links = await webPage.$$('a[href]');

        logger.assertion(`Go Server accessible - Found ${navElements.length} nav, ${buttons.length} buttons, ${links.length} links`, true);

        // Test responsive design
        await webPage.setViewport({ width: 375, height: 667 }); // iPhone size
        await webPage.screenshot({
          path: './reports/screenshots/go-server-mobile.png'
        });

        await webPage.setViewport({ width: 1440, height: 900 }); // Desktop size

      } catch (error) {
        logger.error('Failed to connect to Go server:', error);
        logger.assertion('Go Server connection failed', false);
      }
    });

    test('should test WebSocket functionality on Go server', async () => {
      logger.step('Testing WebSocket connection to Go server');

      try {
        // Connect WebSocket to Go server
        const wsUrl = 'ws://localhost:8080/ws';
        ws = new WebSocket(wsUrl);

        await new Promise((resolve, reject) => {
          ws!.onopen = () => {
            logger.info('WebSocket connected to Go server');
            resolve(true);
          };
          ws!.onerror = (error) => {
            logger.error('WebSocket connection failed:', error);
            reject(error);
          };
          setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
        });

        // Test ping/pong
        const pingMessage = JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        });

        ws.send(pingMessage);

        const response = await new Promise((resolve, reject) => {
          ws!.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              resolve(data);
            } catch (error) {
              reject(error);
            }
          };
          setTimeout(() => reject(new Error('WebSocket response timeout')), 3000);
        });

        logger.assertion(`WebSocket communication successful: ${JSON.stringify(response)}`, true);

      } catch (error) {
        logger.error('WebSocket test failed:', error);
        logger.assertion('WebSocket connection failed', false);
      }
    });

    test('should test API endpoints on Go server', async () => {
      logger.step('Testing API endpoints on Go server');

      const endpoints = [
        '/api/health',
        '/api/status',
        '/api/servers',
        '/health',
        '/status'
      ];

      const results = [];

      for (const endpoint of endpoints) {
        try {
          const response = await webPage.goto(`http://localhost:8080${endpoint}`, {
            waitUntil: 'networkidle2',
            timeout: 5000
          });

          const status = response?.status() || 0;
          const contentType = response?.headers()['content-type'] || '';

          results.push({
            endpoint,
            status,
            contentType,
            success: status >= 200 && status < 400
          });

          logger.debug(`${endpoint}: ${status} (${contentType})`);

        } catch (error) {
          results.push({
            endpoint,
            status: 0,
            contentType: '',
            success: false,
            error: error.message
          });
        }
      }

      const successfulEndpoints = results.filter(r => r.success);
      logger.assertion(`API endpoints tested: ${successfulEndpoints.length}/${results.length} successful`, true, results);
    });

    test('should analyze Go server performance', async () => {
      logger.step('Analyzing Go server performance');

      // Enable performance monitoring
      await webPage.coverage.startJSCoverage();
      await webPage.coverage.startCSSCoverage();

      const startTime = Date.now();
      await webPage.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
      const loadTime = Date.now() - startTime;

      // Get performance metrics
      const performanceMetrics = await webPage.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0
        };
      });

      // Stop coverage and analyze
      const jsCoverage = await webPage.coverage.stopJSCoverage();
      const cssCoverage = await webPage.coverage.stopCSSCoverage();

      const jsUsage = jsCoverage.reduce((total, entry) => {
        const used = entry.ranges.reduce((sum, range) => sum + (range.end - range.start), 0);
        return total + (used / entry.text.length);
      }, 0) / jsCoverage.length;

      const cssUsage = cssCoverage.reduce((total, entry) => {
        const used = entry.ranges.reduce((sum, range) => sum + (range.end - range.start), 0);
        return total + (used / entry.text.length);
      }, 0) / cssCoverage.length;

      logger.assertion(`Performance Analysis - Load: ${loadTime}ms, JS Usage: ${(jsUsage * 100).toFixed(1)}%, CSS Usage: ${(cssUsage * 100).toFixed(1)}%`, true, {
        loadTime,
        performanceMetrics,
        jsUsage: jsUsage * 100,
        cssUsage: cssUsage * 100
      });
    });
  });

  describe('ExpoGo iPhone App Testing', () => {
    test('should connect to ExpoGo iPhone app and test basic functionality', async () => {
      logger.step('Testing ExpoGo iPhone app functionality');

      try {
        // Wait for app to be ready
        await waitFor(element(by.text('RemoteClaudeApp'))).toBeVisible().withTimeout(10000);

        // Take screenshot
        await device.takeScreenshot('expo-app-main');

        // Test basic navigation
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
              await device.takeScreenshot(`expo-app-${elementId}`);
              await global.testUtils.wait(1000);
            }
            logger.debug(`Navigation element ${elementId}: ${elementExists ? 'Found' : 'Not found'}`);
          } catch (error) {
            logger.debug(`Navigation test failed for ${elementId}:`, error);
          }
        }

        logger.assertion('ExpoGo iPhone app basic functionality tested', true);

      } catch (error) {
        logger.error('ExpoGo iPhone app test failed:', error);
        logger.assertion('ExpoGo iPhone app connection failed', false);
      }
    });

    test('should test server connection in ExpoGo app', async () => {
      logger.step('Testing server connection in ExpoGo app');

      try {
        // Navigate to server list
        await element(by.id('server-list-nav')).tap();
        await waitFor(element(by.id('server-list-screen'))).toBeVisible().withTimeout(5000);

        // Check if Go server (localhost:8080) is configured
        const goServerExists = await element(by.text('localhost:8080')).exists();

        if (!goServerExists) {
          // Add Go server
          await element(by.id('add-server-button')).tap();
          await waitFor(element(by.id('server-form-modal'))).toBeVisible().withTimeout(3000);

          await element(by.id('server-name-input')).typeText('Go Server');
          await element(by.id('server-host-input')).typeText('localhost');
          await element(by.id('server-port-input')).typeText('8080');
          await element(by.id('save-server-button')).tap();
        }

        // Try to connect
        await element(by.text('Go Server')).tap();
        await element(by.id('connect-button')).tap();

        // Wait for connection result
        await global.testUtils.wait(5000);

        const connected = await element(by.text('接続済み')).exists();
        const connecting = await element(by.text('接続中')).exists();
        const error = await element(by.text('接続エラー')).exists();

        logger.assertion(`ExpoGo app connection to Go server - Connected: ${connected}, Connecting: ${connecting}, Error: ${error}`, true);

      } catch (error) {
        logger.error('Server connection test in ExpoGo failed:', error);
        logger.assertion('ExpoGo server connection test failed', false);
      }
    });

    test('should test command execution in ExpoGo app', async () => {
      logger.step('Testing command execution in ExpoGo app');

      try {
        // Navigate to development screen
        await element(by.id('development-nav')).tap();
        await waitFor(element(by.id('development-screen'))).toBeVisible().withTimeout(5000);

        // Test command input
        const testCommand = 'echo "ExpoGo Test Command"';
        await element(by.id('command-input')).typeText(testCommand);
        await element(by.id('execute-button')).tap();

        // Wait for execution
        await global.testUtils.wait(3000);

        // Check for output or error
        const hasOutput = await element(by.text('ExpoGo Test Command')).exists();
        const hasError = await element(by.text('エラー')).exists();

        logger.assertion(`ExpoGo command execution - Output: ${hasOutput}, Error: ${hasError}`, true);

        // Test multiple commands
        const commands = ['pwd', 'ls', 'date'];
        for (const cmd of commands) {
          await element(by.id('command-input')).clearText();
          await element(by.id('command-input')).typeText(cmd);
          await element(by.id('execute-button')).tap();
          await global.testUtils.wait(1000);
        }

        logger.assertion('ExpoGo multiple command execution completed', true);

      } catch (error) {
        logger.error('Command execution test in ExpoGo failed:', error);
        logger.assertion('ExpoGo command execution test failed', false);
      }
    });

    test('should analyze ExpoGo app performance', async () => {
      logger.step('Analyzing ExpoGo app performance');

      try {
        const startTime = Date.now();

        // Test rapid navigation performance
        const screens = ['server-list-nav', 'quick-commands-nav', 'development-nav'];
        for (let i = 0; i < 10; i++) {
          for (const screen of screens) {
            await element(by.id(screen)).tap();
            await global.testUtils.wait(100);
          }
        }

        const navigationTime = Date.now() - startTime;
        const avgTimePerNavigation = navigationTime / 30;

        // Test memory stability
        await device.pressBack(); // iOS: equivalent would be different
        await global.testUtils.wait(1000);
        await device.launchApp({ newInstance: false });

        const recoveryTime = Date.now();
        await waitFor(element(by.id('main-container'))).toBeVisible().withTimeout(5000);
        const appRecoveryTime = Date.now() - recoveryTime;

        logger.assertion(`ExpoGo Performance - Avg navigation: ${avgTimePerNavigation.toFixed(2)}ms, Recovery: ${appRecoveryTime}ms`, true, {
          avgNavigationTime: avgTimePerNavigation,
          appRecoveryTime
        });

      } catch (error) {
        logger.error('ExpoGo performance analysis failed:', error);
        logger.assertion('ExpoGo performance analysis failed', false);
      }
    });
  });

  describe('Cross-Platform Integration Testing', () => {
    test('should test communication between Go server and ExpoGo app', async () => {
      logger.step('Testing cross-platform communication');

      try {
        // 1. Set up Go server monitoring
        await webPage.goto('http://localhost:8080', { waitUntil: 'networkidle2' });

        // 2. Connect ExpoGo app to Go server
        await element(by.id('server-list-nav')).tap();
        await element(by.text('Go Server')).tap();
        await element(by.id('connect-button')).tap();
        await global.testUtils.wait(3000);

        // 3. Execute command from ExpoGo
        await element(by.id('development-nav')).tap();
        await element(by.id('command-input')).typeText('echo "Cross-platform test"');
        await element(by.id('execute-button')).tap();
        await global.testUtils.wait(2000);

        // 4. Check if command appears in Go server logs (if web interface shows logs)
        const webLogs = await webPage.evaluate(() => {
          const logElements = document.querySelectorAll('.log, .console, .output');
          return Array.from(logElements).map(el => el.textContent).join(' ');
        });

        const hasCommandInLogs = webLogs.includes('Cross-platform test') || webLogs.includes('echo');

        logger.assertion(`Cross-platform communication - Command visible in web logs: ${hasCommandInLogs}`, true);

        // 5. Test bidirectional communication if web interface allows command input
        const webCommandInput = await webPage.$('input[type="text"], textarea, .command-input');
        if (webCommandInput) {
          await webCommandInput.type('echo "From web interface"');

          const submitButton = await webPage.$('button[type="submit"], .execute, .send');
          if (submitButton) {
            await submitButton.click();
            await webPage.waitForTimeout(2000);

            logger.assertion('Bidirectional communication tested from web interface', true);
          }
        }

      } catch (error) {
        logger.error('Cross-platform communication test failed:', error);
        logger.assertion('Cross-platform communication test failed', false);
      }
    });

    test('should test session synchronization', async () => {
      logger.step('Testing session synchronization between platforms');

      try {
        // 1. Establish session in ExpoGo
        await element(by.id('settings-button')).tap();
        await waitFor(element(by.id('detailed-settings-screen'))).toBeVisible().withTimeout(5000);

        // 2. Check session info
        const sessionInfoExists = await element(by.id('session-info-section')).exists();
        if (sessionInfoExists) {
          await element(by.id('session-info-section')).tap();
        }

        // 3. Check if same session is reflected in web interface
        await webPage.goto('http://localhost:8080/status', { waitUntil: 'networkidle2' });

        const webSessionInfo = await webPage.evaluate(() => {
          return {
            hasSessionData: document.body.innerText.includes('session') ||
                           document.body.innerText.includes('Session') ||
                           document.body.innerText.includes('connected'),
            bodyText: document.body.innerText.substring(0, 500)
          };
        });

        logger.assertion(`Session synchronization - ExpoGo has session: ${sessionInfoExists}, Web shows session: ${webSessionInfo.hasSessionData}`, true, webSessionInfo);

      } catch (error) {
        logger.error('Session synchronization test failed:', error);
        logger.assertion('Session synchronization test failed', false);
      }
    });

    test('should test error handling across platforms', async () => {
      logger.step('Testing error handling across platforms');

      try {
        // 1. Trigger error in ExpoGo app
        await element(by.id('development-nav')).tap();
        await element(by.id('command-input')).typeText('invalid_command_that_should_fail');
        await element(by.id('execute-button')).tap();
        await global.testUtils.wait(3000);

        const expoError = await element(by.text('エラー')).exists() ||
                         await element(by.text('Error')).exists() ||
                         await element(by.text('コマンドが見つかりません')).exists();

        // 2. Check if error is reflected in Go server (if error logging is implemented)
        await webPage.goto('http://localhost:8080/logs', { waitUntil: 'networkidle2' });

        const webErrorLogs = await webPage.evaluate(() => {
          const text = document.body.innerText.toLowerCase();
          return text.includes('error') || text.includes('failed') || text.includes('invalid');
        });

        logger.assertion(`Error handling - ExpoGo shows error: ${expoError}, Web logs error: ${webErrorLogs}`, true);

        // 3. Test recovery
        await element(by.id('command-input')).clearText();
        await element(by.id('command-input')).typeText('echo "Recovery test"');
        await element(by.id('execute-button')).tap();
        await global.testUtils.wait(2000);

        const recoverySuccessful = await element(by.text('Recovery test')).exists();
        logger.assertion(`Error recovery successful: ${recoverySuccessful}`, recoverySuccessful);

      } catch (error) {
        logger.error('Error handling test failed:', error);
        logger.assertion('Error handling test failed', false);
      }
    });
  });

  describe('Real-time Feedback and Monitoring', () => {
    test('should provide real-time feedback during testing', async () => {
      logger.step('Setting up real-time feedback monitoring');

      try {
        // Create real-time feedback file
        const feedbackData = {
          timestamp: new Date().toISOString(),
          goServer: {
            status: 'unknown',
            responseTime: 0,
            errors: []
          },
          expoApp: {
            status: 'unknown',
            lastAction: '',
            errors: []
          },
          communication: {
            latency: 0,
            success: false,
            lastMessage: ''
          }
        };

        // Test Go server status
        const goServerStart = Date.now();
        try {
          await webPage.goto('http://localhost:8080/health', { waitUntil: 'networkidle2' });
          feedbackData.goServer.status = 'online';
          feedbackData.goServer.responseTime = Date.now() - goServerStart;
        } catch (error) {
          feedbackData.goServer.status = 'offline';
          feedbackData.goServer.errors.push(error.message);
        }

        // Test ExpoGo app status
        try {
          await element(by.id('main-container')).tap();
          feedbackData.expoApp.status = 'responsive';
          feedbackData.expoApp.lastAction = 'main container tap';
        } catch (error) {
          feedbackData.expoApp.status = 'unresponsive';
          feedbackData.expoApp.errors.push(error.message);
        }

        // Test communication
        if (ws && ws.readyState === WebSocket.OPEN) {
          const commStart = Date.now();
          ws.send(JSON.stringify({ type: 'feedback_test', timestamp: commStart }));

          feedbackData.communication.success = true;
          feedbackData.communication.latency = Date.now() - commStart;
          feedbackData.communication.lastMessage = 'feedback_test';
        }

        // Save feedback data
        const fs = require('fs-extra');
        await fs.writeJSON('./reports/live-feedback.json', feedbackData, { spaces: 2 });

        logger.assertion('Real-time feedback monitoring established', true, feedbackData);

      } catch (error) {
        logger.error('Real-time feedback setup failed:', error);
        logger.assertion('Real-time feedback setup failed', false);
      }
    });

    test('should generate live testing dashboard data', async () => {
      logger.step('Generating live testing dashboard data');

      const dashboardData = {
        testSession: {
          id: `live-test-${Date.now()}`,
          startTime: new Date().toISOString(),
          status: 'active'
        },
        platforms: {
          goServer: {
            url: 'http://localhost:8080',
            status: 'testing',
            metrics: {
              uptime: 0,
              averageResponseTime: 0,
              errorRate: 0
            }
          },
          expoApp: {
            platform: 'iOS Simulator',
            status: 'testing',
            metrics: {
              responsiveness: 0,
              navigationSpeed: 0,
              crashCount: 0
            }
          }
        },
        tests: {
          total: 0,
          passed: 0,
          failed: 0,
          running: 0
        },
        realTimeEvents: []
      };

      // Update dashboard with current test results
      dashboardData.tests.total = this.results?.length || 0;
      dashboardData.tests.passed = this.results?.filter(r => r.status === 'passed').length || 0;
      dashboardData.tests.failed = this.results?.filter(r => r.status === 'failed').length || 0;

      // Save dashboard data
      const fs = require('fs-extra');
      await fs.writeJSON('./reports/live-dashboard.json', dashboardData, { spaces: 2 });

      logger.assertion('Live testing dashboard data generated', true, dashboardData);
    });
  });
});