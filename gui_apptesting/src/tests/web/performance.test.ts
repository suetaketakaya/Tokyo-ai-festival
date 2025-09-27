/**
 * Web Performance Tests for RemoteClaudeApp
 * Tests page load times, resource optimization, and runtime performance
 */

import puppeteer, { Browser, Page, Metrics } from 'puppeteer';
import { TestLogger } from '../../utils/logger';
import { config } from '../../config/testConfig';

describe('Web Performance Tests', () => {
  const logger = new TestLogger();
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    logger.testStart('Web Performance Test Suite');

    browser = await puppeteer.launch({
      headless: config.webBrowser.headless,
      defaultViewport: {
        width: config.webBrowser.viewport.width,
        height: config.webBrowser.viewport.height
      },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();

    // Enable performance monitoring
    await page.setCacheEnabled(false);
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
    logger.testEnd('Web Performance Test Suite', true);
  });

  beforeEach(async () => {
    await page.goto('about:blank');
  });

  describe('Page Load Performance', () => {
    test('should load main page within acceptable time', async () => {
      logger.step('Testing main page load performance');

      const startTime = Date.now();
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds

      // Get performance metrics
      const metrics = await page.metrics();
      logger.debug('Page metrics:', metrics);

      expect(metrics.ScriptDuration).toBeLessThan(1000); // Script execution under 1 second
      expect(metrics.LayoutDuration).toBeLessThan(500); // Layout under 500ms

      logger.assertion(`Main page loaded in ${loadTime}ms`, loadTime < 5000);
    });

    test('should load server management page efficiently', async () => {
      logger.step('Testing server management page load');

      const startTime = Date.now();
      await page.goto('http://localhost:3000/servers', { waitUntil: 'networkidle2' });
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds

      logger.assertion(`Server management page loaded in ${loadTime}ms`, loadTime < 3000);
    });

    test('should load terminal page with WebSocket connection efficiently', async () => {
      logger.step('Testing terminal page load with WebSocket');

      const startTime = Date.now();
      await page.goto('http://localhost:3000/terminal', { waitUntil: 'networkidle2' });

      // Wait for WebSocket connection
      await page.waitForSelector('.connection-status', { timeout: 10000 });
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(8000); // Should be ready within 8 seconds

      logger.assertion(`Terminal page with WebSocket loaded in ${totalTime}ms`, totalTime < 8000);
    });

    test('should have good Core Web Vitals', async () => {
      logger.step('Testing Core Web Vitals');

      await page.goto('http://localhost:3000');

      // Measure Largest Contentful Paint (LCP)
      const lcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ entryTypes: ['largest-contentful-paint'] });

          // Fallback timeout
          setTimeout(() => resolve(0), 5000);
        });
      });

      // Measure Cumulative Layout Shift (CLS)
      const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
          let cumulativeShift = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                cumulativeShift += (entry as any).value;
              }
            }
            resolve(cumulativeShift);
          }).observe({ entryTypes: ['layout-shift'] });

          // Resolve after 3 seconds
          setTimeout(() => resolve(cumulativeShift), 3000);
        });
      });

      expect(lcp).toBeLessThan(2500); // LCP should be under 2.5 seconds
      expect(cls).toBeLessThan(0.1); // CLS should be under 0.1

      logger.assertion(`Core Web Vitals - LCP: ${lcp}ms, CLS: ${cls}`, true);
    });
  });

  describe('Resource Loading Performance', () => {
    test('should optimize JavaScript bundle size', async () => {
      logger.step('Testing JavaScript bundle optimization');

      const responses: Array<{ url: string, size: number, type: string }> = [];

      page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('.js') && !url.includes('node_modules')) {
          try {
            const buffer = await response.buffer();
            responses.push({
              url,
              size: buffer.length,
              type: 'javascript'
            });
          } catch (error) {
            logger.debug('Failed to get response buffer:', error);
          }
        }
      });

      await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

      const totalJSSize = responses.reduce((total, response) => total + response.size, 0);
      const totalJSSizeKB = totalJSSize / 1024;

      expect(totalJSSizeKB).toBeLessThan(1000); // Total JS should be under 1MB

      logger.assertion(`Total JavaScript size: ${totalJSSizeKB.toFixed(2)}KB`, totalJSSizeKB < 1000);
    });

    test('should optimize CSS loading', async () => {
      logger.step('Testing CSS optimization');

      const cssResponses: Array<{ url: string, size: number }> = [];

      page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('.css')) {
          try {
            const buffer = await response.buffer();
            cssResponses.push({
              url,
              size: buffer.length
            });
          } catch (error) {
            logger.debug('Failed to get CSS response buffer:', error);
          }
        }
      });

      await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

      const totalCSSSize = cssResponses.reduce((total, response) => total + response.size, 0);
      const totalCSSSizeKB = totalCSSSize / 1024;

      expect(totalCSSSizeKB).toBeLessThan(200); // Total CSS should be under 200KB

      logger.assertion(`Total CSS size: ${totalCSSSizeKB.toFixed(2)}KB`, totalCSSSizeKB < 200);
    });

    test('should use efficient image formats and sizes', async () => {
      logger.step('Testing image optimization');

      const imageResponses: Array<{ url: string, size: number, contentType: string }> = [];

      page.on('response', async (response) => {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('image/')) {
          try {
            const buffer = await response.buffer();
            imageResponses.push({
              url: response.url(),
              size: buffer.length,
              contentType
            });
          } catch (error) {
            logger.debug('Failed to get image response buffer:', error);
          }
        }
      });

      await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

      if (imageResponses.length > 0) {
        const totalImageSize = imageResponses.reduce((total, response) => total + response.size, 0);
        const totalImageSizeKB = totalImageSize / 1024;

        expect(totalImageSizeKB).toBeLessThan(500); // Total images should be under 500KB

        logger.assertion(`Found ${imageResponses.length} images, total size: ${totalImageSizeKB.toFixed(2)}KB`, true);
      } else {
        logger.assertion('No images found to optimize', true);
      }
    });

    test('should minimize HTTP requests', async () => {
      logger.step('Testing HTTP request optimization');

      const requests: string[] = [];

      page.on('request', (request) => {
        requests.push(request.url());
      });

      await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

      const uniqueRequests = new Set(requests);
      expect(uniqueRequests.size).toBeLessThan(50); // Should have fewer than 50 unique requests

      logger.assertion(`Total HTTP requests: ${uniqueRequests.size}`, uniqueRequests.size < 50);
    });
  });

  describe('Runtime Performance', () => {
    test('should maintain responsive UI during heavy operations', async () => {
      logger.step('Testing UI responsiveness during operations');

      await page.goto('http://localhost:3000/terminal');
      await page.waitForSelector('.terminal-container', { timeout: 5000 });

      // Start monitoring frame rate
      const frameTimings: number[] = [];
      await page.evaluateOnNewDocument(() => {
        let lastFrameTime = performance.now();
        function measureFrame() {
          const currentTime = performance.now();
          (window as any).frameTimings = (window as any).frameTimings || [];
          (window as any).frameTimings.push(currentTime - lastFrameTime);
          lastFrameTime = currentTime;
          requestAnimationFrame(measureFrame);
        }
        requestAnimationFrame(measureFrame);
      });

      // Perform heavy operations
      for (let i = 0; i < 10; i++) {
        await page.fill('.command-input', `for i in {1..100}; do echo "line $i"; done`);
        await page.click('.execute-button');
        await page.waitForTimeout(500);
      }

      // Get frame timing data
      const frameData = await page.evaluate(() => (window as any).frameTimings || []);
      if (frameData.length > 0) {
        const averageFrameTime = frameData.reduce((sum: number, time: number) => sum + time, 0) / frameData.length;
        const fps = 1000 / averageFrameTime;

        expect(fps).toBeGreaterThan(30); // Should maintain at least 30 FPS

        logger.assertion(`Average FPS during operations: ${fps.toFixed(2)}`, fps > 30);
      } else {
        logger.assertion('Frame timing data not available', true);
      }
    });

    test('should handle memory efficiently during extended use', async () => {
      logger.step('Testing memory efficiency');

      await page.goto('http://localhost:3000/terminal');

      // Get initial memory usage
      const initialMetrics = await page.metrics();
      const initialMemory = initialMetrics.JSHeapUsedSize;

      // Perform operations for extended period
      for (let i = 0; i < 50; i++) {
        await page.fill('.command-input', `echo "test operation ${i}"`);
        await page.click('.execute-button');
        await page.waitForTimeout(100);

        if (i % 10 === 0) {
          // Force garbage collection if possible
          await page.evaluate(() => {
            if ((window as any).gc) {
              (window as any).gc();
            }
          });
        }
      }

      // Get final memory usage
      const finalMetrics = await page.metrics();
      const finalMemory = finalMetrics.JSHeapUsedSize;

      const memoryGrowth = ((finalMemory - initialMemory) / initialMemory) * 100;

      expect(memoryGrowth).toBeLessThan(200); // Memory growth should be less than 200%

      logger.assertion(`Memory growth: ${memoryGrowth.toFixed(2)}%`, memoryGrowth < 200);
    });

    test('should handle rapid user interactions efficiently', async () => {
      logger.step('Testing rapid interaction performance');

      await page.goto('http://localhost:3000');

      const startTime = Date.now();

      // Perform rapid navigation
      const navItems = ['a[href="/servers"]', 'a[href="/terminal"]', 'a[href="/settings"]'];
      for (let i = 0; i < 30; i++) {
        const navItem = navItems[i % navItems.length];
        await page.click(navItem);
        await page.waitForTimeout(50);
      }

      const totalTime = Date.now() - startTime;
      const averageInteractionTime = totalTime / 30;

      expect(averageInteractionTime).toBeLessThan(200); // Average interaction should be under 200ms

      logger.assertion(`Average interaction time: ${averageInteractionTime.toFixed(2)}ms`, averageInteractionTime < 200);
    });

    test('should optimize WebSocket message processing', async () => {
      logger.step('Testing WebSocket message processing performance');

      await page.goto('http://localhost:3000/terminal');
      await page.waitForSelector('.terminal-container', { timeout: 5000 });

      // Connect to server if needed
      const connectButton = await page.$('.connect-server-button');
      if (connectButton) {
        await connectButton.click();
        await page.waitForSelector('.connected-indicator', { timeout: 10000 });
      }

      const startTime = Date.now();
      const messageCount = 20;

      // Send rapid messages
      for (let i = 0; i < messageCount; i++) {
        await page.fill('.command-input', `echo "rapid message ${i}"`);
        await page.click('.execute-button');
        await page.waitForTimeout(100);
      }

      // Wait for all messages to be processed
      await page.waitForTimeout(5000);

      const totalTime = Date.now() - startTime;
      const messagesPerSecond = (messageCount / totalTime) * 1000;

      expect(messagesPerSecond).toBeGreaterThan(2); // Should process at least 2 messages per second

      logger.assertion(`WebSocket message throughput: ${messagesPerSecond.toFixed(2)} msg/sec`, messagesPerSecond > 2);
    });
  });

  describe('Mobile Performance', () => {
    test('should perform well on mobile devices', async () => {
      logger.step('Testing mobile performance');

      // Simulate mobile device
      await page.emulate({
        name: 'iPhone 12',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        viewport: {
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
          isMobile: true,
          hasTouch: true
        }
      });

      // Throttle CPU to simulate mobile performance
      const client = await page.target().createCDPSession();
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

      const startTime = Date.now();
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(8000); // Should load within 8 seconds on mobile

      logger.assertion(`Mobile load time: ${loadTime}ms`, loadTime < 8000);

      // Restore normal CPU
      await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    });

    test('should handle touch interactions efficiently', async () => {
      logger.step('Testing touch interaction performance');

      await page.setViewport({ width: 375, height: 667 });
      await page.goto('http://localhost:3000');

      const touchTargets = await page.$$('button, a, [role="button"]');

      const touchStartTime = Date.now();
      for (let i = 0; i < Math.min(10, touchTargets.length); i++) {
        await touchTargets[i].tap();
        await page.waitForTimeout(100);
      }
      const touchTotalTime = Date.now() - touchStartTime;

      const averageTouchTime = touchTotalTime / Math.min(10, touchTargets.length);
      expect(averageTouchTime).toBeLessThan(300); // Touch response should be under 300ms

      logger.assertion(`Average touch response: ${averageTouchTime.toFixed(2)}ms`, averageTouchTime < 300);
    });
  });

  describe('Network Performance', () => {
    test('should handle slow network conditions', async () => {
      logger.step('Testing slow network performance');

      // Simulate slow 3G connection
      const client = await page.target().createCDPSession();
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 500 * 1024 / 8, // 500 kbps
        uploadThroughput: 500 * 1024 / 8,
        latency: 300
      });

      const startTime = Date.now();
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(15000); // Should load within 15 seconds on slow 3G

      logger.assertion(`Slow network load time: ${loadTime}ms`, loadTime < 15000);

      // Restore normal network
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0
      });
    });

    test('should optimize for offline-first experience', async () => {
      logger.step('Testing offline-first optimization');

      await page.goto('http://localhost:3000');
      await page.waitForSelector('.main-content', { timeout: 5000 });

      // Go offline
      await page.setOfflineMode(true);

      // Test if basic functionality still works
      const offlineIndicator = await page.waitForSelector('.offline-indicator', { timeout: 5000 });
      expect(offlineIndicator).toBeTruthy();

      // Test if cached content is available
      const cachedContent = await page.isVisible('.main-content');
      expect(cachedContent).toBe(true);

      // Go back online
      await page.setOfflineMode(false);

      logger.assertion('Offline-first experience optimized', true);
    });
  });
});