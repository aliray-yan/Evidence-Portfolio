import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';

const camera=path.resolve('.local/live-camera-test.y4m'),microphone=path.resolve('.local/live-mic-test.wav');
test.beforeAll(()=>{fs.mkdirSync(path.dirname(camera),{recursive:true});execFileSync('python',['-c',"import sys; from backend.pipeline import run_ffmpeg; run_ffmpeg(['-f','lavfi','-i','testsrc2=size=640x360:rate=15','-t','5','-pix_fmt','yuv420p',sys.argv[1]]); run_ffmpeg(['-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','10','-c:a','pcm_s16le',sys.argv[2]])",camera,microphone]);});
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+camera,'--use-file-for-fake-audio-capture='+microphone,'--use-fake-ui-for-media-stream']},permissions:['camera','microphone']});

test('continuous vision-only MediaMTX video reaches an authorized reviewer without microphone access',async({page,browser})=>{
 test.setTimeout(100000);
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');await page.getByLabel('Workspace role').selectOption('demo-citizen');await page.getByRole('button',{name:'Enter demonstration'}).click();await expect(page.getByRole('heading',{name:'Operations overview'})).toBeVisible();
 await page.goto('/live');await page.getByLabel('Session title').fill('Synthetic continuous camera verification');
 await page.getByRole('checkbox',{name:/I have informed consent/}).check();await page.getByRole('button',{name:'Create camera session'}).click();
 const title=page.getByRole('heading',{name:'Synthetic continuous camera verification'});await expect(title).toBeVisible();
 const sessionUrl=page.url(),id=sessionUrl.split('/').pop();
 await page.getByRole('button',{name:'Start camera'}).click();
 await expect(page.getByRole('status').filter({hasText:'Connected'})).toBeVisible({timeout:25000});
 const ctx=await browser.newContext({viewport:{width:1440,height:1000}}),reviewer=await ctx.newPage();
 await reviewer.goto('/');await reviewer.getByRole('button',{name:'Enter demonstration'}).click();await expect(reviewer.getByRole('link',{name:'Live cameras',exact:true})).toBeVisible();await reviewer.goto(sessionUrl);
 const live=reviewer.getByLabel('Authorized clear live feed');
 await expect.poll(()=>live.evaluate((v:HTMLVideoElement)=>v.getVideoPlaybackQuality().totalVideoFrames),{timeout:25000}).toBeGreaterThan(20);
 await expect(reviewer.getByText(/Source RTP/)).toBeVisible();
 await expect.poll(async()=>((await(await reviewer.request.get(`/api/live/${id}/stream`)).json()).analysis.decoded_frames||0),{timeout:20000}).toBeGreaterThan(50);
 const state=await(await reviewer.request.get(`/api/live/${id}/stream`)).json();
 expect(state.analysis.status).toBe('receiving');
 expect(state.analysis.vision).toBe('unavailable');
 expect((await page.request.get(`/api/live/${id}/results`)).status()).toBe(403);
 expect(await live.evaluate((v:HTMLVideoElement)=>(v.srcObject as MediaStream).getAudioTracks().length)).toBe(0);
 expect(await page.getByLabel('Phone camera preview').evaluate((v:HTMLVideoElement)=>(v.srcObject as MediaStream).getAudioTracks().length)).toBe(0);
 expect(await live.evaluate((v:HTMLVideoElement)=>v.playbackRate)).toBe(1);
 const start=await live.evaluate((v:HTMLVideoElement)=>v.currentTime),clock=Date.now();
 await expect.poll(()=>live.evaluate((v:HTMLVideoElement)=>v.currentTime),{timeout:16000}).toBeGreaterThan(start+8);
 expect((Date.now()-clock)/1000).toBeLessThan(13);
 // Explicit synthetic observation tests late-result UI, not model accuracy.
 const shot=await live.evaluate((v:HTMLVideoElement)=>new Promise<{rtp:number;seconds:number;jpeg:string}>(resolve=>v.requestVideoFrameCallback((_,m:any)=>{
  const c=document.createElement('canvas');c.width=640;c.height=360;c.getContext('2d')!.drawImage(v,0,0,640,360);
  resolve({rtp:m.rtpTimestamp,seconds:m.mediaTime,jpeg:c.toDataURL('image/jpeg').split(',')[1]});
 })));
 await expect.poll(()=>live.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(shot.seconds+1);
 const fixture={id:'synthetic-visual-ui',seq:1,kind:'visual_exchange',title:'Possible Bribery / Suspicious Visual Exchange – Pending Human Review',
  epoch:state.analysis.epoch,flagged:true,created_at:new Date().toISOString(),start_rtp:(shot.rtp-90000+2**32)%2**32,end_rtp:shot.rtp,
  start_seconds:shot.seconds-1,end_seconds:shot.seconds,inference_seconds:.2,confidence:.7,source:'synthetic_ui_test',
  detail:'Synthetic UI fixture on generated test-pattern video. No people, object transfer or genuine model finding.',
  snapshot_jpeg:shot.jpeg,snapshot_rtp:shot.rtp,snapshot_width:640,snapshot_height:360,
  boxes:[{rtp:shot.rtp,xyxy:[.2,.2,.5,.65],label:'Synthetic geometry test'}]};
 const learnedFixture={...fixture,id:'synthetic-learned-ui',seq:2,confidence:.81,confidence_type:'uncalibrated learned window score',boxes:[],snapshot_jpeg:undefined,
  detail:'Synthetic learned-score presentation fixture; not an actual prediction.'};
 await reviewer.route(`**/api/live/${id}/results?*`,route=>route.fulfill({json:{items:new URL(route.request().url()).searchParams.get('after')==='0'?[fixture,learnedFixture]:[]}}));
 await expect(reviewer.getByText('Synthetic UI fixture on generated test-pattern video. No people, object transfer or genuine model finding.')).toBeVisible();
 await expect(reviewer.getByText('Earlier video · late result').first()).toBeVisible();
 await expect(reviewer.getByText(/Model score 81.0%/)).toBeVisible();
 await expect(reviewer.getByText(/Heuristic support 70.0%/)).toBeVisible();
 await expect(reviewer.locator('.live-screen .stream-box')).toHaveCount(0);
 await expect(reviewer.locator('.exchange-snapshot .stream-box')).toHaveCount(1);
 fs.mkdirSync('.impeccable/review/live',{recursive:true});
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'.impeccable/review/live/phone.png',fullPage:true});
 await reviewer.evaluate(()=>window.scrollTo(0,0));await reviewer.screenshot({path:'.impeccable/review/live/desktop.png',fullPage:true});
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 expect((await new AxeBuilder({page:reviewer}).analyze()).violations).toEqual([]);
 // Viewing and AI read one stream; no segment-upload API or completed clip exists.
 const details=await(await reviewer.request.get(`/api/live/${id}`)).json();expect(details.segments).toEqual([]);
 await page.getByRole('button',{name:'End session',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'End session'}).click();
 await expect.poll(async()=>(await(await reviewer.request.get('/api/live/'+id)).json()).status).toBe('ended');
 await ctx.close();
});
