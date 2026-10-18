import { defineConfig, devices } from '@playwright/test';

const frontendUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173';
const apiUrl = process.env.SECUREOPS_API_URL || 'http://127.0.0.1:8000/api/v1';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: frontendUrl,
    trace: 'retain-on-failure'
  },
  webServer: [
    {
      command: 'cd ../backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000',
      url: `${apiUrl.replace('/api/v1', '')}/health`,
      reuseExistingServer: true,
      timeout: 120_000
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5173',
      url: frontendUrl,
      reuseExistingServer: true,
      timeout: 120_000
    }
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
