import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  fullyParallel: Boolean(process.env.CI),
  workers: process.env.CI ? 4 : undefined,
  reporter: [['list'],['html',{outputFolder:'playwright-report',open:'never'}],['json',{outputFile:'test-results/results.json'}]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'node scripts/preview-server.mjs --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 15000
  },
  projects: [
    { name:'desktop-chromium', use:{...devices['Desktop Chrome']} },
    { name:'mobile-390', use:{...devices['iPhone 13']} }
  ]
});
