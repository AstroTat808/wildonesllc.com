import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './visual-tests',
  timeout: 240000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'],['html',{outputFolder:'visual-qa/playwright-report',open:'never'}]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    screenshot: 'off',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node scripts/preview-server.mjs --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 15000
  }
});
