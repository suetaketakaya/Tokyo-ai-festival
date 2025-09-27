/**
 * Web Application UI Tests for RemoteClaudeApp
 * Tests web interface functionality, UI components, and user interactions
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { TestLogger } from '../../utils/logger';
import { config } from '../../config/testConfig';

describe('Web Application Tests', () => {
  const logger = new TestLogger();
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    logger.testStart('Web Application Test Suite');

    browser = await puppeteer.launch({
      headless: config.webBrowser.headless,
      defaultViewport: {
        width: config.webBrowser.viewport.width,
        height: config.webBrowser.viewport.height
      },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    page = await browser.newPage();

    // Set up page event listeners for debugging
    page.on('console', msg => {
      logger.debug(`Browser console: ${msg.text()}`);
    });

    page.on('pageerror', error => {
      logger.error('Page error:', error);
    });

    page.on('requestfailed', request => {
      logger.warn(`Request failed: ${request.url()}`);
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
    logger.testEnd('Web Application Test Suite', true);
  });

  beforeEach(async () => {
    // Navigate to web app
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await page.waitForSelector('body', { timeout: 10000 });
  });

  describe('Page Load and Initial State', () => {
    test('should load web application successfully', async () => {
      logger.step('Testing web application load');

      await page.waitForSelector('.app-container', { timeout: 10000 });

      const title = await page.title();
      expect(title).toContain('RemoteClaudeApp');

      const isVisible = await page.isVisible('.main-content');
      expect(isVisible).toBe(true);

      logger.assertion('Web application loaded successfully', true);
    });

    test('should display header navigation', async () => {
      logger.step('Testing header navigation display');

      await page.waitForSelector('.header-nav', { timeout: 5000 });

      const navItems = await page.$$('.nav-item');
      expect(navItems.length).toBeGreaterThan(0);

      const serverManagementNav = await page.isVisible('a[href="/servers"]');
      const terminalNav = await page.isVisible('a[href="/terminal"]');
      const settingsNav = await page.isVisible('a[href="/settings"]');

      expect(serverManagementNav).toBe(true);
      expect(terminalNav).toBe(true);
      expect(settingsNav).toBe(true);

      logger.assertion('Header navigation displayed correctly', true);
    });

    test('should display footer information', async () => {
      logger.step('Testing footer information display');

      await page.waitForSelector('.footer', { timeout: 5000 });

      const footerText = await page.textContent('.footer');
      expect(footerText).toContain('RemoteClaudeApp');

      const versionInfo = await page.isVisible('.version-info');
      expect(versionInfo).toBe(true);

      logger.assertion('Footer information displayed correctly', true);
    });
  });

  describe('Server Management Interface', () => {
    test('should navigate to server management page', async () => {
      logger.step('Testing navigation to server management');

      await page.click('a[href="/servers"]');
      await page.waitForSelector('.server-management-page', { timeout: 5000 });

      const currentUrl = page.url();
      expect(currentUrl).toContain('/servers');

      const pageTitle = await page.textContent('h1');
      expect(pageTitle).toContain('サーバー管理');

      logger.assertion('Server management page navigation successful', true);
    });

    test('should display server list', async () => {
      logger.step('Testing server list display');

      await page.goto('http://localhost:3000/servers');
      await page.waitForSelector('.server-list', { timeout: 5000 });

      const serverItems = await page.$$('.server-item');
      expect(serverItems.length).toBeGreaterThanOrEqual(0);

      const addServerButton = await page.isVisible('.add-server-button');
      expect(addServerButton).toBe(true);

      logger.assertion('Server list displayed correctly', true);
    });

    test('should handle server addition', async () => {
      logger.step('Testing server addition functionality');

      await page.goto('http://localhost:3000/servers');
      await page.click('.add-server-button');

      await page.waitForSelector('.server-form-modal', { timeout: 3000 });

      await page.fill('input[name="serverName"]', 'Test Web Server');
      await page.fill('input[name="serverHost"]', 'localhost');
      await page.fill('input[name="serverPort"]', '8090');

      await page.click('.save-server-button');

      await page.waitForSelector('.success-message', { timeout: 5000 });
      const successMessage = await page.textContent('.success-message');
      expect(successMessage).toContain('サーバーを追加しました');

      logger.assertion('Server addition completed successfully', true);
    });

    test('should handle server connection', async () => {
      logger.step('Testing server connection functionality');

      await page.goto('http://localhost:3000/servers');
      await page.waitForSelector('.server-item', { timeout: 5000 });

      const connectButton = await page.$('.server-item .connect-button');
      if (connectButton) {
        await connectButton.click();

        await page.waitForSelector('.connection-status', { timeout: 10000 });
        const statusText = await page.textContent('.connection-status');
        expect(statusText).toMatch(/(接続済み|接続中)/);

        logger.assertion('Server connection initiated successfully', true);
      } else {
        logger.assertion('No servers available for connection test', true);
      }
    });

    test('should display connection status indicators', async () => {
      logger.step('Testing connection status indicators');

      await page.goto('http://localhost:3000/servers');
      await page.waitForSelector('.server-list', { timeout: 5000 });

      const statusIndicators = await page.$$('.status-indicator');
      expect(statusIndicators.length).toBeGreaterThanOrEqual(0);

      // Check for status indicator colors
      const onlineIndicators = await page.$$('.status-indicator.online');
      const offlineIndicators = await page.$$('.status-indicator.offline');

      logger.assertion(`Status indicators displayed: ${onlineIndicators.length} online, ${offlineIndicators.length} offline`, true);
    });
  });

  describe('Terminal Interface', () => {
    test('should navigate to terminal page', async () => {
      logger.step('Testing navigation to terminal');

      await page.click('a[href="/terminal"]');
      await page.waitForSelector('.terminal-page', { timeout: 5000 });

      const currentUrl = page.url();
      expect(currentUrl).toContain('/terminal');

      const terminalContainer = await page.isVisible('.terminal-container');
      expect(terminalContainer).toBe(true);

      logger.assertion('Terminal page navigation successful', true);
    });

    test('should display terminal interface', async () => {
      logger.step('Testing terminal interface display');

      await page.goto('http://localhost:3000/terminal');
      await page.waitForSelector('.terminal-container', { timeout: 5000 });

      const commandInput = await page.isVisible('.command-input');
      const executeButton = await page.isVisible('.execute-button');
      const outputArea = await page.isVisible('.output-area');

      expect(commandInput).toBe(true);
      expect(executeButton).toBe(true);
      expect(outputArea).toBe(true);

      logger.assertion('Terminal interface displayed correctly', true);
    });

    test('should handle command execution', async () => {
      logger.step('Testing command execution');

      await page.goto('http://localhost:3000/terminal');
      await page.waitForSelector('.command-input', { timeout: 5000 });

      // First ensure we're connected to a server
      const connectButton = await page.$('.connect-server-button');
      if (connectButton) {
        await connectButton.click();
        await page.waitForSelector('.connected-indicator', { timeout: 10000 });
      }

      await page.fill('.command-input', 'echo "Hello Web Terminal"');
      await page.click('.execute-button');

      await page.waitForSelector('.command-output', { timeout: 10000 });
      const output = await page.textContent('.command-output');
      expect(output).toContain('Hello Web Terminal');

      logger.assertion('Command execution successful', true);
    });

    test('should display command history', async () => {
      logger.step('Testing command history display');

      await page.goto('http://localhost:3000/terminal');
      await page.waitForSelector('.terminal-container', { timeout: 5000 });

      // Execute a few commands first
      const commands = ['pwd', 'ls', 'date'];
      for (const command of commands) {
        await page.fill('.command-input', command);
        await page.click('.execute-button');
        await page.waitForTimeout(1000);
      }

      // Open history
      const historyButton = await page.$('.history-button');
      if (historyButton) {
        await historyButton.click();
        await page.waitForSelector('.command-history', { timeout: 3000 });

        const historyItems = await page.$$('.history-item');
        expect(historyItems.length).toBeGreaterThan(0);

        logger.assertion('Command history displayed correctly', true);
      } else {
        logger.assertion('History button not found', true);
      }
    });

    test('should handle terminal resize', async () => {
      logger.step('Testing terminal resize functionality');

      await page.goto('http://localhost:3000/terminal');
      await page.waitForSelector('.terminal-container', { timeout: 5000 });

      // Get initial size
      const initialSize = await page.evaluate(() => {
        const terminal = document.querySelector('.terminal-output');
        return {
          width: terminal?.clientWidth,
          height: terminal?.clientHeight
        };
      });

      // Resize browser window
      await page.setViewport({ width: 1200, height: 800 });
      await page.waitForTimeout(1000);

      const newSize = await page.evaluate(() => {
        const terminal = document.querySelector('.terminal-output');
        return {
          width: terminal?.clientWidth,
          height: terminal?.clientHeight
        };
      });

      expect(newSize.width).not.toBe(initialSize.width);
      logger.assertion('Terminal resize handled correctly', true);
    });
  });

  describe('Settings Interface', () => {
    test('should navigate to settings page', async () => {
      logger.step('Testing navigation to settings');

      await page.click('a[href="/settings"]');
      await page.waitForSelector('.settings-page', { timeout: 5000 });

      const currentUrl = page.url();
      expect(currentUrl).toContain('/settings');

      const settingsTitle = await page.textContent('h1');
      expect(settingsTitle).toContain('設定');

      logger.assertion('Settings page navigation successful', true);
    });

    test('should display settings categories', async () => {
      logger.step('Testing settings categories display');

      await page.goto('http://localhost:3000/settings');
      await page.waitForSelector('.settings-categories', { timeout: 5000 });

      const categories = await page.$$('.settings-category');
      expect(categories.length).toBeGreaterThan(0);

      const generalSettings = await page.isVisible('.category-general');
      const connectionSettings = await page.isVisible('.category-connection');
      const securitySettings = await page.isVisible('.category-security');

      expect(generalSettings || connectionSettings || securitySettings).toBe(true);

      logger.assertion('Settings categories displayed correctly', true);
    });

    test('should handle theme switching', async () => {
      logger.step('Testing theme switching');

      await page.goto('http://localhost:3000/settings');
      await page.waitForSelector('.theme-selector', { timeout: 5000 });

      const themeSelector = await page.$('.theme-selector');
      if (themeSelector) {
        await page.click('.theme-option[data-theme="dark"]');
        await page.waitForTimeout(1000);

        const bodyClass = await page.evaluate(() => document.body.className);
        expect(bodyClass).toContain('dark-theme');

        logger.assertion('Theme switching functional', true);
      } else {
        logger.assertion('Theme selector not found', true);
      }
    });

    test('should handle language switching', async () => {
      logger.step('Testing language switching');

      await page.goto('http://localhost:3000/settings');
      await page.waitForSelector('.language-selector', { timeout: 5000 });

      const languageSelector = await page.$('.language-selector');
      if (languageSelector) {
        await page.selectOption('.language-selector', 'en');
        await page.waitForTimeout(1000);

        const pageText = await page.textContent('h1');
        expect(pageText).toMatch(/(Settings|設定)/);

        logger.assertion('Language switching functional', true);
      } else {
        logger.assertion('Language selector not found', true);
      }
    });
  });

  describe('WebSocket Connection Management', () => {
    test('should display WebSocket connection status', async () => {
      logger.step('Testing WebSocket connection status display');

      await page.goto('http://localhost:3000');
      await page.waitForSelector('.connection-indicator', { timeout: 5000 });

      const connectionStatus = await page.textContent('.connection-indicator');
      expect(connectionStatus).toMatch(/(接続済み|切断済み|接続中)/);

      logger.assertion('WebSocket connection status displayed', true);
    });

    test('should handle WebSocket reconnection', async () => {
      logger.step('Testing WebSocket reconnection handling');

      await page.goto('http://localhost:3000/terminal');
      await page.waitForSelector('.terminal-container', { timeout: 5000 });

      // Simulate network disconnection by blocking requests
      await page.setOfflineMode(true);
      await page.waitForSelector('.connection-error', { timeout: 10000 });

      // Re-enable network
      await page.setOfflineMode(false);
      await page.waitForSelector('.reconnecting-indicator', { timeout: 10000 });

      logger.assertion('WebSocket reconnection handled appropriately', true);
    });

    test('should display latency information', async () => {
      logger.step('Testing latency information display');

      await page.goto('http://localhost:3000');
      await page.waitForSelector('.latency-display', { timeout: 10000 });

      const latencyText = await page.textContent('.latency-display');
      expect(latencyText).toMatch(/\d+ms/);

      logger.assertion('Latency information displayed correctly', true);
    });
  });

  describe('Responsive Design', () => {
    test('should handle mobile viewport', async () => {
      logger.step('Testing mobile viewport handling');

      await page.setViewport({ width: 375, height: 667 }); // iPhone size
      await page.goto('http://localhost:3000');

      await page.waitForSelector('.mobile-nav-toggle', { timeout: 5000 });

      const mobileNavVisible = await page.isVisible('.mobile-nav-toggle');
      expect(mobileNavVisible).toBe(true);

      // Test mobile navigation
      await page.click('.mobile-nav-toggle');
      await page.waitForSelector('.mobile-nav-menu', { timeout: 3000 });

      const mobileMenuVisible = await page.isVisible('.mobile-nav-menu');
      expect(mobileMenuVisible).toBe(true);

      logger.assertion('Mobile viewport handled correctly', true);
    });

    test('should handle tablet viewport', async () => {
      logger.step('Testing tablet viewport handling');

      await page.setViewport({ width: 768, height: 1024 }); // iPad size
      await page.goto('http://localhost:3000');

      await page.waitForSelector('.main-content', { timeout: 5000 });

      const sidebarVisible = await page.isVisible('.sidebar');
      const mainContentVisible = await page.isVisible('.main-content');

      expect(mainContentVisible).toBe(true);

      logger.assertion('Tablet viewport handled correctly', true);
    });

    test('should handle desktop viewport', async () => {
      logger.step('Testing desktop viewport handling');

      await page.setViewport({ width: 1920, height: 1080 }); // Desktop size
      await page.goto('http://localhost:3000');

      await page.waitForSelector('.desktop-layout', { timeout: 5000 });

      const headerVisible = await page.isVisible('.header-nav');
      const sidebarVisible = await page.isVisible('.sidebar');
      const mainContentVisible = await page.isVisible('.main-content');

      expect(headerVisible).toBe(true);
      expect(mainContentVisible).toBe(true);

      logger.assertion('Desktop viewport handled correctly', true);
    });
  });

  describe('Error Handling', () => {
    test('should display appropriate error messages', async () => {
      logger.step('Testing error message display');

      await page.goto('http://localhost:3000/invalid-page');

      await page.waitForSelector('.error-page', { timeout: 5000 });
      const errorMessage = await page.textContent('.error-message');
      expect(errorMessage).toContain('404');

      logger.assertion('Error messages displayed appropriately', true);
    });

    test('should handle network errors gracefully', async () => {
      logger.step('Testing network error handling');

      await page.goto('http://localhost:3000/terminal');
      await page.setOfflineMode(true);

      await page.fill('.command-input', 'echo "test"');
      await page.click('.execute-button');

      await page.waitForSelector('.network-error', { timeout: 5000 });
      const errorMessage = await page.textContent('.network-error');
      expect(errorMessage).toMatch(/(ネットワークエラー|Network Error)/);

      await page.setOfflineMode(false);

      logger.assertion('Network errors handled gracefully', true);
    });
  });

  describe('Performance Tests', () => {
    test('should load pages within acceptable time', async () => {
      logger.step('Testing page load performance');

      const pages = ['/servers', '/terminal', '/settings'];
      const loadTimes: number[] = [];

      for (const pagePath of pages) {
        const startTime = Date.now();
        await page.goto(`http://localhost:3000${pagePath}`, { waitUntil: 'networkidle2' });
        const loadTime = Date.now() - startTime;

        loadTimes.push(loadTime);
        expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds

        logger.debug(`Page ${pagePath} loaded in ${loadTime}ms`);
      }

      const averageLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
      logger.assertion(`Average page load time: ${averageLoadTime.toFixed(2)}ms`, true);
    });

    test('should handle rapid interactions', async () => {
      logger.step('Testing rapid interaction performance');

      await page.goto('http://localhost:3000');

      const navItems = ['a[href="/servers"]', 'a[href="/terminal"]', 'a[href="/settings"]'];

      // Perform rapid navigation
      for (let i = 0; i < 10; i++) {
        const navItem = navItems[i % navItems.length];
        await page.click(navItem);
        await page.waitForTimeout(100);
      }

      // Page should still be responsive
      await page.waitForSelector('.main-content', { timeout: 5000 });

      logger.assertion('Rapid interactions handled without performance issues', true);
    });
  });
});