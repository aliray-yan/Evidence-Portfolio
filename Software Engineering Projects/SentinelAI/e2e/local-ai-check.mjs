import fs from 'node:fs';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const fixture=JSON.parse(fs.readFileSync('.local/ai-verification/pipeline-verification.json','utf8'));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const reviewer=await browser.newContext({baseURL:'http://127.0.0.1:8011',viewport:{width:1440,height:1000}});
const participant=await browser.newContext({baseURL:'http://127.0.0.1:8011'});
const admin=await browser.newContext({baseURL:'http://127.0.0.1:8011'});
const errors=[];
try {
  for(const [context,role] of [[reviewer,'supervisor'],[participant,'citizen'],[admin,'admin']]){
    const response=await context.request.post('/api/auth/demo',{data:{user_id:'demo-'+role}});
    expect(response.status()).toBe(200);
  }
  const page=await reviewer.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/cases/'+fixture.case_id);
  await expect(page.getByRole('heading',{name:'Analysis provenance'})).toBeVisible();
  await page.getByText('Speech transcription',{exact:true}).click();
  await page.getByText('Hand & pose observations',{exact:true}).click();
  await page.getByText('Sound-event candidates',{exact:true}).click();
  await expect(page.getByText('Analyzed sound windows',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Inspect masked copy'}).click();
  const preview=page.getByLabel('Restricted privacy preview');
  await expect.poll(()=>preview.evaluate(v=>v.readyState)).toBeGreaterThanOrEqual(2);
  await preview.evaluate(v=>v.currentTime=1);
  await expect.poll(()=>preview.evaluate(v=>v.seeking)).toBe(false);
  for (const video of [page.getByLabel('Case evidence video'), preview]) {
    await video.evaluate(v=>v.play());
    await expect.poll(()=>video.evaluate(v=>v.currentTime)).toBeGreaterThan(1.2);
    await video.evaluate(v=>v.pause());
  }
  await page.locator('h1').click(); await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'.impeccable/review/screenshots/desktop-ai-investigation.png',fullPage:true});
  const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(audit.violations).toEqual([]);
  let c=await(await reviewer.request.get('/api/cases/'+fixture.case_id)).json();
  const evidence=c.evidence.find(e=>e.kind==='face_preview').id;
  expect((await participant.request.get('/api/evidence/'+evidence)).status()).toBe(403);
  await page.getByRole('checkbox',{name:/I reviewed the entire masked copy/}).check();
  await page.getByLabel('Privacy review rationale').fill('Technical fixture review only: public still images and no original recorded incident. Testing restricted release.');
  await page.getByRole('button',{name:'Review masked-copy release'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect((await participant.request.get('/api/evidence/'+evidence)).status()).toBe(403);
  await page.getByRole('button',{name:'Release masked copy',exact:true}).click();
  await expect(page.getByRole('button',{name:'Return to full blur',exact:true})).toBeVisible();
  expect((await participant.request.get('/api/evidence/'+evidence)).status()).toBe(200);
  await page.getByLabel('Privacy review rationale').fill('Technical exercise completed; withdraw selective-copy access and restore the default full blur.');
  await page.getByRole('button',{name:'Return to full blur',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Return to full blur',exact:true}).click();
  await expect(page.getByRole('button',{name:'Review masked-copy release'})).toBeVisible();
  expect((await participant.request.get('/api/evidence/'+evidence)).status()).toBe(403);
  await page.setViewportSize({width:390,height:844});
  await page.getByLabel('Case evidence video').evaluate(v=>v.play());
  await expect.poll(()=>page.getByLabel('Case evidence video').evaluate(v=>v.currentTime)).toBeGreaterThan(.4);
  await page.getByLabel('Case evidence video').evaluate(v=>v.pause());
  await page.locator('h1').click(); await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'.impeccable/review/screenshots/mobile-ai-investigation.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const mobileAudit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(mobileAudit.violations).toEqual([]);
  const adminPage=await admin.newPage();
  await adminPage.goto('/admin?tab=policies');
  await expect(adminPage.getByRole('heading',{name:'Scheduled retention'})).toBeVisible();
  await adminPage.screenshot({path:'.impeccable/review/screenshots/desktop-retention.png',fullPage:true});
  expect((await new AxeBuilder({page:adminPage}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
  fs.writeFileSync('.local/ai-verification/browser-verification.json',JSON.stringify({privacy_release_revoke:'passed',before_confirmation_denied:true,desktop_mobile_overflow:false,axe_violations:0,page_errors:errors,case_id:fixture.case_id},null,2));
  console.log('Actual-model investigation: privacy release/revoke, role protection, desktop/mobile and 3 accessibility states passed.');
}finally{await browser.close();}
