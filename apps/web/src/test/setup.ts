import '@testing-library/jest-dom';
import { configureAxe, toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers with accessibility testing
expect.extend(toHaveNoViolations);

// Mock Next.js router
jest.mock('next/router', () => require('next-router-mock'));

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

/**
 * Configure axe-core with WCAG 2.1 AA rules
 * This configuration will be used across all accessibility tests
 */
export const axeConfig = configureAxe({
  rules: {
    // Enable all WCAG 2.1 Level A and AA rules
    'wcag2a': { enabled: true },
    'wcag2aa': { enabled: true },
    'wcag21a': { enabled: true },
    'wcag21aa': { enabled: true },
    // Specific rule configuration
    'color-contrast': { enabled: true },
    'html-has-lang': { enabled: true },
    'valid-lang': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'button-name': { enabled: true },
    'image-alt': { enabled: true },
    'label': { enabled: true },
    'link-name': { enabled: true },
  },
  // Set run context options
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
  },
  // Configure result types to report
  resultTypes: ['violations', 'incomplete'],
});

// Accessibility testing defaults (WCAG 2.1 Level AA)
global.a11yConfig = {
  rules: {
    'color-contrast': { enabled: true },
    'html-has-lang': { enabled: true },
    'valid-lang': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'button-name': { enabled: true },
    'image-alt': { enabled: true },
    'label': { enabled: true },
    'link-name': { enabled: true },
  },
};

/**
 * Global test configuration
 */
beforeAll(() => {
  console.log('Accessibility testing configured with WCAG 2.1 AA standards');
});

/**
 * Type definitions for jest-axe custom matchers
 */
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }
}
