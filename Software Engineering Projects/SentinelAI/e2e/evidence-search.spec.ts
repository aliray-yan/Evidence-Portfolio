import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('local keyword search returns persisted evidence, seeks, and remains accessible on mobile', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Workspace role').selectOption('demo-supervisor');
  await page.getByRole('button', { name: 'Enter demonstration' }).click();
  await expect(page.getByRole('heading', { name: 'Operations overview' })).toBeVisible();
  const data = await (await page.request.get('/api/cases/SA-26-1042')).json();
  const segment = data.segments[1];
  await page.goto('/cases/SA-26-1042');
  await page.getByRole('tab', { name: 'Evidence summary' }).click();
  const search = page.getByRole('region', { name: 'Search case evidence Local only' });
  await expect(search.getByRole('option', { name: 'Meaning · multilingual' })).toHaveJSProperty('disabled', true);
  await search.getByLabel('Words or question').fill(segment.text);
  await search.getByRole('button', { name: 'Search evidence' }).click();
  await expect(search.getByText(segment.text, { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await search.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.impeccable/review/screenshots/search-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await search.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: '.impeccable/review/screenshots/search-mobile.png' });
  await search.locator('.reading-excerpts button').first().click();
  await expect(page.getByRole('tab', { name: 'Historical transcript', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThanOrEqual(segment.start);
});
