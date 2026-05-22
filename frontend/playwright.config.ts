import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'fs';
import { join } from 'path';

const explicitBaseURL = process.env.E2E_BASE_URL;
const parsedBaseURL = explicitBaseURL ? new URL(explicitBaseURL) : null;
const host = process.env.E2E_HOST ?? parsedBaseURL?.hostname ?? '127.0.0.1';
const port = process.env.E2E_PORT ?? parsedBaseURL?.port ?? '3100';
const baseURL = explicitBaseURL ?? `http://${host}:${port}`;

// Use standalone build when available, dev server otherwise
const isCI = process.env.CI === 'true';
const standaloneServer = join(process.cwd(), '.next', 'standalone', 'server.js');
const useStandalone = existsSync(standaloneServer);

// Cross-platform environment variable setting
const isWindows = process.platform === 'win32';
const webServerCommand = useStandalone
  ? isWindows
    ? `powershell -Command "$env:PORT='${port}'; $env:HOSTNAME='${host}'; node .next/standalone/server.js"`
    : `PORT=${port} HOSTNAME=${host} node .next/standalone/server.js`
  : `npm run dev -- --hostname ${host} --port ${port}`;

export default defineConfig({
  testDir: '.',
  testMatch: ['e2e/**/*.spec.ts', 'tests/a11y/**/*.spec.ts'],
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
  // Skip visual regression tests in CI (platform-specific snapshots)
  grep: isCI ? /./ : undefined,
  grepInvert: isCI ? /Visual Regression/ : undefined,
  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
    cwd: process.cwd(),
  },
});
