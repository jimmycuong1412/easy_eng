import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'https://easyeng-dev.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    extraHTTPHeaders: {
      'x-vercel-protection-bypass': 'easyeng-playwright-bypass-85bd83d1668137e2',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer — tests run against the deployed production URL
  timeout: 60000,
});
