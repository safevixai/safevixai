import { defineConfig, devices } from '@playwright/test';

const host = process.env.E2E_HOST ?? '127.0.0.1';
const port = process.env.E2E_PORT ?? '3100';
const baseURL = process.env.E2E_BASE_URL ?? `http://${host}:${port}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 30_000,
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run start -- --hostname ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
});
