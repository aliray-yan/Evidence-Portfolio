import {test,expect,Page} from '@playwright/test';
import path from 'node:path';

async function signIn(page:Page,role='supervisor'){
 await page.goto('/');
 await page.getByLabel('Workspace role').selectOption('demo-'+role);
 await page.getByRole('button',{name:'Enter demonstration'}).click();
 await expect(page.getByRole('heading',{name:'Operations overview'})).toBeVisible();
}

test('dashboard, queue filters, evidence seeking and responsive surfaces',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await signIn(page);
 await expect(page.getByRole('heading',{name:'Recent cases'})).toBeVisible();
 await page.screenshot({path:'.impeccable/review/screenshots/desktop-overview.png',fullPage:true});
 await page.getByRole('link',{name:'Case queue',exact:true}).click();
 await page.getByRole('textbox',{name:'Search case queue'}).fill('Unofficial');
 await expect(page.getByRole('link',{name:'Unofficial payment concern',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Unofficial payment concern',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Unofficial payment concern',exact:true})).toBeVisible();
 await page.locator('video').evaluate((video:HTMLVideoElement)=>new Promise<void>(resolve=>{if(video.readyState>=1)resolve();else video.addEventListener('loadedmetadata',()=>resolve(),{once:true});}));
 await page.getByRole('button',{name:/00:08.*Officer/}).click();
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThanOrEqual(8);
 await page.getByRole('tab',{name:'Transcript',exact:true}).focus();await page.keyboard.press('ArrowRight');
 await expect(page.getByRole('tab',{name:'Event timeline'})).toBeFocused();
 await expect(page.getByText('Simulated handover gesture')).toBeVisible();
 await page.getByRole('tab',{name:'Evidence summary'}).click();
 await expect(page.getByRole('heading',{name:'Uncertainty & missing evidence'})).toBeVisible();
 await page.locator('h1').click();await page.evaluate(()=>window.scrollTo(0,0));
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
 await page.screenshot({path:'.impeccable/review/screenshots/desktop-investigation.png',fullPage:true});
 await page.getByRole('link',{name:'Back to case queue'}).click();
 await expect(page.getByRole('textbox',{name:'Search case queue'})).toHaveValue('Unofficial');
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Operations overview'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Recent cases'})).toBeVisible();
 await page.screenshot({path:'.impeccable/review/screenshots/mobile-overview.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
 await page.goto('/cases/SA-26-1042');
 await expect(page.getByRole('heading',{name:'Unofficial payment concern',exact:true})).toBeVisible();
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
 await page.locator('video').evaluate((v:HTMLVideoElement)=>v.play());
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.2);
 await page.locator('video').evaluate((v:HTMLVideoElement)=>v.pause());
 await page.locator('h1').click();await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'.impeccable/review/screenshots/mobile-investigation.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
 expect(errors).toEqual([]);
});

test('supervisor notes, review rationale and audit history persist',async({page})=>{
 await signIn(page);await page.goto('/cases/SA-26-1040');
 await page.getByLabel('Add a note').fill('E2E review: procedural context requires independent human assessment.');
 await page.getByRole('button',{name:'Save note',exact:true}).click();
 await expect(page.getByText('E2E review: procedural context requires independent human assessment.')).toBeVisible();
 await page.getByRole('combobox',{name:/Review action/}).selectOption('dismiss');
 await page.getByLabel('Rationale',{exact:true}).fill('E2E decision: the later procedure explanation does not support an adverse conclusion.');
 await page.getByRole('button',{name:'Review & submit'}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByRole('button',{name:'Save to case history'}).click();
 await expect(page.getByRole('dialog')).not.toBeVisible();
 await page.getByRole('tab',{name:'Case history'}).click();
 await expect(page.getByText('E2E decision: the later procedure explanation does not support an adverse conclusion.')).toBeVisible();
 await page.reload();await page.getByRole('tab',{name:'Case history'}).click();
 await expect(page.getByText('review.dismiss',{exact:true})).toBeVisible();
});

test('citizen sees own cases, protected exports and independent appeal',async({page})=>{
 await signIn(page);
 const c=await (await page.request.get('/api/cases/SA-26-1040')).json();
 if(c.status==='awaiting_review'){
   const auth=await (await page.request.get('/api/auth/me')).json();
   await page.request.post('/api/cases/SA-26-1040/review',{headers:{'X-CSRF-Token':auth.csrf},data:{action:'dismiss',reason:'Test setup: procedural context explains the concern.',version:c.version}});
 }
 await page.getByRole('button',{name:'Sign out'}).click();
 await signIn(page,'citizen');
 expect((await page.request.get('/api/cases/SA-26-1041')).status()).toBe(404);
 expect((await page.request.get('/api/admin/users')).status()).toBe(403);
 await page.goto('/cases/SA-26-1040');
 await page.getByLabel('Reason for appeal').fill('E2E appeal: please ask a different reviewer to assess the full context.');
 await page.getByRole('button',{name:'Request independent re-review'}).click();
 await page.getByRole('button',{name:'Save to case history'}).click();
 await expect(page.locator('.case-ident')).toContainText('Appealed');
 const report=await page.request.get('/api/cases/SA-26-1040/report');expect(report.status()).toBe(200);expect((await report.json()).synthetic).toBe(1);
});

test('actual upload progress, processing, redacted artifacts and duplicate protection',async({page})=>{
 await signIn(page,'citizen');
 const fixture=await (await page.request.get('/api/cases/SA-26-1042')).json();
 const media=await page.request.get('/api/evidence/'+fixture.evidence.find((e:any)=>e.kind==='video').id);
 const buffer=await media.body();
 await page.goto('/capture');
 await page.getByRole('checkbox').check();
 await page.getByLabel('Choose evidence video').setInputFiles({name:'consented-synthetic-test.mp4',mimeType:'video/mp4',buffer});
 await page.getByLabel('Case title').fill('Browser upload of synthetic title-card fixture');
 await page.getByRole('button',{name:'Submit evidence'}).click();
 await expect(page.getByRole('heading',{name:'Browser upload of synthetic title-card fixture',exact:true})).toBeVisible();
 await expect(page.getByText('Partial analysis.',{exact:true})).toBeVisible({timeout:60000});
 await expect(page.locator('video')).toBeVisible();
 const url=page.url();const caseId=url.split('/').pop();
 const c=await (await page.request.get('/api/cases/'+caseId)).json();expect(c.risk_label).toBe('Unassessed');expect(c.privacy_status).toBe('full_frame_blurred');
 await page.goto('/capture');await page.getByRole('checkbox').check();await page.getByLabel('Choose evidence video').setInputFiles({name:'same.mp4',mimeType:'video/mp4',buffer});await page.getByLabel('Case title').fill('Duplicate must reuse the same record');await page.getByRole('button',{name:'Submit evidence'}).click();await expect(page).toHaveURL(url);
});

test('request and submit additional evidence preserves the original investigation',async({page})=>{
 await signIn(page);await page.goto('/cases/SA-26-1041');
 await page.getByRole('combobox',{name:'Review action',exact:true}).selectOption('request_evidence');
 await page.getByLabel('Rationale',{exact:true}).fill('Please supply the preceding context for independent assessment.');
 await page.getByRole('button',{name:'Review & submit'}).click();await page.getByRole('button',{name:'Save to case history'}).click();
 await expect(page.getByRole('link',{name:'Submit requested evidence'})).toBeVisible();
 const fixture=await(await page.request.get('/api/cases/SA-26-1042')).json();
 const buffer=await(await page.request.get('/api/evidence/'+fixture.evidence.find((e:any)=>e.kind==='video').id)).body();
 await page.getByRole('link',{name:'Submit requested evidence'}).click();
 await page.getByRole('checkbox').check();await page.getByLabel('Choose evidence video').setInputFiles({name:'additional-script-fixture.mp4',mimeType:'video/mp4',buffer});
 await page.getByLabel('Case title').fill('Additional scripted context recording');await page.getByRole('button',{name:'Submit evidence'}).click();
 await expect(page.getByRole('heading',{name:'Additional scripted context recording',exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:/Requested by:/})).toBeVisible();
 await page.getByRole('link',{name:/Requested by:/}).click();
 await expect(page.getByRole('link',{name:'Additional scripted context recording'})).toBeVisible();
 await expect(page.locator('.case-ident')).toContainText('Evidence requested');
 await page.getByRole('tab',{name:'Case history'}).click();await expect(page.getByText('Please supply the preceding context for independent assessment.')).toBeVisible();
});

test('alert acknowledgement and resolution report only local delivery',async({page})=>{
 await signIn(page,'responder');await page.getByRole('link',{name:'Alert center',exact:true}).click();
 const alertTitle=await page.locator('.alert-title h3').first().innerText();
 await page.getByRole('button',{name:'View response log'}).first().click();
 await expect(page.getByText('External · Unavailable')).toBeVisible();
 await page.getByRole('combobox',{name:/^Action/}).selectOption('acknowledge');
 await page.getByLabel('Response rationale').fill('E2E responder acknowledges this simulated safety event.');
 await page.getByRole('button',{name:'Review response',exact:true}).click();await page.getByRole('button',{name:'Confirm action',exact:true}).click();
 await expect(page.getByRole('dialog')).not.toBeVisible();
 await expect(page.getByText('Alert response recorded. External delivery remains unavailable.')).toBeVisible();
 await page.locator('.alert-row').filter({hasText:alertTitle}).getByRole('button',{name:'View response log'}).click();
 await page.getByRole('combobox',{name:/^Action/}).selectOption('resolve');
 await page.getByLabel('Response rationale').fill('Synthetic exercise completed; no real incident or external dispatch.');
 await page.getByRole('button',{name:'Review response',exact:true}).click();await page.getByRole('button',{name:'Confirm action',exact:true}).click();
 await expect(page.getByRole('dialog')).not.toBeVisible();
 await expect(page.locator('.alert-row').filter({hasText:alertTitle})).toContainText('Resolved');
 await page.locator('.alert-row').filter({hasText:alertTitle}).getByRole('button',{name:'View response log'}).click();
 await expect(page.locator('.response-body')).toContainText('Synthetic exercise completed');
});

test('administrator creates account, inspects policies and verifies audit',async({page})=>{
 await signIn(page,'admin');await page.getByRole('link',{name:'Administration',exact:true}).click();
 await page.getByRole('button',{name:'Create account',exact:true}).click();
 await page.getByLabel('Full name').fill('Browser test account');await page.getByLabel('Email',{exact:true}).fill('browser-test@example.test');await page.getByLabel('Initial password').fill('Browser-test-password-2026');
 await page.locator('form').getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByText('Browser test account',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Processing policy'}).click();await expect(page.getByLabel('Ambiguous threshold')).toHaveValue('30');
 await page.getByRole('link',{name:'Audit trail',exact:true}).click();await expect(page.getByText(/Chain verified/)).toBeVisible();
 await page.getByRole('link',{name:'System health',exact:true}).click();await expect(page.getByRole('heading',{name:'Violence & weapon detection'})).toBeVisible();
});
