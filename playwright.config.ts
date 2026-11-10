import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: {
    command: 'npm run start -- -p 8080 -H 127.0.0.1',
    cwd: 'D:/KriyaOS-build-check',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      AUTH_MODE: 'none',
      KRIYAOS_MAINTENANCE_DATA_DIR: 'D:/KriyaOS-build-check/data/maintenance-e2e',
      TMP: 'D:/KriyaOS-build-check/.tmp',
      TEMP: 'D:/KriyaOS-build-check/.tmp',
    },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
