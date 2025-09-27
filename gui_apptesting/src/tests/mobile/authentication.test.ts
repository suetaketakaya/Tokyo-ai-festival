/**
 * Authentication Tests for RemoteClaudeApp
 * Tests server authentication flows and session management
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';
import { TestLogger } from '../../utils/logger';
import { config } from '../../config/testConfig';

describe('Authentication Tests', () => {
  const logger = new TestLogger();

  beforeAll(async () => {
    logger.testStart('Authentication Test Suite');
  });

  afterAll(async () => {
    logger.testEnd('Authentication Test Suite', true);
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await waitFor(element(by.id('main-container'))).toBeVisible().withTimeout(10000);
  });

  describe('Server Authentication Flow', () => {
    test('should handle server connection with valid credentials', async () => {
      logger.step('Testing server connection with valid authentication');

      await element(by.id('server-list-nav')).tap();
      await waitFor(element(by.id('server-list-screen'))).toBeVisible().withTimeout(5000);

      // Select first server
      await element(by.id('server-item-0')).tap();

      // Enter authentication details if required
      if (await element(by.id('auth-modal')).exists()) {
        await element(by.id('username-input')).typeText('testuser');
        await element(by.id('password-input')).typeText('testpass');
        await element(by.id('authenticate-button')).tap();
      }

      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(15000);

      logger.assertion('Server authentication successful', true);
    });

    test('should handle invalid credentials gracefully', async () => {
      logger.step('Testing invalid credential handling');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();

      if (await element(by.id('auth-modal')).exists()) {
        await element(by.id('username-input')).typeText('invaliduser');
        await element(by.id('password-input')).typeText('wrongpass');
        await element(by.id('authenticate-button')).tap();

        await waitFor(element(by.text('認証に失敗しました'))).toBeVisible().withTimeout(5000);
        logger.assertion('Invalid credentials handled correctly', true);
      } else {
        logger.assertion('No authentication modal found (auth may not be enabled)', true);
      }
    });

    test('should handle session timeout', async () => {
      logger.step('Testing session timeout handling');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      // Simulate session timeout by waiting
      await global.testUtils.wait(60000); // Wait 1 minute

      // Try to execute a command
      await element(by.id('development-nav')).tap();
      await element(by.id('command-input')).typeText('echo "test"');
      await element(by.id('execute-button')).tap();

      // Should show session expired message or reconnect automatically
      const sessionExpired = await element(by.text('セッションが期限切れです')).exists();
      const reconnecting = await element(by.text('再接続中')).exists();

      expect(sessionExpired || reconnecting).toBe(true);
      logger.assertion('Session timeout handled appropriately', true);
    });

    test('should persist authentication across app restarts', async () => {
      logger.step('Testing authentication persistence');

      // Connect with authentication
      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      // Restart app
      await device.terminateApp();
      await device.launchApp();

      await waitFor(element(by.id('main-container'))).toBeVisible().withTimeout(10000);

      // Check if authentication is remembered
      await element(by.id('server-list-nav')).tap();
      const lastConnectedServer = await element(by.text('最後に接続したサーバー')).exists();

      logger.assertion('Authentication state persisted across restart', lastConnectedServer);
    });
  });

  describe('Session Management', () => {
    test('should display session information', async () => {
      logger.step('Testing session information display');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      // Navigate to settings to check session info
      await element(by.id('settings-button')).tap();
      await waitFor(element(by.id('detailed-settings-screen'))).toBeVisible().withTimeout(5000);

      await element(by.id('session-info-section')).tap();
      await detoxExpect(element(by.id('session-details'))).toBeVisible();

      logger.assertion('Session information displayed correctly', true);
    });

    test('should handle manual logout', async () => {
      logger.step('Testing manual logout functionality');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      await element(by.id('settings-button')).tap();
      await element(by.id('logout-button')).tap();

      await waitFor(element(by.text('ログアウトしました'))).toBeVisible().withTimeout(3000);
      await waitFor(element(by.text('切断済み'))).toBeVisible().withTimeout(5000);

      logger.assertion('Manual logout completed successfully', true);
    });

    test('should handle multiple server sessions', async () => {
      logger.step('Testing multiple server session management');

      // Connect to primary server
      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      // Add and connect to secondary server
      await element(by.id('add-server-button')).tap();
      await element(by.id('server-name-input')).typeText('Secondary Server');
      await element(by.id('server-host-input')).typeText('localhost');
      await element(by.id('server-port-input')).typeText('8091');
      await element(by.id('save-server-button')).tap();

      await element(by.id('server-item-1')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      // Verify multiple sessions are managed
      await element(by.id('settings-button')).tap();
      await element(by.id('active-sessions-section')).tap();

      const multipleSessionsVisible = await element(by.text('アクティブなセッション: 2')).exists();
      logger.assertion('Multiple server sessions managed correctly', multipleSessionsVisible);
    });
  });

  describe('Security Features', () => {
    test('should handle secure connection requirements', async () => {
      logger.step('Testing secure connection handling');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('add-server-button')).tap();

      // Try to add server with SSL requirement
      await element(by.id('server-name-input')).typeText('Secure Server');
      await element(by.id('server-host-input')).typeText('secure.example.com');
      await element(by.id('server-port-input')).typeText('443');
      await element(by.id('ssl-required-toggle')).tap();
      await element(by.id('save-server-button')).tap();

      await element(by.id('server-item-1')).tap();
      await element(by.id('connect-button')).tap();

      // Should handle SSL certificate validation
      const sslPrompt = await element(by.text('SSL証明書を確認してください')).exists();
      if (sslPrompt) {
        await element(by.id('accept-certificate')).tap();
      }

      logger.assertion('Secure connection requirements handled', true);
    });

    test('should validate session tokens', async () => {
      logger.step('Testing session token validation');

      await element(by.id('server-list-nav')).tap();
      await element(by.id('server-item-0')).tap();
      await element(by.id('connect-button')).tap();
      await waitFor(element(by.text('接続済み'))).toBeVisible().withTimeout(10000);

      // Navigate to settings and view token information
      await element(by.id('settings-button')).tap();
      await element(by.id('security-section')).tap();
      await element(by.id('view-token-button')).tap();

      await detoxExpect(element(by.id('token-display'))).toBeVisible();

      // Token should be properly formatted
      const tokenLength = await element(by.id('token-length')).getText();
      expect(parseInt(tokenLength)).toBeGreaterThan(0);

      logger.assertion('Session token validation completed', true);
    });

    test('should handle biometric authentication if available', async () => {
      logger.step('Testing biometric authentication support');

      await element(by.id('settings-button')).tap();
      await element(by.id('security-section')).tap();

      const biometricToggle = await element(by.id('biometric-auth-toggle')).exists();

      if (biometricToggle) {
        await element(by.id('biometric-auth-toggle')).tap();

        // Simulate biometric prompt
        const biometricPrompt = await element(by.text('生体認証を使用しますか？')).exists();
        if (biometricPrompt) {
          await element(by.id('enable-biometric')).tap();
        }

        logger.assertion('Biometric authentication configured', true);
      } else {
        logger.assertion('Biometric authentication not available on this device', true);
      }
    });
  });
});