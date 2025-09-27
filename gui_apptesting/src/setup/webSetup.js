/**
 * Web Test Setup Configuration
 */

const { TestEnvironment } = require('../utils/environment');

// Set the default timeout for all tests
jest.setTimeout(120000);

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

beforeAll(async () => {
  await TestEnvironment.setup();
});

afterAll(async () => {
  await TestEnvironment.cleanup();
});