import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('reading-guide transfer preview, consent, source links and mobile accessibility (provider fixture)', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.getByLabel('Workspace role').selectOption('demo-supervisor');
  await page.getByRole('button', { name: 'Enter demonstration' }).click();
  await expect(page.getByRole('heading', { name: 'Operations overview' })).toBeVisible();
  await page.goto('/cases/SA-26-1042');
  await page.getByRole('tab', { name: 'Evidence summary' }).click();
  // First verify real backend unconfigured state. This suite never has a cloud key.
  await page.getByRole('button', { name: 'Prepare reading guide' }).click();
  await expect(page.getByText('OpenRouter is not configured. Run the private key setup and restart SentinelAI.')).toBeVisible();
  const detail = await (await page.request.get('/api/cases/SA-26-1042')).json();
  const segment = detail.segments[1];
  const source = { id: segment.id, alias: 's1', text: segment.text, kind: 'transcript', start: segment.start, source: 'synthetic', excerpted: false };
  let posts = 0;
  const guide = { status: 'completed', created_at: new Date().toISOString(), actual_model: 'browser-test/model', provider: 'Synthetic response fixture', elapsed_seconds: .1, selected_sources: [source], follow_ups: ['Read the conversation before and after the selected excerpts.'] };
  await page.route('**/api/cases/SA-26-1042/reading-guide', async route => {
    if (route.request().method() === 'POST') {
      posts++; expect(route.request().postDataJSON()).toEqual({ source_hash: 'a'.repeat(64), version: detail.version, reviewed_external_transfer: true });
      await route.fulfill({ json: { guide, cached: false } });
    } else await route.fulfill({ json: { enabled: true, detail: '', model: 'browser-test/model:free', version: detail.version, packet: { synthetic: true, sources: [source], source_hash: 'a'.repeat(64), omitted_count: 0 }, guide: null } });
  });
  await page.getByRole('button', { name: 'Refresh preview & status' }).click();
  await page.getByRole('button', { name: 'Review cloud transfer' }).click();
  const dialog = page.getByRole('dialog', { name: 'Send these excerpts to OpenRouter?' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Send excerpts & generate' })).toBeDisabled();
  expect(posts).toBe(0);
  await expect(dialog.getByText(segment.text, { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: '.impeccable/review/screenshots/reading-guide-preview-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: '.impeccable/review/screenshots/reading-guide-preview-mobile.png' });
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Send excerpts & generate' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Suggested review checks' })).toBeVisible();
  expect(posts).toBe(1);
  await page.getByRole('button', { name: /· transcript$/ }).click();
  await expect.poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThanOrEqual(segment.start);
  await page.locator('.reading-guide').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.impeccable/review/screenshots/reading-guide-result-mobile.png' });
  expect(errors).toEqual([]);
});
