import { defineConfig, devices } from '@playwright/test';

const explicitBaseURL = process.env.E2E_BASE_URL;
const parsedBaseURL = explicitBaseURL ? new URL(explicitBaseURL) : null;
const host = process.env.E2E_HOST ?? parsedBaseURL?.hostname ?? '127.0.0.1';
const port = process.env.E2E_PORT ?? parsedBaseURL?.port ?? '3100';
const baseURL = explicitBaseURL ?? `http://${host}:${port}`;

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
    reuseExistingServer: process.env.CI !== 'true',
    timeout: 120 * 1000,
  },
});
