import { expect, test } from '@playwright/test';

const apiUrl = process.env.SECUREOPS_API_URL || 'http://127.0.0.1:8000/api/v1';
const email = process.env.E2E_EMAIL || 'admin@secureops.local';
const password = process.env.E2E_PASSWORD || 'SecureOps!2026';

test('EDR ingest configuration is reachable', async ({ request }) => {
  const response = await request.get(`${apiUrl}/ingest/edr/config`);
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body.header).toBe('X-SecureOps-Ingest-Key');
  expect(body.batch_endpoint).toContain('/api/v1/ingest/edr/alerts/batch');
});

test('analyst can sign in and open the alert queue', async ({ page, request }) => {
  const login = await request.post(`${apiUrl}/auth/login`, { data: { email, password } });
  expect(login.ok()).toBeTruthy();
  const { access_token: token } = await login.json();
  const title = `E2E Browser Smoke Alert ${Date.now()}`;
  const created = await request.post(`${apiUrl}/alerts`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      title,
      description: 'Created by the Playwright browser smoke test.',
      severity: 'medium',
      source: 'EDR',
      source_ref: `e2e-${Date.now()}`,
      category: 'Browser Test',
      iocs: []
    }
  });
  expect(created.ok()).toBeTruthy();
  const alert = await created.json();

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.getByRole('link', { name: 'Alerts' }).click();
  await expect(page.getByRole('heading', { name: 'Alerts' })).toBeVisible();
  await expect(page.getByText(title)).toBeVisible();

  await request.delete(`${apiUrl}/alerts/${alert.id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
});
