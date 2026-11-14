import {test,expect} from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const fixture=path.resolve('.local/resumable-test.mp4');
test.beforeAll(()=>{
 fs.mkdirSync(path.dirname(fixture),{recursive:true});
 execFileSync('python',['-c',"import sys; from backend.pipeline import run_ffmpeg; run_ffmpeg(['-f','lavfi','-i','testsrc2=size=320x240:rate=20','-vf','noise=alls=80:allf=t','-t','3','-c:v','libx264','-crf','15','-pix_fmt','yuv420p',sys.argv[1]])",fixture]);
 expect(fs.statSync(fixture).size).toBeGreaterThan(2*1024*1024);
});

test('phone upload resumes lost acknowledgements and reaches the desktop queue automatically',async({browser})=>{
 const phone=await browser.newContext({viewport:{width:390,height:844},baseURL:'http://127.0.0.1:8010'});
 const desk=await browser.newContext({baseURL:'http://127.0.0.1:8010'});
 const mobile=await phone.newPage(),desktop=await desk.newPage();
 const title='Synthetic interrupted transfer '+Date.now();
 for(const [page,role] of [[mobile,'demo-citizen'],[desktop,'demo-supervisor']] as const){
  await page.goto('/');await page.getByLabel('Workspace role').selectOption(role);await page.getByRole('button',{name:'Enter demonstration'}).click();
  await expect(page.getByRole('heading',{name:'Operations overview'})).toBeVisible();
 }
 await desktop.goto('/cases?q='+encodeURIComponent(title)+'&sort=newest');
 await expect(desktop.getByText('No cases match these filters')).toBeVisible();
 const offsets:number[]=[];let uploadId='',lostPart=false,lostCompletion=false;
 await mobile.route('**/api/uploads/*?offset=*',async route=>{
  const url=new URL(route.request().url());uploadId=url.pathname.split('/').pop()!;offsets.push(Number(url.searchParams.get('offset')));
  if(!lostPart){lostPart=true;const response=await route.fetch();expect(response.ok()).toBeTruthy();await route.abort('internetdisconnected');}
  else await route.continue();
 });
 await mobile.route('**/api/uploads/*/complete',async route=>{
  if(!lostCompletion){lostCompletion=true;const response=await route.fetch();expect(response.ok()).toBeTruthy();await route.abort('internetdisconnected');}
  else await route.continue();
 });
 await mobile.goto('/capture');await mobile.getByRole('checkbox').check();
 await mobile.getByLabel('Choose evidence video').setInputFiles(fixture);await mobile.getByLabel('Case title').fill(title);
 await mobile.getByRole('button',{name:'Submit evidence'}).click();
 await expect(mobile.getByText('Upload paused',{exact:true})).toBeVisible();
 let state=await(await mobile.request.get('/api/uploads/'+uploadId)).json();
 expect(state.received).toBe(1024*1024);expect(state.case_id).toBeNull();
 expect(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 fs.mkdirSync('.impeccable/review/screenshots',{recursive:true});
 await mobile.screenshot({path:'.impeccable/review/screenshots/mobile-resumable-upload.png',fullPage:true});
 await mobile.getByRole('button',{name:'Resume upload'}).click();
 await expect.poll(()=>lostCompletion,{timeout:30000}).toBe(true);
 await expect(mobile.getByText('Upload paused',{exact:true})).toBeVisible();
 state=await(await mobile.request.get('/api/uploads/'+uploadId)).json();
 expect(state.state).toBe('completed');expect(state.case_id).toBeTruthy();
 await mobile.getByRole('button',{name:'Resume upload'}).click();
 await expect(mobile.getByRole('heading',{name:title,exact:true})).toBeVisible();
 expect(offsets.filter(n=>n===0)).toHaveLength(1);
 await desktop.bringToFront();
 await expect(desktop.getByRole('link',{name:title,exact:true})).toBeVisible({timeout:15000});
 await desktop.screenshot({path:'.impeccable/review/screenshots/desktop-transfer-queue.png',fullPage:true});
 const queue=await(await desktop.request.get('/api/cases?q='+encodeURIComponent(title))).json();
 expect(queue.total).toBe(1);expect(queue.items[0].id).toBe(state.case_id);
 await expect(mobile.getByText('Partial analysis.',{exact:true})).toBeVisible({timeout:60000});
 await phone.close();await desk.close();
});
