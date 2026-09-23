import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  reporter: [['list'],['html',{outputFolder:'playwright-report',open:'never'}]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'python3 -m http.server 4173 --directory dist',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 15000
  },
  projects: [
    { name:'desktop-chromium', use:{...devices['Desktop Chrome']} },
    { name:'mobile-390', use:{...devices['iPhone 13']} }
  ]
});
