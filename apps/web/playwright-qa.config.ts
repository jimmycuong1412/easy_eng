import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Load .env.local at config time so NEXT_PUBLIC_* vars are set
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
}

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/qa-final.spec.ts'],
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-qa-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'off',
    // Inject NEXT_PUBLIC_ env vars as extra HTTP headers won't work,
    // but setting them in process.env at config load time allows the
    // Next.js dev server (already running) to serve them in its bundle.
    // The key fix: env vars must be set BEFORE next dev starts.
    // Since server is already running with env vars, we just need
    // the browser to not crash - which happens via the running server.
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  // Reuse the already-running server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
