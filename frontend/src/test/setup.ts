import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

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
