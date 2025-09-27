/**
 * Detox Setup Configuration
 */

const detox = require('detox');
const adapter = require('detox/runners/jest/adapter');
const specReporter = require('detox/runners/jest/specReporter');
const { TestEnvironment } = require('../utils/environment');

const config = require('../../package.json').detox;

// Set the default timeout for all tests
jest.setTimeout(300000);

// Enable test utilities globally
global.testUtils = {
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  waitForCondition: async (condition, timeout = 10000, interval = 500) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await global.testUtils.wait(interval);
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  }
};

jasmine.getEnv().addReporter(adapter);

// Add custom matchers for Detox
expect.extend({
  toHaveValidWebSocketConnection(ws) {
    const pass = ws && ws.readyState === 1; // WebSocket.OPEN
    if (pass) {
      return {
        message: () => `Expected WebSocket not to be in OPEN state`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected WebSocket to be in OPEN state but was ${ws ? ws.readyState : 'null'}`,
        pass: false,
      };
    }
  }
});

beforeAll(async () => {
  await TestEnvironment.setup();
  await detox.init(config, { initGlobals: false });
  await device.launchApp();
});

beforeEach(async () => {
  await adapter.beforeEach();
});

afterAll(async () => {
  await adapter.afterAll();
  await detox.cleanup();
  await TestEnvironment.cleanup();
});

afterEach(async () => {
  await adapter.afterEach();
});