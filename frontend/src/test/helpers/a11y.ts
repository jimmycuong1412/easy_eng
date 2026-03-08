/**
 * Accessibility Testing Helpers
 * Utilities for testing accessibility in React components
 */

import { axe, toHaveNoViolations } from 'jest-axe';
import { render, RenderResult } from '@testing-library/react';
import { ReactElement } from 'react';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

/**
 * Configuration for axe accessibility testing
 */
const axeConfig = {
  rules: {
    // Enable WCAG 2.1 Level A and AA rules
    'wcag2a': { enabled: true },
    'wcag2aa': { enabled: true },
    'wcag21a': { enabled: true },
    'wcag21aa': { enabled: true },
  },
  runOnly: {
    type: 'tag' as const,
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
  },
};

/**
 * Run axe accessibility tests on a React component
 * @param component - React component to test
 * @param options - Additional axe configuration options
 * @returns Promise that resolves to axe results
 */
export async function runAxeTest(
  component: ReactElement,
  options = {}
): Promise<void> {
  const { container } = render(component);
  const results = await axe(container, { ...axeConfig, ...options });
  expect(results).toHaveNoViolations();
}

/**
 * Run axe accessibility tests on rendered component container
 * @param container - Rendered component container
 * @param options - Additional axe configuration options
 * @returns Promise that resolves to axe results
 */
export async function runAxeOnContainer(
  container: HTMLElement,
  options = {}
): Promise<void> {
  const results = await axe(container, { ...axeConfig, ...options });
  expect(results).toHaveNoViolations();
}

/**
 * Check if element has proper ARIA label
 * @param element - HTML element to check
 * @returns boolean indicating if element has accessible name
 */
export function hasAccessibleName(element: HTMLElement): boolean {
  const ariaLabel = element.getAttribute('aria-label');
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  const title = element.getAttribute('title');
  const altText = element.getAttribute('alt');

  return !!(ariaLabel || ariaLabelledBy || title || altText || element.textContent?.trim());
}

/**
 * Check if element is keyboard accessible
 * @param element - HTML element to check
 * @returns boolean indicating if element is keyboard accessible
 */
export function isKeyboardAccessible(element: HTMLElement): boolean {
  const tabIndex = element.getAttribute('tabindex');
  const isInteractive = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(
    element.tagName
  );

  return isInteractive || (tabIndex !== null && parseInt(tabIndex) >= 0);
}

/**
 * Simulate keyboard navigation through elements
 * @param container - Container element to navigate
 * @returns Array of focusable elements in tab order
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  const elements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];

  // Sort by tab index
  return elements.sort((a, b) => {
    const aIndex = parseInt(a.getAttribute('tabindex') || '0');
    const bIndex = parseInt(b.getAttribute('tabindex') || '0');
    return aIndex - bIndex;
  });
}

/**
 * Test keyboard navigation through a component
 * @param container - Container element to test
 * @returns Promise that resolves when test completes
 */
export async function testKeyboardNavigation(
  container: HTMLElement
): Promise<void> {
  const focusableElements = getFocusableElements(container);

  expect(focusableElements.length).toBeGreaterThan(0);

  // Test that all focusable elements can receive focus
  for (const element of focusableElements) {
    element.focus();
    expect(document.activeElement).toBe(element);
  }
}

/**
 * Test that Tab key moves focus forward through elements
 * @param container - Container element to test
 * @param startElement - Optional starting element
 */
export function simulateTabKey(
  container: HTMLElement,
  startElement?: HTMLElement
): void {
  const focusableElements = getFocusableElements(container);
  const currentIndex = startElement
    ? focusableElements.indexOf(startElement)
    : -1;
  const nextIndex = (currentIndex + 1) % focusableElements.length;

  if (focusableElements[nextIndex]) {
    focusableElements[nextIndex].focus();
  }
}

/**
 * Test that Shift+Tab key moves focus backward through elements
 * @param container - Container element to test
 * @param startElement - Optional starting element
 */
export function simulateShiftTabKey(
  container: HTMLElement,
  startElement?: HTMLElement
): void {
  const focusableElements = getFocusableElements(container);
  const currentIndex = startElement
    ? focusableElements.indexOf(startElement)
    : focusableElements.length;
  const prevIndex =
    (currentIndex - 1 + focusableElements.length) % focusableElements.length;

  if (focusableElements[prevIndex]) {
    focusableElements[prevIndex].focus();
  }
}

/**
 * Test focus trap - ensure focus stays within container
 * @param container - Container element that should trap focus
 * @returns Promise that resolves when test completes
 */
export async function testFocusTrap(container: HTMLElement): Promise<void> {
  const focusableElements = getFocusableElements(container);

  expect(focusableElements.length).toBeGreaterThan(0);

  // Focus first element
  focusableElements[0].focus();
  expect(document.activeElement).toBe(focusableElements[0]);

  // Tab through all elements
  for (let i = 1; i < focusableElements.length; i++) {
    simulateTabKey(container, focusableElements[i - 1]);
    expect(document.activeElement).toBe(focusableElements[i]);
  }

  // Tab from last element should go back to first
  simulateTabKey(container, focusableElements[focusableElements.length - 1]);
  expect(document.activeElement).toBe(focusableElements[0]);

  // Shift+Tab from first element should go to last
  simulateShiftTabKey(container, focusableElements[0]);
  expect(document.activeElement).toBe(
    focusableElements[focusableElements.length - 1]
  );
}

/**
 * Check if element has proper color contrast
 * Note: This is a helper to verify contrast is being tested by axe
 * @param element - Element to check
 * @returns boolean indicating if contrast check is applicable
 */
export function shouldTestColorContrast(element: HTMLElement): boolean {
  const computedStyle = window.getComputedStyle(element);
  const hasText = element.textContent?.trim().length ?? 0 > 0;
  const hasBackground = computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)';

  return hasText && hasBackground;
}

/**
 * Check if images have alt text
 * @param container - Container to check for images
 * @returns Array of images missing alt text
 */
export function findImagesWithoutAltText(
  container: HTMLElement
): HTMLImageElement[] {
  const images = Array.from(container.querySelectorAll('img'));
  return images.filter(img => !img.getAttribute('alt'));
}

/**
 * Check if buttons have accessible names
 * @param container - Container to check for buttons
 * @returns Array of buttons without accessible names
 */
export function findButtonsWithoutAccessibleNames(
  container: HTMLElement
): HTMLButtonElement[] {
  const buttons = Array.from(container.querySelectorAll('button'));
  return buttons.filter(button => !hasAccessibleName(button));
}

/**
 * Check if form inputs have labels
 * @param container - Container to check for form inputs
 * @returns Array of inputs without labels
 */
export function findInputsWithoutLabels(
  container: HTMLElement
): HTMLInputElement[] {
  const inputs = Array.from(
    container.querySelectorAll('input:not([type="hidden"])')
  );
  return inputs.filter(input => {
    const id = input.getAttribute('id');
    const hasAriaLabel = input.getAttribute('aria-label');
    const hasAriaLabelledBy = input.getAttribute('aria-labelledby');
    const hasLabel = id && container.querySelector(`label[for="${id}"]`);

    return !hasAriaLabel && !hasAriaLabelledBy && !hasLabel;
  });
}

/**
 * Test screen reader announcements
 * @param container - Container element
 * @returns Array of live regions found
 */
export function findLiveRegions(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll('[aria-live], [role="alert"], [role="status"]')
  );
}

/**
 * Check if element has proper heading hierarchy
 * @param container - Container to check
 * @returns boolean indicating if heading hierarchy is correct
 */
export function hasProperHeadingHierarchy(container: HTMLElement): boolean {
  const headings = Array.from(
    container.querySelectorAll('h1, h2, h3, h4, h5, h6')
  );

  if (headings.length === 0) return true;

  let lastLevel = 0;
  for (const heading of headings) {
    const level = parseInt(heading.tagName.charAt(1));
    if (lastLevel > 0 && level > lastLevel + 1) {
      return false;
    }
    lastLevel = level;
  }

  return true;
}

/**
 * Custom matcher to check for keyboard accessibility
 */
export const toBeKeyboardAccessible = {
  toBeKeyboardAccessible(element: HTMLElement) {
    const pass = isKeyboardAccessible(element);
    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to be keyboard accessible`
          : `Expected element to be keyboard accessible (should be interactive or have tabindex >= 0)`,
    };
  },
};

/**
 * Custom matcher to check for accessible name
 */
export const toHaveAccessibleName = {
  toHaveAccessibleName(element: HTMLElement) {
    const pass = hasAccessibleName(element);
    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to have accessible name`
          : `Expected element to have accessible name (aria-label, aria-labelledby, title, alt, or text content)`,
    };
  },
};

// Extend Jest matchers with custom accessibility matchers
expect.extend(toBeKeyboardAccessible);
expect.extend(toHaveAccessibleName);

// Type definitions for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeKeyboardAccessible(): R;
      toHaveAccessibleName(): R;
      toHaveNoViolations(): R;
    }
  }
}
