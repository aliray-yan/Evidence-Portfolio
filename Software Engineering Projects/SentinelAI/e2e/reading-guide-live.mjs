// Explicit manual smoke check against the local app and a real free provider.
// Uses only an existing authored synthetic case; never runs in test:e2e.
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
if (process.env.SENTINEL_LIVE_READING_CHECK !== '1') throw new Error('Set SENTINEL_LIVE_READING_CHECK=1 to authorize this synthetic-only cloud check.');
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const context = await browser.newContext({ baseURL: 'http://127.0.0.1:8000', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
const casePath = '/api/cases/SA-26-1042';
let csrf;
try {
  const auth = await context.request.post('/api/auth/demo', { data: { user_id: 'demo-supervisor' } });
  expect(auth.status()).toBe(200); csrf = (await auth.json()).csrf;
  const before = await (await context.request.get(casePath)).json();
  expect(before.synthetic).toBe(1);
  const preview = await (await context.request.get(casePath + '/reading-guide')).json();
  expect(preview.enabled).toBe(true);
  expect(preview.packet.sources.length).toBeGreaterThan(0);
  expect(preview.packet.sources.every(s => s.source === 'synthetic')).toBe(true);
  await page.goto('/cases/SA-26-1042');
  await page.getByRole('tab', { name: 'Evidence summary' }).click();
  await page.getByRole('button', { name: 'Prepare reading guide' }).click();
  if (preview.guide?.status !== 'completed') {
    await page.getByRole('button', { name: 'Review cloud transfer' }).click();
    const dialog = page.getByRole('dialog', { name: 'Send these excerpts to OpenRouter?' });
    await expect(dialog).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: '.impeccable/review/screenshots/reading-guide-live-preview.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: '.impeccable/review/screenshots/reading-guide-live-preview-mobile.png' });
    await dialog.getByRole('checkbox').check();
    const response = page.waitForResponse(r => r.url().endsWith('/reading-guide') && r.request().method() === 'POST', { timeout: 60000 });
    await dialog.getByRole('button', { name: 'Send excerpts & generate' }).click();
    const saved = await response;
    expect(saved.status(), await saved.text()).toBe(200);
    await expect(dialog).not.toBeVisible();
  }
  const final = await (await context.request.get(casePath + '/reading-guide')).json();
  expect(final.guide.status).toBe('completed');
  expect(final.guide.selected_sources.every(s => final.packet.sources.some(p => p.id === s.id && p.text === s.text))).toBe(true);
  const after = await (await context.request.get(casePath)).json();
  for (const key of ['version', 'status', 'risk_score', 'reviews']) expect(after[key]).toEqual(before[key]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByRole('tab', { name: 'Evidence summary' }).click();
  await page.getByRole('button', { name: 'Prepare reading guide' }).click();
  await expect(page.locator('.reading-excerpts li').first()).toBeVisible();
  await page.locator('.reading-excerpts button').first().click();
  await expect.poll(() => page.locator('video').evaluate(v => v.currentTime)).toBeGreaterThanOrEqual(final.guide.selected_sources[0].start);
  await page.locator('.reading-guide').scrollIntoViewIfNeeded();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: '.impeccable/review/screenshots/reading-guide-live-result-mobile.png' });
  expect(errors).toEqual([]);
  const report = { synthetic_only: true, model: final.guide.actual_model, provider: final.guide.provider, elapsed_seconds: final.guide.elapsed_seconds, selected_excerpts: final.guide.selected_sources.length, persisted_after_reload: true, case_decision_unchanged: true, axe_violations: 0, page_errors: errors };
  await mkdir('.local', { recursive: true });
  await writeFile('.local/openrouter-workflow-verification.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  if (csrf) await context.request.post('/api/auth/logout', { headers: { 'X-CSRF-Token': csrf } }).catch(() => {});
  await browser.close();
}
