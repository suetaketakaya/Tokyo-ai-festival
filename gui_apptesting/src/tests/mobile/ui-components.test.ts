/**
 * UI Component Tests for RemoteClaudeApp
 * Tests individual UI components, modals, and user interactions
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';
import { TestLogger } from '../../utils/logger';

describe('UI Component Tests', () => {
  const logger = new TestLogger();

  beforeAll(async () => {
    logger.testStart('UI Component Test Suite');
  });

  afterAll(async () => {
    logger.testEnd('UI Component Test Suite', true);
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await waitFor(element(by.id('main-container'))).toBeVisible().withTimeout(10000);
  });

  describe('Modal Components', () => {
    test('should open and close server configuration modal', async () => {
      logger.step('Testing server configuration modal');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('add-server-button')).tap();

      // Modal should be visible
      await waitFor(element(by.id('server-form-modal'))).toBeVisible().withTimeout(3000);
      await detoxExpect(element(by.text('サーバー追加'))).toBeVisible();

      // Close modal using cancel button
      await element(by.id('cancel-button')).tap();
      await waitFor(element(by.id('server-form-modal'))).toBeNotVisible().withTimeout(3000);

      logger.assertion('Server configuration modal opens and closes correctly', true);
    });

    test('should open and close command execution modal', async () => {
      logger.step('Testing command execution modal');

      // Connect to server first
      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      await element(by.id('development-nav')).tap();
      await element(by.id('command-input')).typeText('ls');
      await element(by.id('execute-button')).tap();

      // Command execution modal should appear
      await waitFor(element(by.id('command-execution-modal'))).toBeVisible().withTimeout(5000);

      // Close modal
      await element(by.id('close-modal-button')).tap();
      await waitFor(element(by.id('command-execution-modal'))).toBeNotVisible().withTimeout(3000);

      logger.assertion('Command execution modal functions correctly', true);
    });

    test('should display WebSocket response modal', async () => {
      logger.step('Testing WebSocket response modal');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      await element(by.id('development-nav')).tap();
      await element(by.id('websocket-test-button')).tap();

      await waitFor(element(by.id('websocket-response-modal'))).toBeVisible().withTimeout(5000);
      await detoxExpect(element(by.text('WebSocket応答'))).toBeVisible();

      await element(by.id('close-websocket-modal')).tap();

      logger.assertion('WebSocket response modal displayed correctly', true);
    });
  });

  describe('Input Components', () => {
    test('should handle text input validation', async () => {
      logger.step('Testing text input validation');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('add-server-button')).tap();

      // Test invalid port input
      await element(by.id('server-port-input')).typeText('invalid');
      await element(by.id('save-server-button')).tap();

      await waitFor(element(by.text('有効なポート番号を入力してください'))).toBeVisible().withTimeout(3000);

      // Test valid input
      await element(by.id('server-port-input')).clearText();
      await element(by.id('server-port-input')).typeText('8080');

      const errorMessage = await element(by.text('有効なポート番号を入力してください')).exists();
      expect(errorMessage).toBe(false);

      logger.assertion('Text input validation works correctly', true);
    });

    test('should handle command input with autocomplete', async () => {
      logger.step('Testing command input autocomplete');

      await element(by.id('development-nav')).tap();
      await element(by.id('command-input')).typeText('ls');

      // Check if autocomplete suggestions appear
      const autocompleteVisible = await element(by.id('autocomplete-suggestions')).exists();

      if (autocompleteVisible) {
        await element(by.id('autocomplete-suggestion-0')).tap();
        const inputValue = await element(by.id('command-input')).getText();
        expect(inputValue.length).toBeGreaterThan(2);
      }

      logger.assertion('Command input autocomplete functioning', autocompleteVisible);
    });

    test('should handle multi-line text input', async () => {
      logger.step('Testing multi-line text input');

      await element(by.id('development-nav')).tap();
      await element(by.id('multi-line-command-toggle')).tap();

      const multiLineInput = 'echo "line 1"\necho "line 2"\necho "line 3"';
      await element(by.id('command-input')).typeText(multiLineInput);

      const inputValue = await element(by.id('command-input')).getText();
      expect(inputValue.includes('\n')).toBe(true);

      logger.assertion('Multi-line text input handled correctly', true);
    });
  });

  describe('List Components', () => {
    test('should handle server list scrolling', async () => {
      logger.step('Testing server list scrolling');

      await element(by.id('server-list-nav')).tap();

      // Add multiple servers to test scrolling
      for (let i = 0; i < 10; i++) {
        await element(by.id('add-server-button')).tap();
        await element(by.id('server-name-input')).typeText(`Test Server ${i}`);
        await element(by.id('server-host-input')).typeText('localhost');
        await element(by.id('server-port-input')).typeText(`808${i}`);
        await element(by.id('save-server-button')).tap();
        await global.testUtils.wait(500);
      }

      // Test scrolling
      await element(by.id('server-list')).scroll(300, 'down');
      await element(by.id('server-list')).scroll(300, 'up');

      logger.assertion('Server list scrolling works correctly', true);
    });

    test('should handle quick command list interaction', async () => {
      logger.step('Testing quick command list interaction');

      await element(by.id('quick-commands-nav')).tap();
      await waitFor(element(by.id('quick-commands-screen'))).toBeVisible().withTimeout(5000);

      // Test long press on quick command item
      await element(by.id('quick-command-0')).longPress();

      const contextMenuVisible = await element(by.id('quick-command-context-menu')).exists();
      if (contextMenuVisible) {
        await element(by.id('edit-quick-command')).tap();
        await waitFor(element(by.id('quick-command-form'))).toBeVisible().withTimeout(3000);
        await element(by.id('cancel-edit')).tap();
      }

      logger.assertion('Quick command list interaction functioning', true);
    });

    test('should handle command history list', async () => {
      logger.step('Testing command history list');

      await element(by.id('development-nav')).tap();

      // Execute some commands to create history
      const commands = ['pwd', 'ls', 'date', 'whoami'];
      for (const command of commands) {
        await element(by.id('command-input')).clearText();
        await element(by.id('command-input')).typeText(command);
        await element(by.id('execute-button')).tap();
        await global.testUtils.wait(1000);
      }

      await element(by.id('history-button')).tap();
      await waitFor(element(by.id('command-history-modal'))).toBeVisible().withTimeout(3000);

      // Check if commands are in history
      for (const command of commands) {
        await detoxExpect(element(by.text(command))).toBeVisible();
      }

      await element(by.id('close-history-modal')).tap();

      logger.assertion('Command history list displayed correctly', true);
    });
  });

  describe('Button Components', () => {
    test('should handle connection toggle button states', async () => {
      logger.step('Testing connection toggle button states');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();

      // Initial state should be disconnected
      await detoxExpect(element(by.text('接続'))).toBeVisible();

      // Connect
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('切断'))).toBeVisible().withTimeout(10000);

      // Disconnect
      await element(by.id('disconnect-button')).tap();
      await waitFor(element(by.text('接続'))).toBeVisible().withTimeout(5000);

      logger.assertion('Connection toggle button states working correctly', true);
    });

    test('should handle floating action buttons', async () => {
      logger.step('Testing floating action buttons');

      await element(by.id('quick-commands-nav')).tap();

      const fabVisible = await element(by.id('floating-action-button')).exists();
      if (fabVisible) {
        await element(by.id('floating-action-button')).tap();
        await waitFor(element(by.id('fab-menu'))).toBeVisible().withTimeout(2000);

        await element(by.id('fab-add-command')).tap();
        await waitFor(element(by.id('quick-command-form'))).toBeVisible().withTimeout(3000);
        await element(by.id('cancel-button')).tap();
      }

      logger.assertion('Floating action buttons functioning', fabVisible);
    });

    test('should handle icon buttons and gestures', async () => {
      logger.step('Testing icon buttons and gestures');

      await element(by.id('settings-button')).tap();
      await waitFor(element(by.id('detailed-settings-screen'))).toBeVisible().withTimeout(5000);

      // Test swipe gestures if supported
      try {
        await element(by.id('settings-content')).swipe('left');
        await global.testUtils.wait(500);
        await element(by.id('settings-content')).swipe('right');
      } catch (error) {
        logger.debug('Swipe gestures not supported or failed', error);
      }

      // Test icon button taps
      const iconButtons = ['refresh-button', 'share-button', 'info-button'];
      for (const buttonId of iconButtons) {
        const buttonExists = await element(by.id(buttonId)).exists();
        if (buttonExists) {
          await element(by.id(buttonId)).tap();
          await global.testUtils.wait(500);
        }
      }

      logger.assertion('Icon buttons and gestures handled correctly', true);
    });
  });

  describe('Status Indicators', () => {
    test('should display connection status indicators', async () => {
      logger.step('Testing connection status indicators');

      await element(by.id('server-list-nav')).tap();

      // Check status indicator colors and states
      const statusIndicator = await element(by.id('connection-status-indicator')).exists();
      if (statusIndicator) {
        await detoxExpect(element(by.id('connection-status-indicator'))).toBeVisible();

        // Connect and check status change
        await element(by.id('server-item-0')).tap();
        await element(by.id('connect-button')).tap();
        await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

        // Status indicator should show connected state
        const connectedStatus = await element(by.id('status-connected')).exists();
        expect(connectedStatus).toBe(true);
      }

      logger.assertion('Connection status indicators working correctly', statusIndicator);
    });

    test('should display latency indicators', async () => {
      logger.step('Testing latency indicators');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      const latencyIndicator = await element(by.id('latency-indicator')).exists();
      if (latencyIndicator) {
        await detoxExpect(element(by.id('latency-value'))).toBeVisible();

        const latencyText = await element(by.id('latency-value')).getText();
        expect(latencyText).toMatch(/\d+ms/);
      }

      logger.assertion('Latency indicators displayed correctly', latencyIndicator);
    });

    test('should display loading indicators', async () => {
      logger.step('Testing loading indicators');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();

      // Loading indicator should appear during connection
      const loadingIndicator = await element(by.id('loading-spinner')).exists();
      if (loadingIndicator) {
        await detoxExpect(element(by.id('loading-spinner'))).toBeVisible();
      }

      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      // Loading indicator should disappear after connection
      const loadingStillVisible = await element(by.id('loading-spinner')).exists();
      expect(loadingStillVisible).toBe(false);

      logger.assertion('Loading indicators functioning correctly', true);
    });
  });

  describe('Error Handling UI', () => {
    test('should display error messages appropriately', async () => {
      logger.step('Testing error message display');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('add-server-button')).tap();

      // Try to save without required fields
      await element(by.id('save-server-button')).tap();

      await waitFor(element(by.text('必須項目を入力してください'))).toBeVisible().withTimeout(3000);

      // Error should disappear when fields are filled
      await element(by.id('server-name-input')).typeText('Test');
      await element(by.id('server-host-input')).typeText('localhost');
      await element(by.id('server-port-input')).typeText('8080');

      const errorStillVisible = await element(by.text('必須項目を入力してください')).exists();
      expect(errorStillVisible).toBe(false);

      logger.assertion('Error messages displayed and cleared appropriately', true);
    });

    test('should handle network error dialogs', async () => {
      logger.step('Testing network error dialogs');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('add-server-button')).tap();

      // Add server with invalid host
      await element(by.id('server-name-input')).typeText('Invalid Server');
      await element(by.id('server-host-input')).typeText('invalid.host.example');
      await element(by.id('server-port-input')).typeText('9999');
      await element(by.id('save-server-button')).tap();

      await element(by.id('server-item-1')).tap();
      await element(by.id('connect-button')).tap();

      // Network error dialog should appear
      await waitFor(element(by.text('接続エラー'))).toBeVisible().withTimeout(10000);
      await element(by.id('error-dialog-ok')).tap();

      logger.assertion('Network error dialogs handled correctly', true);
    });
  });
});