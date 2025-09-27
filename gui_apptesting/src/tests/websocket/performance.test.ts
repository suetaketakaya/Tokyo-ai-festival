/**
 * WebSocket Performance Tests for RemoteClaudeApp
 */

import WebSocket from 'ws';
import { config, getWebSocketUrl } from '../../config/testConfig';
import { TestLogger } from '../../utils/logger';
import { TestEnvironment } from '../../utils/environment';

describe('WebSocket Performance Tests', () => {
  const logger = new TestLogger();
  let ws: WebSocket | null = null;

  beforeEach(async () => {
    const url = getWebSocketUrl('primary');
    ws = await createWebSocketConnection(url);
  });

  afterEach(async () => {
    if (ws) {
      ws.close();
      ws = null;
    }
    await global.testUtils.wait(500);
  });

  describe('Latency Tests', () => {
    test('should measure ping latency', async () => {
      logger.step('Measuring ping latency over 10 samples');

      const latencies: number[] = [];
      const sampleCount = 10;

      for (let i = 0; i < sampleCount; i++) {
        const startTime = Date.now();
        const pingMessage = {
          type: 'ping',
          data: { timestamp: startTime }
        };

        await sendMessageAndWaitForResponse(ws!, pingMessage, 'pong');
        const latency = Date.now() - startTime;
        latencies.push(latency);

        logger.debug(`Ping ${i + 1}: ${latency}ms`);
        await global.testUtils.wait(100);
      }

      const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const minLatency = Math.min(...latencies);
      const maxLatency = Math.max(...latencies);

      expect(avgLatency).toBeLessThan(1000); // Average should be under 1 second
      expect(maxLatency).toBeLessThan(2000); // Max should be under 2 seconds

      logger.assertion(
        `Latency metrics - Avg: ${avgLatency.toFixed(2)}ms, Min: ${minLatency}ms, Max: ${maxLatency}ms`,
        true,
        { avgLatency, minLatency, maxLatency, samples: latencies }
      );
    });

    test('should measure command execution latency', async () => {
      logger.step('Measuring command execution latency');

      const commands = [
        'echo "test"',
        'pwd',
        'ls',
        'date',
        'whoami'
      ];

      const results: Array<{ command: string; latency: number; success: boolean }> = [];

      for (const command of commands) {
        const startTime = Date.now();
        const executeMessage = {
          type: 'claude_execute',
          data: {
            project_id: 'test-project',
            command,
            context: { current_dir: '/test' }
          }
        };

        try {
          await sendMessageAndWaitForResponse(
            ws!,
            executeMessage,
            ['claude_output', 'claude_error'],
            10000
          );

          const latency = Date.now() - startTime;
          results.push({ command, latency, success: true });
          logger.debug(`Command "${command}" executed in ${latency}ms`);
        } catch (error) {
          results.push({ command, latency: -1, success: false });
          logger.warn(`Command "${command}" failed:`, error);
        }

        await global.testUtils.wait(200);
      }

      const successfulResults = results.filter(r => r.success);
      const avgExecutionTime = successfulResults.length > 0 ?
        successfulResults.reduce((sum, r) => sum + r.latency, 0) / successfulResults.length : 0;

      expect(successfulResults.length).toBeGreaterThan(0);
      expect(avgExecutionTime).toBeLessThan(5000); // Average execution under 5 seconds

      logger.assertion(
        `Command execution - ${successfulResults.length}/${results.length} successful, avg: ${avgExecutionTime.toFixed(2)}ms`,
        true,
        results
      );
    });
  });

  describe('Throughput Tests', () => {
    test('should handle high message throughput', async () => {
      logger.step('Testing high message throughput (100 messages/second)');

      const messageCount = 100;
      const testDuration = 1000; // 1 second
      const interval = testDuration / messageCount;

      const sentMessages: any[] = [];
      const receivedMessages: any[] = [];
      const startTime = Date.now();

      // Set up message handler
      const messageHandler = (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'pong') {
            receivedMessages.push({
              ...message,
              receivedAt: Date.now()
            });
          }
        } catch (error) {
          // Ignore parsing errors
        }
      };

      ws!.on('message', messageHandler);

      // Send messages at high rate
      for (let i = 0; i < messageCount; i++) {
        const message = {
          type: 'ping',
          data: {
            timestamp: Date.now(),
            sequence: i
          }
        };

        ws!.send(JSON.stringify(message));
        sentMessages.push({ ...message, sentAt: Date.now() });

        if (i < messageCount - 1) {
          await global.testUtils.wait(interval);
        }
      }

      // Wait for all responses
      await global.testUtils.waitForCondition(
        () => receivedMessages.length >= messageCount * 0.9, // Allow 10% loss
        5000
      );

      const actualDuration = Date.now() - startTime;
      const throughput = sentMessages.length / (actualDuration / 1000);
      const responseRate = receivedMessages.length / sentMessages.length;

      expect(responseRate).toBeGreaterThan(0.9); // At least 90% response rate
      expect(throughput).toBeGreaterThan(80); // At least 80 messages/second

      logger.assertion(
        `Throughput test - Sent: ${sentMessages.length}, Received: ${receivedMessages.length}, Rate: ${throughput.toFixed(2)} msg/s`,
        true,
        { throughput, responseRate, duration: actualDuration }
      );

      ws!.off('message', messageHandler);
    }, 10000);

    test('should handle large message payloads', async () => {
      logger.step('Testing large message payload handling');

      const payloadSizes = [1024, 10240, 102400, 1048576]; // 1KB, 10KB, 100KB, 1MB
      const results: Array<{ size: number; success: boolean; latency: number }> = [];

      for (const size of payloadSizes) {
        const largePayload = 'x'.repeat(size);
        const startTime = Date.now();

        const message = {
          type: 'ping',
          data: {
            timestamp: startTime,
            payload: largePayload,
            size
          }
        };

        try {
          await sendMessageAndWaitForResponse(ws!, message, 'pong', 15000);
          const latency = Date.now() - startTime;
          results.push({ size, success: true, latency });
          logger.debug(`Large payload ${size} bytes processed in ${latency}ms`);
        } catch (error) {
          results.push({ size, success: false, latency: -1 });
          logger.warn(`Large payload ${size} bytes failed:`, error);
        }

        await global.testUtils.wait(500);
      }

      const successfulResults = results.filter(r => r.success);
      expect(successfulResults.length).toBeGreaterThan(payloadSizes.length / 2);

      logger.assertion(
        `Large payload test - ${successfulResults.length}/${results.length} successful`,
        true,
        results
      );
    }, 30000);
  });

  describe('Resource Usage Tests', () => {
    test('should monitor memory usage during extended operation', async () => {
      logger.step('Monitoring memory usage during extended operation');

      const initialMemory = process.memoryUsage();
      const measurements: Array<{ time: number; memory: NodeJS.MemoryUsage }> = [];

      // Perform sustained operations for 60 seconds
      const testDuration = 60000;
      const startTime = Date.now();
      let messageCount = 0;

      while (Date.now() - startTime < testDuration) {
        // Send ping every 100ms
        const pingMessage = {
          type: 'ping',
          data: { timestamp: Date.now(), sequence: messageCount++ }
        };

        try {
          await sendMessageAndWaitForResponse(ws!, pingMessage, 'pong', 2000);
        } catch (error) {
          logger.warn('Ping failed during memory test', error);
        }

        // Record memory usage every 10 seconds
        if (messageCount % 100 === 0) {
          measurements.push({
            time: Date.now() - startTime,
            memory: process.memoryUsage()
          });
        }

        await global.testUtils.wait(100);
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);

      // Memory growth should be reasonable (less than 50MB for this test)
      expect(memoryGrowthMB).toBeLessThan(50);

      logger.assertion(
        `Memory usage - Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, ` +
        `Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, ` +
        `Growth: ${memoryGrowthMB.toFixed(2)}MB, Messages: ${messageCount}`,
        true,
        { initialMemory, finalMemory, measurements, messageCount }
      );
    }, 70000);

    test('should handle connection stress test', async () => {
      logger.step('Performing connection stress test');

      const connectionCount = 10;
      const connectionsPerSecond = 2;
      const connections: WebSocket[] = [];
      const results: Array<{ index: number; success: boolean; error?: string }> = [];

      // Create connections gradually
      for (let i = 0; i < connectionCount; i++) {
        try {
          const url = getWebSocketUrl(i % 2 === 0 ? 'primary' : 'secondary');
          const connection = await createWebSocketConnection(url, 3000);
          connections.push(connection);
          results.push({ index: i, success: true });
          logger.debug(`Created connection ${i + 1}/${connectionCount}`);
        } catch (error) {
          results.push({
            index: i,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          logger.warn(`Failed to create connection ${i + 1}:`, error);
        }

        if (i < connectionCount - 1) {
          await global.testUtils.wait(1000 / connectionsPerSecond);
        }
      }

      // Test all connections simultaneously
      const pingPromises = connections.map((conn, index) => {
        const pingMessage = {
          type: 'ping',
          data: { timestamp: Date.now(), connectionIndex: index }
        };
        return sendMessageAndWaitForResponse(conn, pingMessage, 'pong', 5000)
          .then(() => ({ index, success: true }))
          .catch(error => ({ index, success: false, error: error.message }));
      });

      const pingResults = await Promise.allSettled(pingPromises);
      const successfulPings = pingResults.filter(r => r.status === 'fulfilled').length;

      const successfulConnections = results.filter(r => r.success).length;
      expect(successfulConnections).toBeGreaterThan(connectionCount * 0.8); // At least 80% success

      logger.assertion(
        `Stress test - ${successfulConnections}/${connectionCount} connections, ${successfulPings}/${connections.length} pings`,
        true,
        { connectionResults: results, pingResults }
      );

      // Cleanup
      connections.forEach(conn => {
        try {
          conn.close();
        } catch (error) {
          // Ignore cleanup errors
        }
      });
    }, 30000);
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
        resolve(ws);
      });

      ws.on('error', (error) => {
        clearTimeout(timeoutId);
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
            resolve(response);
          }
        } catch (error) {
          // Ignore parsing errors, continue waiting
        }
      };

      ws.on('message', messageHandler);
      ws.send(JSON.stringify(message));
    });
  }
});