import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'fs';
import { join } from 'path';

const explicitBaseURL = process.env.E2E_BASE_URL;
const parsedBaseURL = explicitBaseURL ? new URL(explicitBaseURL) : null;
const host = process.env.E2E_HOST ?? parsedBaseURL?.hostname ?? '127.0.0.1';
const port = process.env.E2E_PORT ?? parsedBaseURL?.port ?? '3100';
const baseURL = explicitBaseURL ?? `http://${host}:${port}`;

// Use standalone build in CI, dev server in local
const isCI = process.env.CI === 'true';
const standaloneServer = join(process.cwd(), '.next', 'standalone', 'server.js');
const useStandalone = isCI && existsSync(standaloneServer);

const webServerCommand = useStandalone
  ? `PORT=${port} HOSTNAME=${host} node .next/standalone/server.js`
  : `npm run start -- --hostname ${host} --port ${port}`;

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
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
    cwd: process.cwd(),
  },
});
