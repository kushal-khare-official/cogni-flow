import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:3000',
    video: 'on',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
  },
  outputDir: './test-results',
});
