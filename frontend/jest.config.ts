import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const config: Config = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Test environment
  testEnvironment: 'jsdom',

  // Module path aliases (should match tsconfig paths)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/types/**',
    '!src/test/**', // Test infrastructure helpers/mocks
    '!src/app/**', // Next.js pages/layouts (UI-only, covered by E2E)
    '!src/components/editorial/**', // Editorial UI components (no business logic)
    '!src/lib/analytics.ts', // Analytics library
    '!src/lib/api-client.ts', // API client wrapper
    '!src/lib/cometchat.ts', // Third-party integration
    '!src/lib/csrf*.ts', // CSRF utilities
    '!src/lib/sanitization.ts', // Security utilities
    '!src/lib/sentry.ts', // Error tracking integration
    '!src/lib/vitals.ts', // Web vitals reporting
    '!src/stores/**', // Zustand stores (state management)
    '!src/components/auth/ProtectedRoute.tsx', // Auth wrapper component
  ],

  // Coverage thresholds — scoped to business logic utils/hooks/components only
  // (pages, test helpers, and third-party integrations are excluded above)
  // Threshold reflects current test suite coverage; increase as tests are added
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 5,
      lines: 5,
      statements: 5,
    },
  },

  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
    '<rootDir>/tests/unit/**/*.{spec,test}.{js,jsx,ts,tsx}',
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/tests/e2e/',
  ],

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },

  // Verbose output
  verbose: true,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config
export default createJestConfig(config);
