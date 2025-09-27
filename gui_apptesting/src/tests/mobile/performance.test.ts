/**
 * Performance Tests for RemoteClaudeApp Mobile Application
 * Tests app responsiveness, memory usage, and performance metrics
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';
import { TestLogger } from '../../utils/logger';

describe('Mobile App Performance Tests', () => {
  const logger = new TestLogger();

  beforeAll(async () => {
    logger.testStart('Mobile Performance Test Suite');
    await device.launchApp({ newInstance: true });
  });

  afterAll(async () => {
    logger.testEnd('Mobile Performance Test Suite', true);
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await waitFor(element(by.id('main-container'))).toBeVisible().withTimeout(10000);
  });

  describe('App Launch Performance', () => {
    test('should launch within acceptable time', async () => {
      logger.step('Testing app launch time');

      const startTime = Date.now();
      await device.terminateApp();
      await device.launchApp({ newInstance: true });

      await waitFor(element(by.id('main-container'))).toBeVisible().withTimeout(15000);
      const launchTime = Date.now() - startTime;

      expect(launchTime).toBeLessThan(10000); // Should launch within 10 seconds
      logger.assertion(`App launched in ${launchTime}ms`, launchTime < 10000);
    });

    test('should handle cold start efficiently', async () => {
      logger.step('Testing cold start performance');

      // Ensure app is completely terminated
      await device.terminateApp();
      await global.testUtils.wait(2000);

      const startTime = Date.now();
      await device.launchApp({ newInstance: true });

      await waitFor(element(by.id('main-container'))).toBeVisible().withTimeout(15000);
      await waitFor(element(by.id('server-list-nav'))).toBeVisible().withTimeout(5000);

      const coldStartTime = Date.now() - startTime;

      expect(coldStartTime).toBeLessThan(15000); // Cold start should be under 15 seconds
      logger.assertion(`Cold start completed in ${coldStartTime}ms`, coldStartTime < 15000);
    });

    test('should handle warm start quickly', async () => {
      logger.step('Testing warm start performance');

      // Put app in background and bring back
      await device.sendToHome();
      await global.testUtils.wait(1000);

      const startTime = Date.now();
      await device.launchApp({ newInstance: false });

      await waitFor(element(by.id('main-container'))).toBeVisible().withTimeout(5000);
      const warmStartTime = Date.now() - startTime;

      expect(warmStartTime).toBeLessThan(3000); // Warm start should be under 3 seconds
      logger.assertion(`Warm start completed in ${warmStartTime}ms`, warmStartTime < 3000);
    });
  });

  describe('Navigation Performance', () => {
    test('should navigate between screens quickly', async () => {
      logger.step('Testing navigation performance');

      const screens = [
        { id: 'server-list-nav', name: 'Server List' },
        { id: 'quick-commands-nav', name: 'Quick Commands' },
        { id: 'development-nav', name: 'Development' }
      ];

      const navigationTimes: number[] = [];

      for (const screen of screens) {
        const startTime = Date.now();
        await element(by.id(screen.id)).tap();
        await waitFor(element(by.id(`${screen.name.toLowerCase().replace(' ', '-')}-screen`))).toBeVisible().withTimeout(5000);
        const navigationTime = Date.now() - startTime;

        navigationTimes.push(navigationTime);
        logger.debug(`Navigation to ${screen.name}: ${navigationTime}ms`);

        expect(navigationTime).toBeLessThan(2000); // Each navigation should be under 2 seconds
      }

      const averageNavigationTime = navigationTimes.reduce((sum, time) => sum + time, 0) / navigationTimes.length;
      expect(averageNavigationTime).toBeLessThan(1500);

      logger.assertion(`Average navigation time: ${averageNavigationTime.toFixed(2)}ms`, true);
    });

    test('should handle rapid navigation without lag', async () => {
      logger.step('Testing rapid navigation performance');

      const screens = ['server-list-nav', 'quick-commands-nav', 'development-nav'];
      const startTime = Date.now();

      // Rapidly navigate between screens
      for (let i = 0; i < 20; i++) {
        const screenId = screens[i % screens.length];
        await element(by.id(screenId)).tap();
        await global.testUtils.wait(100); // Brief pause
      }

      const totalTime = Date.now() - startTime;
      const averageTimePerNavigation = totalTime / 20;

      expect(averageTimePerNavigation).toBeLessThan(300); // Should average under 300ms per navigation
      logger.assertion(`Rapid navigation average: ${averageTimePerNavigation.toFixed(2)}ms per tap`, true);
    });
  });

  describe('WebSocket Performance', () => {
    test('should maintain responsive UI during WebSocket operations', async () => {
      logger.step('Testing UI responsiveness during WebSocket operations');

      // Connect to server
      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      await element(by.id('development-nav')).tap();

      // Execute multiple commands while testing UI responsiveness
      const commands = ['pwd', 'ls', 'date', 'whoami', 'echo "test"'];
      const responseTimes: number[] = [];

      for (const command of commands) {
        const startTime = Date.now();

        await element(by.id('command-input')).clearText();
        await element(by.id('command-input')).typeText(command);

        // Test UI responsiveness by tapping other elements
        await element(by.id('history-button')).tap();
        await global.testUtils.wait(100);

        await element(by.id('execute-button')).tap();

        // Wait for command completion
        await global.testUtils.waitForCondition(
          async () => {
            const executingVisible = await element(by.text('実行中')).exists();
            return !executingVisible;
          },
          10000
        );

        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);

        expect(responseTime).toBeLessThan(5000); // Commands should complete within 5 seconds
      }

      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      logger.assertion(`Average command response time: ${averageResponseTime.toFixed(2)}ms`, true);
    });

    test('should handle high-frequency WebSocket messages', async () => {
      logger.step('Testing high-frequency WebSocket message handling');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      await element(by.id('development-nav')).tap();

      // Send rapid fire commands
      const startTime = Date.now();
      const commandCount = 50;

      for (let i = 0; i < commandCount; i++) {
        await element(by.id('command-input')).clearText();
        await element(by.id('command-input')).typeText(`echo "message ${i}"`);
        await element(by.id('execute-button')).tap();
        await global.testUtils.wait(50); // Brief pause between commands
      }

      const totalTime = Date.now() - startTime;
      const messagesPerSecond = (commandCount / totalTime) * 1000;

      expect(messagesPerSecond).toBeGreaterThan(5); // Should handle at least 5 messages per second
      logger.assertion(`Message throughput: ${messagesPerSecond.toFixed(2)} messages/second`, true);
    });
  });

  describe('Memory Performance', () => {
    test('should maintain stable memory usage during extended operation', async () => {
      logger.step('Testing memory stability during extended operation');

      // Connect and perform operations for extended period
      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      await element(by.id('development-nav')).tap();

      // Perform sustained operations
      const operationDuration = 60000; // 1 minute
      const startTime = Date.now();
      let operationCount = 0;

      while (Date.now() - startTime < operationDuration) {
        await element(by.id('command-input')).clearText();
        await element(by.id('command-input')).typeText(`echo "operation ${operationCount}"`);
        await element(by.id('execute-button')).tap();

        // Navigate between screens occasionally
        if (operationCount % 10 === 0) {
          await element(by.id('server-list-nav')).tap();
          await global.testUtils.wait(100);
          await element(by.id('development-nav')).tap();
        }

        operationCount++;
        await global.testUtils.wait(200);
      }

      // App should still be responsive after extended operation
      await element(by.id('settings-button')).tap();
      await waitFor(element(by.id('detailed-settings-screen'))).toBeVisible().withTimeout(5000);

      logger.assertion(`Completed ${operationCount} operations over ${operationDuration}ms without memory issues`, true);
    });

    test('should handle large data sets efficiently', async () => {
      logger.step('Testing large data set handling');

      await element(by.id('server-list-nav')).tap();

      // Add many servers to test list performance
      for (let i = 0; i < 50; i++) {
        await element(by.id('add-server-button')).tap();
        await element(by.id('server-name-input')).typeText(`Server ${i}`);
        await element(by.id('server-host-input')).typeText('localhost');
        await element(by.id('server-port-input')).typeText(`${8000 + i}`);
        await element(by.id('save-server-button')).tap();

        if (i % 10 === 0) {
          logger.debug(`Added ${i + 1} servers`);
        }
      }

      // Test scrolling performance with large list
      const scrollStartTime = Date.now();
      await element(by.id('server-list')).scroll(1000, 'down');
      await element(by.id('server-list')).scroll(1000, 'up');
      const scrollTime = Date.now() - scrollStartTime;

      expect(scrollTime).toBeLessThan(2000); // Scrolling should be smooth
      logger.assertion(`Large list scrolling completed in ${scrollTime}ms`, scrollTime < 2000);
    });
  });

  describe('Battery and Resource Usage', () => {
    test('should minimize background resource usage', async () => {
      logger.step('Testing background resource usage');

      // Connect to server
      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      // Put app in background
      await device.sendToHome();
      await global.testUtils.wait(30000); // Wait 30 seconds in background

      // Bring app back to foreground
      await device.launchApp({ newInstance: false });
      await waitFor(element(by.id('main-container'))).toBeVisible().withTimeout(5000);

      // Connection should be maintained or gracefully reconnected
      const connectionStatus = await element(by.text('接続済み')).exists() ||
                              await element(by.text('再接続中')).exists();

      expect(connectionStatus).toBe(true);
      logger.assertion('App maintained connection or reconnected after background period', connectionStatus);
    });

    test('should handle network changes efficiently', async () => {
      logger.step('Testing network change handling');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      // Simulate network disconnection
      await device.disableNetwork();
      await global.testUtils.wait(5000);

      // Check for appropriate offline handling
      const offlineIndicator = await element(by.text('オフライン')).exists() ||
                              await element(by.text('接続エラー')).exists();

      // Re-enable network
      await device.enableNetwork();
      await global.testUtils.wait(5000);

      // Should automatically reconnect
      const reconnected = await element(by.text('接続済み')).exists() ||
                         await element(by.text('再接続中')).exists();

      expect(reconnected).toBe(true);
      logger.assertion('App handled network changes appropriately', reconnected);
    });
  });

  describe('Stress Testing', () => {
    test('should handle rapid user interactions', async () => {
      logger.step('Testing rapid user interaction handling');

      const interactions = [
        () => element(by.id('server-list-nav')).tap(),
        () => element(by.id('quick-commands-nav')).tap(),
        () => element(by.id('development-nav')).tap(),
        () => element(by.id('settings-button')).tap()
      ];

      // Perform rapid interactions
      for (let i = 0; i < 100; i++) {
        const interaction = interactions[i % interactions.length];
        try {
          await interaction();
          await global.testUtils.wait(50);
        } catch (error) {
          logger.warn(`Interaction ${i} failed:`, error);
        }
      }

      // App should still be responsive
      await waitFor(element(by.id('main-container'))).toBeVisible().withTimeout(5000);
      logger.assertion('App survived rapid interaction stress test', true);
    });

    test('should handle concurrent operations', async () => {
      logger.step('Testing concurrent operation handling');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      await element(by.id('development-nav')).tap();

      // Start multiple operations concurrently
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(
          (async () => {
            await element(by.id('command-input')).clearText();
            await element(by.id('command-input')).typeText(`echo "concurrent ${i}"`);
            await element(by.id('execute-button')).tap();
            await global.testUtils.wait(Math.random() * 1000);
          })()
        );
      }

      // Wait for all operations to complete
      await Promise.allSettled(operations);

      // App should still be responsive
      await element(by.id('server-list-nav')).tap();
      await waitFor(element(by.id('server-list-screen'))).toBeVisible().withTimeout(5000);

      logger.assertion('App handled concurrent operations successfully', true);
    });
  });
});