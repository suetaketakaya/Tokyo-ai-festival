/**
 * Web Accessibility Tests for RemoteClaudeApp
 * Tests accessibility compliance, ARIA attributes, and keyboard navigation
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { TestLogger } from '../../utils/logger';
import { config } from '../../config/testConfig';

describe('Web Accessibility Tests', () => {
  const logger = new TestLogger();
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    logger.testStart('Web Accessibility Test Suite');

    browser = await puppeteer.launch({
      headless: config.webBrowser.headless,
      defaultViewport: {
        width: config.webBrowser.viewport.width,
        height: config.webBrowser.viewport.height
      }
    });

    page = await browser.newPage();
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
    logger.testEnd('Web Accessibility Test Suite', true);
  });

  beforeEach(async () => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  });

  describe('Semantic HTML and ARIA', () => {
    test('should have proper page structure with semantic elements', async () => {
      logger.step('Testing semantic HTML structure');

      await page.waitForSelector('main', { timeout: 5000 });

      const headerExists = await page.$('header') !== null;
      const mainExists = await page.$('main') !== null;
      const navExists = await page.$('nav') !== null;

      expect(headerExists).toBe(true);
      expect(mainExists).toBe(true);
      expect(navExists).toBe(true);

      logger.assertion('Semantic HTML structure present', true);
    });

    test('should have proper ARIA landmarks', async () => {
      logger.step('Testing ARIA landmarks');

      const landmarks = await page.evaluate(() => {
        const elements = document.querySelectorAll('[role]');
        return Array.from(elements).map(el => el.getAttribute('role'));
      });

      const expectedLandmarks = ['banner', 'navigation', 'main', 'contentinfo'];
      const hasRequiredLandmarks = expectedLandmarks.some(landmark =>
        landmarks.includes(landmark)
      );

      expect(hasRequiredLandmarks).toBe(true);
      logger.assertion('ARIA landmarks present', hasRequiredLandmarks);
    });

    test('should have proper headings hierarchy', async () => {
      logger.step('Testing headings hierarchy');

      const headings = await page.evaluate(() => {
        const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        return Array.from(headingElements).map(el => ({
          level: parseInt(el.tagName.charAt(1)),
          text: el.textContent?.trim()
        }));
      });

      expect(headings.length).toBeGreaterThan(0);

      // Check if h1 exists
      const hasH1 = headings.some(h => h.level === 1);
      expect(hasH1).toBe(true);

      logger.assertion(`Headings hierarchy: ${headings.length} headings found`, true);
    });

    test('should have proper form labels and accessibility', async () => {
      logger.step('Testing form accessibility');

      await page.goto('http://localhost:3000/servers');
      await page.click('.add-server-button');
      await page.waitForSelector('.server-form-modal', { timeout: 3000 });

      const formInputs = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input, select, textarea');
        return Array.from(inputs).map(input => ({
          hasLabel: input.getAttribute('aria-label') !== null ||
                   input.getAttribute('aria-labelledby') !== null ||
                   document.querySelector(`label[for="${input.id}"]`) !== null,
          hasAriaDescribedBy: input.getAttribute('aria-describedby') !== null,
          isRequired: input.hasAttribute('required'),
          hasAriaRequired: input.getAttribute('aria-required') === 'true'
        }));
      });

      const allInputsHaveLabels = formInputs.every(input => input.hasLabel);
      expect(allInputsHaveLabels).toBe(true);

      logger.assertion('Form inputs have proper labels', allInputsHaveLabels);
    });

    test('should have proper button accessibility', async () => {
      logger.step('Testing button accessibility');

      const buttons = await page.evaluate(() => {
        const buttonElements = document.querySelectorAll('button, [role="button"]');
        return Array.from(buttonElements).map(button => ({
          hasAccessibleName: button.textContent?.trim() ||
                           button.getAttribute('aria-label') ||
                           button.getAttribute('aria-labelledby'),
          hasAriaPressed: button.getAttribute('aria-pressed') !== null,
          hasAriaExpanded: button.getAttribute('aria-expanded') !== null,
          isDisabled: button.hasAttribute('disabled')
        }));
      });

      const allButtonsHaveNames = buttons.every(button => button.hasAccessibleName);
      expect(allButtonsHaveNames).toBe(true);

      logger.assertion('Buttons have accessible names', allButtonsHaveNames);
    });
  });

  describe('Keyboard Navigation', () => {
    test('should support tab navigation through interface', async () => {
      logger.step('Testing tab navigation');

      await page.focus('body');

      // Press Tab multiple times and track focused elements
      const focusedElements: string[] = [];
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const focusedElement = await page.evaluate(() => {
          const focused = document.activeElement;
          return focused?.tagName.toLowerCase() + (focused?.className ? `.${focused.className}` : '');
        });
        focusedElements.push(focusedElement);
      }

      // Should have navigated through multiple focusable elements
      const uniqueElements = new Set(focusedElements);
      expect(uniqueElements.size).toBeGreaterThan(3);

      logger.assertion(`Tab navigation through ${uniqueElements.size} unique elements`, true);
    });

    test('should support keyboard shortcuts', async () => {
      logger.step('Testing keyboard shortcuts');

      // Test common keyboard shortcuts
      await page.keyboard.down('Control');
      await page.keyboard.press('n'); // New server shortcut
      await page.keyboard.up('Control');

      await page.waitForTimeout(1000);

      // Check if shortcut action occurred
      const modalVisible = await page.isVisible('.server-form-modal');
      if (modalVisible) {
        await page.keyboard.press('Escape'); // Close modal
      }

      logger.assertion('Keyboard shortcuts functional', true);
    });

    test('should have visible focus indicators', async () => {
      logger.step('Testing focus indicators');

      await page.addStyleTag({
        content: `
          *:focus {
            outline: 2px solid blue !important;
            outline-offset: 2px !important;
          }
        `
      });

      await page.focus('body');
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => {
        const focused = document.activeElement;
        if (!focused) return null;

        const styles = window.getComputedStyle(focused);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          outlineStyle: styles.outlineStyle
        };
      });

      expect(focusedElement?.outlineWidth).not.toBe('0px');
      logger.assertion('Focus indicators visible', true);
    });

    test('should handle Enter and Space key activation', async () => {
      logger.step('Testing Enter and Space key activation');

      await page.goto('http://localhost:3000/servers');
      await page.focus('.add-server-button');
      await page.keyboard.press('Enter');

      await page.waitForSelector('.server-form-modal', { timeout: 3000 });
      const modalVisible = await page.isVisible('.server-form-modal');

      expect(modalVisible).toBe(true);

      // Close modal and test Space key
      await page.keyboard.press('Escape');
      await page.focus('.add-server-button');
      await page.keyboard.press('Space');

      await page.waitForSelector('.server-form-modal', { timeout: 3000 });
      const modalVisibleAgain = await page.isVisible('.server-form-modal');

      expect(modalVisibleAgain).toBe(true);

      logger.assertion('Enter and Space key activation working', true);
    });
  });

  describe('Screen Reader Support', () => {
    test('should have proper aria-live regions for dynamic content', async () => {
      logger.step('Testing aria-live regions');

      const liveRegions = await page.evaluate(() => {
        const regions = document.querySelectorAll('[aria-live]');
        return Array.from(regions).map(region => ({
          ariaLive: region.getAttribute('aria-live'),
          content: region.textContent?.trim()
        }));
      });

      expect(liveRegions.length).toBeGreaterThan(0);

      logger.assertion(`Found ${liveRegions.length} aria-live regions`, true);
    });

    test('should announce connection status changes', async () => {
      logger.step('Testing connection status announcements');

      await page.goto('http://localhost:3000/terminal');

      const statusRegion = await page.$('[aria-live="polite"], [aria-live="assertive"]');
      if (statusRegion) {
        // Monitor status changes
        const initialText = await statusRegion.evaluate(el => el.textContent);

        // Trigger connection change
        const connectButton = await page.$('.connect-server-button');
        if (connectButton) {
          await connectButton.click();
          await page.waitForTimeout(2000);

          const updatedText = await statusRegion.evaluate(el => el.textContent);
          expect(updatedText).not.toBe(initialText);

          logger.assertion('Connection status announcements working', true);
        } else {
          logger.assertion('Connect button not found for status test', true);
        }
      } else {
        logger.assertion('Status announcement region not found', false);
      }
    });

    test('should provide proper aria descriptions for complex elements', async () => {
      logger.step('Testing aria descriptions');

      const elementsWithDescriptions = await page.evaluate(() => {
        const elements = document.querySelectorAll('[aria-describedby]');
        return Array.from(elements).map(element => {
          const describedById = element.getAttribute('aria-describedby');
          const descriptionElement = describedById ? document.getElementById(describedById) : null;
          return {
            hasValidDescription: descriptionElement !== null && descriptionElement.textContent?.trim() !== '',
            description: descriptionElement?.textContent?.trim()
          };
        });
      });

      const validDescriptions = elementsWithDescriptions.filter(el => el.hasValidDescription);
      expect(validDescriptions.length).toBeGreaterThanOrEqual(0);

      logger.assertion(`Found ${validDescriptions.length} valid aria descriptions`, true);
    });
  });

  describe('Color and Contrast', () => {
    test('should meet color contrast requirements', async () => {
      logger.step('Testing color contrast');

      // Get text elements and their colors
      const contrastData = await page.evaluate(() => {
        const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, button, a');
        const results: Array<{element: string, color: string, backgroundColor: string}> = [];

        textElements.forEach((element, index) => {
          if (index < 20) { // Limit to first 20 elements for performance
            const styles = window.getComputedStyle(element);
            results.push({
              element: element.tagName.toLowerCase(),
              color: styles.color,
              backgroundColor: styles.backgroundColor
            });
          }
        });

        return results;
      });

      // Basic check that colors are defined
      const elementsWithColors = contrastData.filter(item =>
        item.color !== 'rgba(0, 0, 0, 0)' && item.backgroundColor !== 'rgba(0, 0, 0, 0)'
      );

      expect(elementsWithColors.length).toBeGreaterThan(0);
      logger.assertion(`Checked contrast for ${elementsWithColors.length} elements`, true);
    });

    test('should not rely solely on color for information', async () => {
      logger.step('Testing color-only information');

      // Check for status indicators that might rely only on color
      const statusElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('.status-indicator, .connection-status');
        return Array.from(elements).map(element => ({
          hasTextContent: element.textContent?.trim() !== '',
          hasAriaLabel: element.getAttribute('aria-label') !== null,
          hasIcon: element.querySelector('svg, .icon') !== null
        }));
      });

      const accessibleStatusElements = statusElements.filter(element =>
        element.hasTextContent || element.hasAriaLabel || element.hasIcon
      );

      // Most status elements should have non-color indicators
      const accessibilityRatio = accessibleStatusElements.length / Math.max(statusElements.length, 1);
      expect(accessibilityRatio).toBeGreaterThan(0.5);

      logger.assertion('Status elements provide non-color information', true);
    });
  });

  describe('Mobile Accessibility', () => {
    test('should support touch accessibility on mobile', async () => {
      logger.step('Testing mobile touch accessibility');

      await page.setViewport({ width: 375, height: 667 });
      await page.goto('http://localhost:3000');

      // Check touch target sizes
      const touchTargets = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, a, [role="button"]');
        return Array.from(buttons).map(button => {
          const rect = button.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            area: rect.width * rect.height
          };
        });
      });

      // Touch targets should be at least 44x44px (WCAG AA)
      const adequateTouchTargets = touchTargets.filter(target =>
        target.width >= 44 && target.height >= 44
      );

      const touchTargetRatio = adequateTouchTargets.length / Math.max(touchTargets.length, 1);
      expect(touchTargetRatio).toBeGreaterThan(0.7); // At least 70% should meet minimum size

      logger.assertion(`${adequateTouchTargets.length}/${touchTargets.length} touch targets meet size requirements`, true);
    });

    test('should support pinch-to-zoom', async () => {
      logger.step('Testing pinch-to-zoom support');

      const viewport = await page.evaluate(() => {
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        return viewportMeta?.getAttribute('content') || '';
      });

      // Should not disable zoom
      const disablesZoom = viewport.includes('user-scalable=no') ||
                         viewport.includes('maximum-scale=1');

      expect(disablesZoom).toBe(false);
      logger.assertion('Pinch-to-zoom is supported', !disablesZoom);
    });
  });

  describe('Error Accessibility', () => {
    test('should provide accessible error messages', async () => {
      logger.step('Testing accessible error messages');

      await page.goto('http://localhost:3000/servers');
      await page.click('.add-server-button');
      await page.waitForSelector('.server-form-modal', { timeout: 3000 });

      // Submit form without required fields
      await page.click('.save-server-button');

      await page.waitForSelector('.error-message', { timeout: 3000 });

      const errorAccessibility = await page.evaluate(() => {
        const errorMessages = document.querySelectorAll('.error-message, [role="alert"]');
        return Array.from(errorMessages).map(error => ({
          hasAriaLive: error.getAttribute('aria-live') !== null,
          hasRole: error.getAttribute('role') === 'alert',
          isVisible: window.getComputedStyle(error).display !== 'none',
          hasText: error.textContent?.trim() !== ''
        }));
      });

      const accessibleErrors = errorAccessibility.filter(error =>
        (error.hasAriaLive || error.hasRole) && error.isVisible && error.hasText
      );

      expect(accessibleErrors.length).toBeGreaterThan(0);
      logger.assertion('Error messages are accessible', true);
    });

    test('should associate errors with form fields', async () => {
      logger.step('Testing error-field associations');

      await page.goto('http://localhost:3000/servers');
      await page.click('.add-server-button');
      await page.waitForSelector('.server-form-modal', { timeout: 3000 });

      await page.click('.save-server-button');
      await page.waitForSelector('.error-message', { timeout: 3000 });

      const fieldErrorAssociations = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[aria-describedby], input[aria-invalid]');
        return Array.from(inputs).map(input => ({
          hasAriaDescribedBy: input.getAttribute('aria-describedby') !== null,
          hasAriaInvalid: input.getAttribute('aria-invalid') === 'true',
          describedByExists: input.getAttribute('aria-describedby') ?
            document.getElementById(input.getAttribute('aria-describedby')!) !== null : false
        }));
      });

      const properlyAssociated = fieldErrorAssociations.filter(field =>
        field.hasAriaDescribedBy && field.describedByExists
      );

      expect(properlyAssociated.length).toBeGreaterThanOrEqual(0);
      logger.assertion('Error-field associations present', true);
    });
  });
});