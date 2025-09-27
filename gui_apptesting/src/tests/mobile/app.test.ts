/**
 * React Native App Integration Tests for RemoteClaudeApp
 * Tests core app functionality, navigation, and user interactions
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';
import { TestLogger } from '../../utils/logger';
import { config } from '../../config/testConfig';

describe('RemoteClaudeApp Mobile Tests', () => {
  const logger = new TestLogger();

  beforeAll(async () => {
    logger.testStart('Mobile App Test Suite');
    await device.launchApp();
    await device.reloadReactNative();
  });

  afterAll(async () => {
    logger.testEnd('Mobile App Test Suite', true);
  });

  beforeEach(async () => {
    // Reset app state before each test
    await device.reloadReactNative();
    await waitFor(element(by.id('main-container'))).toBeVisible().withTimeout(10000);
  });

  describe('App Launch and Navigation', () => {
    test('should launch app successfully and show home screen', async () => {
      logger.step('Testing app launch and initial screen');

      await detoxExpect(element(by.id('main-container'))).toBeVisible();
      await detoxExpect(element(by.text('RemoteClaudeApp'))).toBeVisible();

      logger.assertion('App launched successfully', true);
    });

    test('should navigate to server list screen', async () => {
      logger.step('Testing navigation to server list');

      await element(by.id('server-list-nav')).tap();
      await waitFor(element(by.id('server-list-screen'))).toBeVisible().withTimeout(5000);

      await detoxExpect(element(by.text('サーバー一覧'))).toBeVisible();
      logger.assertion('Successfully navigated to server list', true);
    });

    test('should navigate to settings screen', async () => {
      logger.step('Testing navigation to settings');

      await element(by.id('settings-button')).tap();
      await waitFor(element(by.id('detailed-settings-screen'))).toBeVisible().withTimeout(5000);

      await detoxExpect(element(by.text('詳細設定'))).toBeVisible();
      logger.assertion('Successfully navigated to settings', true);
    });

    test('should navigate to quick commands screen', async () => {
      logger.step('Testing navigation to quick commands');

      await element(by.id('quick-commands-nav')).tap();
      await waitFor(element(by.id('quick-commands-screen'))).toBeVisible().withTimeout(5000);

      await detoxExpect(element(by.text('クイックコマンド'))).toBeVisible();
      logger.assertion('Successfully navigated to quick commands', true);
    });
  });

  describe('Server Management', () => {
    test('should display server list and allow server selection', async () => {
      logger.step('Testing server list and selection');

      await element(by.id('server-list-nav')).tap();
      await waitFor(element(by.id('server-list-screen'))).toBeVisible().withTimeout(5000);

      // Check if servers are displayed
      await detoxExpect(element(by.id('server-item-0'))).toBeVisible();

      // Tap on first server
      await element(by.id('server-item-0')).tap();

      logger.assertion('Server selection working', true);
    });

    test('should show server connection status', async () => {
      logger.step('Testing server connection status display');

      await element(by.id('server-list-nav')).tap();
      await waitFor(element(by.id('server-status-indicator'))).toBeVisible().withTimeout(5000);

      // Connection status should be visible
      await detoxExpect(element(by.id('connection-status'))).toBeVisible();

      logger.assertion('Server status displayed correctly', true);
    });

    test('should handle server addition flow', async () => {
      logger.step('Testing add new server functionality');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('add-server-button')).tap();

      await waitFor(element(by.id('server-form-modal'))).toBeVisible().withTimeout(3000);

      // Fill server form
      await element(by.id('server-name-input')).typeText('Test Server');
      await element(by.id('server-host-input')).typeText('localhost');
      await element(by.id('server-port-input')).typeText('8090');

      await element(by.id('save-server-button')).tap();

      logger.assertion('Server addition flow completed', true);
    });
  });

  describe('WebSocket Connection Testing', () => {
    test('should establish WebSocket connection', async () => {
      logger.step('Testing WebSocket connection establishment');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();

      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      logger.assertion('WebSocket connection established', true);
    });

    test('should show connection latency', async () => {
      logger.step('Testing latency display');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();

      await waitFor(element(by.id('latency-display'))).toBeVisible().withTimeout(5000);

      logger.assertion('Latency information displayed', true);
    });

    test('should handle connection disconnection', async () => {
      logger.step('Testing connection disconnection');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();

      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      await element(by.id('disconnect-button')).tap();
      await waitFor(element(by.text('切断済み'))).toBeVisible().withTimeout(5000);

      logger.assertion('Connection disconnection handled correctly', true);
    });
  });

  describe('Command Execution', () => {
    test('should execute commands via WebSocket', async () => {
      logger.step('Testing command execution');

      // Connect to server first
      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      // Navigate to development screen
      await element(by.id('development-nav')).tap();
      await waitFor(element(by.id('development-screen'))).toBeVisible().withTimeout(5000);

      // Execute a test command
      await element(by.id('command-input')).typeText('echo "test"');
      await element(by.id('execute-button')).tap();

      await waitFor(element(by.text('test'))).toBeVisible().withTimeout(10000);

      logger.assertion('Command executed successfully', true);
    });

    test('should handle command history', async () => {
      logger.step('Testing command history functionality');

      await element(by.id('development-nav')).tap();
      await element(by.id('command-input')).typeText('pwd');
      await element(by.id('execute-button')).tap();

      await element(by.id('history-button')).tap();
      await waitFor(element(by.text('pwd'))).toBeVisible().withTimeout(3000);

      logger.assertion('Command history displayed correctly', true);
    });
  });

  describe('Quick Commands', () => {
    test('should display quick commands list', async () => {
      logger.step('Testing quick commands display');

      await element(by.id('quick-commands-nav')).tap();
      await waitFor(element(by.id('quick-commands-screen'))).toBeVisible().withTimeout(5000);

      await detoxExpect(element(by.id('quick-command-list'))).toBeVisible();
      await detoxExpect(element(by.id('quick-command-0'))).toBeVisible();

      logger.assertion('Quick commands displayed correctly', true);
    });

    test('should execute quick command', async () => {
      logger.step('Testing quick command execution');

      // Connect to server first
      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      await element(by.id('quick-commands-nav')).tap();
      await element(by.id('quick-command-0')).tap();

      await waitFor(element(by.id('command-execution-modal'))).toBeVisible().withTimeout(5000);

      logger.assertion('Quick command executed', true);
    });

    test('should add new quick command', async () => {
      logger.step('Testing adding new quick command');

      await element(by.id('quick-commands-nav')).tap();
      await element(by.id('add-quick-command-button')).tap();

      await waitFor(element(by.id('quick-command-form'))).toBeVisible().withTimeout(3000);

      await element(by.id('command-name-input')).typeText('Test Command');
      await element(by.id('command-content-input')).typeText('ls -la');
      await element(by.id('save-quick-command')).tap();

      logger.assertion('New quick command added successfully', true);
    });
  });

  describe('Settings Management', () => {
    test('should display local storage data', async () => {
      logger.step('Testing local storage data display');

      await element(by.id('settings-button')).tap();
      await waitFor(element(by.id('detailed-settings-screen'))).toBeVisible().withTimeout(5000);

      await element(by.id('view-stored-data-button')).tap();
      await waitFor(element(by.id('stored-data-modal'))).toBeVisible().withTimeout(3000);

      logger.assertion('Local storage data displayed', true);
    });

    test('should export data', async () => {
      logger.step('Testing data export functionality');

      await element(by.id('settings-button')).tap();
      await element(by.id('export-data-button')).tap();

      await waitFor(element(by.text('データをエクスポートしました'))).toBeVisible().withTimeout(5000);

      logger.assertion('Data export completed', true);
    });

    test('should clear statistics', async () => {
      logger.step('Testing statistics clearing');

      await element(by.id('settings-button')).tap();
      await element(by.id('clear-stats-button')).tap();

      await waitFor(element(by.text('統計データをクリアしました'))).toBeVisible().withTimeout(3000);

      logger.assertion('Statistics cleared successfully', true);
    });

    test('should configure Git settings', async () => {
      logger.step('Testing Git settings configuration');

      await element(by.id('settings-button')).tap();
      await element(by.id('git-settings-section')).tap();

      await element(by.id('git-username-input')).typeText('testuser');
      await element(by.id('git-email-input')).typeText('test@example.com');
      await element(by.id('save-git-settings')).tap();

      await waitFor(element(by.text('Git設定を保存しました'))).toBeVisible().withTimeout(3000);

      logger.assertion('Git settings configured successfully', true);
    });
  });

  describe('Error Handling', () => {
    test('should handle network disconnection gracefully', async () => {
      logger.step('Testing network disconnection handling');

      // Connect first
      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      // Simulate network disconnection
      await device.disableNetwork();

      await waitFor(element(by.text('接続エラー'))).toBeVisible().withTimeout(10000);

      // Re-enable network
      await device.enableNetwork();

      logger.assertion('Network disconnection handled gracefully', true);
    });

    test('should show appropriate error messages for invalid commands', async () => {
      logger.step('Testing error handling for invalid commands');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      await element(by.id('development-nav')).tap();
      await element(by.id('command-input')).typeText('invalidcommand123');
      await element(by.id('execute-button')).tap();

      await waitFor(element(by.text('コマンドが見つかりません'))).toBeVisible().withTimeout(5000);

      logger.assertion('Invalid command error handled correctly', true);
    });
  });

  describe('Performance Tests', () => {
    test('should handle rapid navigation between screens', async () => {
      logger.step('Testing rapid navigation performance');

      const screens = ['server-list-nav', 'quick-commands-nav', 'development-nav'];

      for (let i = 0; i < 5; i++) {
        for (const screen of screens) {
          await element(by.id(screen)).tap();
          await global.testUtils.wait(500);
        }
      }

      logger.assertion('Rapid navigation handled without crashes', true);
    });

    test('should handle multiple quick command executions', async () => {
      logger.step('Testing multiple command execution performance');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      await element(by.id('development-nav')).tap();

      for (let i = 0; i < 10; i++) {
        await element(by.id('command-input')).clearText();
        await element(by.id('command-input')).typeText(`echo "test ${i}"`);
        await element(by.id('execute-button')).tap();
        await global.testUtils.wait(100);
      }

      logger.assertion('Multiple command executions completed successfully', true);
    });
  });
});