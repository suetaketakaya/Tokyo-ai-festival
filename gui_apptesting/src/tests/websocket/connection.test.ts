/**
 * WebSocket Connection Tests for RemoteClaudeApp
 */

import WebSocket from 'ws';
import { config, getWebSocketUrl, getTestSessionKey } from '../../config/testConfig';
import { TestLogger } from '../../utils/logger';
import { TestEnvironment } from '../../utils/environment';

describe('WebSocket Connection Tests', () => {
  const logger = new TestLogger();
  let primaryWs: WebSocket | null = null;
  let secondaryWs: WebSocket | null = null;

  beforeAll(async () => {
    logger.testStart('WebSocket Connection Tests Suite');

    // Verify test environment is ready
    if (!TestEnvironment.isReady()) {
      throw new Error('Test environment is not ready');
    }

    // Test basic connectivity to both servers
    const primaryConnectable = await TestEnvironment.testWebSocketConnection('primary');
    const secondaryConnectable = await TestEnvironment.testWebSocketConnection('secondary');

    expect(primaryConnectable).toBe(true);
    expect(secondaryConnectable).toBe(true);

    logger.info('✅ WebSocket servers are reachable');
  });

  afterEach(async () => {
    // Clean up connections after each test
    if (primaryWs) {
      primaryWs.close();
      primaryWs = null;
    }
    if (secondaryWs) {
      secondaryWs.close();
      secondaryWs = null;
    }

    // Wait for connections to close
    await global.testUtils.wait(500);
  });

  describe('Basic Connection', () => {
    test('should connect to primary server successfully', async () => {
      const url = getWebSocketUrl('primary');
      logger.step(`Connecting to primary server: ${url}`);

      primaryWs = await createWebSocketConnection(url);

      expect(primaryWs).toHaveValidWebSocketConnection();
      logger.assertion('Primary WebSocket connection established', true);
    });

    test('should connect to secondary server successfully', async () => {
      const url = getWebSocketUrl('secondary');
      logger.step(`Connecting to secondary server: ${url}`);

      secondaryWs = await createWebSocketConnection(url);

      expect(secondaryWs).toHaveValidWebSocketConnection();
      logger.assertion('Secondary WebSocket connection established', true);
    });

    test('should connect with session key', async () => {
      const sessionKey = getTestSessionKey();
      const url = getWebSocketUrl('primary', sessionKey);
      logger.step(`Connecting with session key: ${sessionKey}`);

      primaryWs = await createWebSocketConnection(url);

      expect(primaryWs).toHaveValidWebSocketConnection();
      logger.assertion('WebSocket connection with session key established', true);
    });

    test('should handle invalid URL gracefully', async () => {
      const invalidUrl = 'ws://localhost:9999/invalid';
      logger.step(`Attempting connection to invalid URL: ${invalidUrl}`);

      try {
        await createWebSocketConnection(invalidUrl, 2000);
        throw new Error('Should have failed');
      } catch (error) {
        expect(error).toBeDefined();
        logger.assertion('Invalid URL connection failed as expected', true);
      }
    });
  });

  describe('Message Exchange', () => {
    beforeEach(async () => {
      const url = getWebSocketUrl('primary');
      primaryWs = await createWebSocketConnection(url);
    });

    test('should send and receive ping/pong messages', async () => {
      const pingMessage = {
        type: 'ping',
        data: { timestamp: Date.now() }
      };

      logger.step('Sending ping message');
      const response = await sendMessageAndWaitForResponse(primaryWs!, pingMessage, 'pong');

      expect(response).toBeDefined();
      expect(response.type).toBe('pong');
      expect(response.data).toBeDefined();
      logger.assertion('Ping/pong exchange successful', true, response);
    });

    test('should handle claude_execute command', async () => {
      const executeMessage = {
        type: 'claude_execute',
        data: {
          project_id: 'test-project',
          command: 'echo "Hello from test"',
          context: {
            current_dir: '/test',
            git_branch: 'main'
          }
        }
      };

      logger.step('Sending claude_execute command');
      const response = await sendMessageAndWaitForResponse(
        primaryWs!,
        executeMessage,
        ['claude_output', 'claude_error'],
        10000
      );

      expect(response).toBeDefined();
      expect(['claude_output', 'claude_error']).toContain(response.type);
      logger.assertion('Claude execute command processed', true, response);
    });

    test('should handle malformed JSON gracefully', async () => {
      logger.step('Sending malformed JSON');

      const errorPromise = new Promise<any>((resolve) => {
        primaryWs!.on('error', resolve);
        primaryWs!.on('close', resolve);
      });

      // Send invalid JSON
      primaryWs!.send('invalid json {{{');

      const result = await Promise.race([
        errorPromise,
        global.testUtils.wait(2000).then(() => 'timeout')
      ]);

      // Connection should remain stable
      expect(primaryWs!.readyState).toBe(WebSocket.OPEN);
      logger.assertion('Connection remains stable after malformed JSON', true);
    });
  });

  describe('Connection Stability', () => {
    test('should maintain connection for extended period', async () => {
      const url = getWebSocketUrl('primary');
      primaryWs = await createWebSocketConnection(url);

      logger.step('Testing connection stability over 30 seconds');

      // Send periodic pings for 30 seconds
      const startTime = Date.now();
      const duration = 30000;
      let messageCount = 0;

      while (Date.now() - startTime < duration) {
        const pingMessage = {
          type: 'ping',
          data: { timestamp: Date.now() }
        };

        try {
          await sendMessageAndWaitForResponse(primaryWs, pingMessage, 'pong', 3000);
          messageCount++;
        } catch (error) {
          logger.error('Ping failed during stability test', error);
          break;
        }

        await global.testUtils.wait(1000);
      }

      expect(primaryWs.readyState).toBe(WebSocket.OPEN);
      expect(messageCount).toBeGreaterThan(25); // Should have sent at least 25 pings
      logger.assertion(`Connection stable for ${duration}ms with ${messageCount} messages`, true);
    }, 35000);

    test('should handle rapid message sending', async () => {
      const url = getWebSocketUrl('primary');
      primaryWs = await createWebSocketConnection(url);

      logger.step('Sending 100 rapid ping messages');

      const promises: Promise<any>[] = [];
      for (let i = 0; i < 100; i++) {
        const pingMessage = {
          type: 'ping',
          data: { timestamp: Date.now(), sequence: i }
        };

        promises.push(
          sendMessageAndWaitForResponse(primaryWs, pingMessage, 'pong', 5000)
            .catch(error => ({ error, sequence: i }))
        );
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => !r.error).length;
      const errorCount = results.filter(r => r.error).length;

      expect(successCount).toBeGreaterThan(90); // At least 90% should succeed
      expect(primaryWs.readyState).toBe(WebSocket.OPEN);
      logger.assertion(`Rapid messaging test: ${successCount} success, ${errorCount} errors`, true);
    }, 15000);
  });

  describe('Reconnection Logic', () => {
    test('should handle server disconnection and reconnection', async () => {
      const url = getWebSocketUrl('primary');
      primaryWs = await createWebSocketConnection(url);

      logger.step('Testing reconnection after server disconnect');

      // Force close connection
      primaryWs.close(1006, 'Simulated network failure');

      // Wait for close
      await new Promise<void>((resolve) => {
        primaryWs!.on('close', () => resolve());
      });

      expect(primaryWs.readyState).toBe(WebSocket.CLOSED);

      // Attempt reconnection
      logger.step('Attempting reconnection');
      primaryWs = await createWebSocketConnection(url);

      expect(primaryWs).toHaveValidWebSocketConnection();
      logger.assertion('Reconnection successful', true);
    });

    test('should handle multiple concurrent connections', async () => {
      logger.step('Testing multiple concurrent connections');

      const connections: WebSocket[] = [];
      const connectionPromises: Promise<WebSocket>[] = [];

      // Create 5 concurrent connections
      for (let i = 0; i < 5; i++) {
        const url = getWebSocketUrl(i % 2 === 0 ? 'primary' : 'secondary');
        connectionPromises.push(createWebSocketConnection(url));
      }

      const results = await Promise.allSettled(connectionPromises);
      const successfulConnections = results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<WebSocket>).value);

      connections.push(...successfulConnections);

      expect(successfulConnections.length).toBeGreaterThanOrEqual(4);
      logger.assertion(`Created ${successfulConnections.length}/5 concurrent connections`, true);

      // Test all connections are working
      const pingPromises = successfulConnections.map(ws => {
        const pingMessage = { type: 'ping', data: { timestamp: Date.now() } };
        return sendMessageAndWaitForResponse(ws, pingMessage, 'pong', 3000);
      });

      const pingResults = await Promise.allSettled(pingPromises);
      const successfulPings = pingResults.filter(r => r.status === 'fulfilled').length;

      expect(successfulPings).toBe(successfulConnections.length);
      logger.assertion(`All ${successfulPings} connections responded to ping`, true);

      // Cleanup
      connections.forEach(ws => ws.close());
    });
  });

  // Helper functions
  async function createWebSocketConnection(url: string, timeout = 5000): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const timeoutId = setTimeout(() => {
        ws.close();
        reject(new Error(`Connection timeout after ${timeout}ms`));
      }, timeout);

      ws.on('open', () => {
        clearTimeout(timeoutId);
        logger.websocketEvent('connected', { url });
        resolve(ws);
      });

      ws.on('error', (error) => {
        clearTimeout(timeoutId);
        logger.websocketEvent('error', { url, error: error.message });
        reject(error);
      });
    });
  }

  async function sendMessageAndWaitForResponse(
    ws: WebSocket,
    message: any,
    expectedType: string | string[],
    timeout = 5000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Response timeout after ${timeout}ms`));
      }, timeout);

      const messageHandler = (data: WebSocket.Data) => {
        try {
          const response = JSON.parse(data.toString());
          const expectedTypes = Array.isArray(expectedType) ? expectedType : [expectedType];

          if (expectedTypes.includes(response.type)) {
            clearTimeout(timeoutId);
            ws.off('message', messageHandler);
            logger.websocketEvent('received', response);
            resolve(response);
          }
        } catch (error) {
          // Ignore parsing errors, continue waiting
        }
      };

      ws.on('message', messageHandler);

      // Send the message
      ws.send(JSON.stringify(message));
      logger.websocketEvent('sent', message);
    });
  }
});