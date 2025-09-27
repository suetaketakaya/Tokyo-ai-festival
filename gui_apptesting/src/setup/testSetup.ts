/**
 * Global test setup for RemoteClaudeApp System Integration Tests
 */

import { config } from '../config/testConfig';
import { TestLogger } from '../utils/logger';
import { TestEnvironment } from '../utils/environment';

// Global test timeout
jest.setTimeout(config.timeouts.default);

// Global test logger
const logger = new TestLogger();

// Setup global test environment
beforeAll(async () => {
  logger.info('🚀 Starting RemoteClaudeApp System Integration Tests');
  logger.info(`📊 Test Environment: ${process.env.NODE_ENV || 'test'}`);

  try {
    // Initialize test environment
    await TestEnvironment.setup();
    logger.info('✅ Test environment initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize test environment:', error);
    throw error;
  }
});

// Cleanup after all tests
afterAll(async () => {
  logger.info('🧹 Cleaning up test environment');

  try {
    await TestEnvironment.cleanup();
    logger.info('✅ Test environment cleaned up successfully');
  } catch (error) {
    logger.error('❌ Failed to cleanup test environment:', error);
  }

  logger.info('🏁 RemoteClaudeApp System Integration Tests completed');
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toHaveValidWebSocketConnection(received: any) {
    const isValid = received &&
                   received.readyState === 1 && // WebSocket.OPEN
                   typeof received.send === 'function' &&
                   typeof received.close === 'function';

    if (isValid) {
      return {
        message: () => `expected WebSocket not to be valid`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected WebSocket to be valid (readyState: ${received?.readyState})`,
        pass: false,
      };
    }
  },

  toContainValidJSON(received: string) {
    try {
      JSON.parse(received);
      return {
        message: () => `expected "${received}" not to contain valid JSON`,
        pass: true,
      };
    } catch {
      return {
        message: () => `expected "${received}" to contain valid JSON`,
        pass: false,
      };
    }
  }
});

// Global test utilities
global.testUtils = {
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  waitForCondition: async (condition: () => boolean | Promise<boolean>, timeout = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  },

  generateTestId: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  createMockWebSocketMessage: (type: string, data: any = {}) => ({
    type,
    data,
    timestamp: new Date().toISOString(),
    id: global.testUtils.generateTestId()
  })
};

export {};