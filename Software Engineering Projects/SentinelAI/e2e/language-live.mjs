// Explicit local-model smoke check, only against an authored synthetic case.
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const context = await browser.newContext({ baseURL: 'http://127.0.0.1:8000', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
let csrf;
try {
  const auth = await context.request.post('/api/auth/demo', { data: { user_id: 'demo-supervisor' } });
  expect(auth.status()).toBe(200); csrf = (await auth.json()).csrf;
  const path = '/api/cases/SA-26-1042';
  const before = await (await context.request.get(path)).json();
  expect(before.synthetic).toBe(1);
  await page.goto('/cases/SA-26-1042');
  await page.getByRole('tab', { name: 'Evidence summary' }).click();
  const search = page.locator('.evidence-search');
  const status = await (await context.request.get(path + '/search')).json();
  expect(status.available).toBe(true);
  if (!['ready', 'queued', 'running'].includes(status.index.status)) await search.getByRole('button', { name: /Prepare semantic search|Retry semantic indexing/ }).click();
  await expect(search.getByRole('option', { name: 'Meaning · multilingual' })).toHaveJSProperty('disabled', false, { timeout: 60000 });
  await search.getByLabel('Search method').selectOption('semantic');
  await search.getByLabel('Words or question').fill('Was an official payment receipt offered?');
  const pending = page.waitForResponse(r => r.url().endsWith('/search') && r.request().method() === 'POST');
  await search.getByRole('button', { name: 'Search evidence' }).click();
  const response = await pending; expect(response.status()).toBe(200);
  const result = await response.json();
  const sources = [...before.segments, ...before.events];
  for (const r of result.results) {
    const source = sources.find(s => s.id === r.id);
    expect(r.text).toBe((source.text ?? source.detail).slice(r.start_char, r.end_char));
  }
  expect(result.results.length).toBeGreaterThan(0);
  await search.scrollIntoViewIfNeeded();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: '.impeccable/review/screenshots/semantic-search-live-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await search.scrollIntoViewIfNeeded();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: '.impeccable/review/screenshots/semantic-search-live-mobile.png' });
  await search.locator('.reading-excerpts button').first().click();
  await expect.poll(() => page.locator('video').evaluate(v => v.currentTime)).toBeGreaterThanOrEqual(result.results[0].start);
  await page.reload();
  expect((await (await context.request.get(path + '/search')).json()).index.status).toBe('ready');
  const after = await (await context.request.get(path)).json();
  for (const key of ['version', 'status', 'risk_score']) expect(after[key]).toEqual(before[key]);
  expect(errors).toEqual([]);
  const report = { source: 'Authored synthetic case, actual local E5 inference', results: result.results.length, exact_excerpts: true, persisted_index: true, case_decision_unchanged: true, desktop_and_mobile_axe_violations: 0, page_errors: errors };
  await writeFile('.local/ai-verification/search-browser-verification.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  if (csrf) await context.request.post('/api/auth/logout', { headers: { 'X-CSRF-Token': csrf } }).catch(() => {});
  await browser.close();
}
