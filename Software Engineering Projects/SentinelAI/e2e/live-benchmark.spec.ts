import {test,expect} from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const enabled=process.env.SENTINEL_STREAM_BENCH==='1';
const duration=Math.max(30,Math.min(1800,Number(process.env.SENTINEL_BENCH_SECONDS||600)));
const folder=path.resolve(process.env.SENTINEL_BENCH_OUTPUT||'.local/live-benchmark'),camera=path.join(folder,'camera.y4m');
const source=process.env.SENTINEL_BENCH_VIDEO?path.resolve(process.env.SENTINEL_BENCH_VIDEO):'';
const title=source?'Stock control streaming benchmark - not an incident':'Synthetic sustained streaming benchmark';
const learned=enabled&&!!JSON.parse(fs.readFileSync('.local/ai-selection.json','utf8')).models.learned_exchange_model;
test.beforeAll(()=>{if(!enabled)return;fs.mkdirSync(folder,{recursive:true});if(fs.existsSync(path.join(folder,'report.json')))throw new Error('Choose a new SENTINEL_BENCH_OUTPUT to preserve earlier measurements.');execFileSync('python',['-c',"import sys; from backend.pipeline import run_ffmpeg; source=['-i',sys.argv[2],'-vf','scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2,fps=15'] if sys.argv[2] else ['-f','lavfi','-i','testsrc2=size=640x360:rate=15']; run_ffmpeg(source+['-t','15' if sys.argv[2] else '5','-an','-pix_fmt','yuv420p',sys.argv[1]])",camera,source]);});
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+camera,'--use-fake-ui-for-media-stream','--disable-background-timer-throttling','--disable-renderer-backgrounding']},permissions:['camera']});
test('sustained original-stream model benchmark',async({page,browser})=>{
 test.skip(!enabled,'Opt-in actual-model sustained benchmark.');test.setTimeout((duration+180)*1000);
 await page.goto('/');await page.getByLabel('Workspace role').selectOption('demo-citizen');await page.getByRole('button',{name:'Enter demonstration'}).click();await expect(page.getByRole('link',{name:'Live cameras',exact:true})).toBeVisible();
 await page.goto('/live');await page.getByLabel('Session title').fill(title);await page.getByRole('checkbox',{name:/I have informed consent/}).check();await page.getByRole('button',{name:'Create camera session'}).click();
 await expect(page.getByRole('heading',{name:title})).toBeVisible();const url=page.url(),id=url.split('/').pop();
 await page.getByRole('button',{name:'Start camera'}).click();await expect(page.getByRole('status').filter({hasText:'Connected'})).toBeVisible({timeout:25000});
 const ctx=await browser.newContext(),reviewer=await ctx.newPage();await reviewer.goto('/');await reviewer.getByRole('button',{name:'Enter demonstration'}).click();await expect(reviewer.getByRole('link',{name:'Live cameras',exact:true})).toBeVisible();await reviewer.goto(url);
 const live=reviewer.getByLabel('Authorized clear live feed');await expect.poll(()=>live.evaluate((v:HTMLVideoElement)=>v.currentTime),{timeout:30000}).toBeGreaterThan(1);
 await live.evaluate((v:HTMLVideoElement)=>{const w=window as any;w.frameSamples=[];const next=(now:number,m:any)=>{if(w.frameSamples.length<30000)w.frameSamples.push({rtp:m.rtpTimestamp,media:m.mediaTime,display:now,capture:m.captureTime,receive:m.receiveTime});v.requestVideoFrameCallback(next);};v.requestVideoFrameCallback(next);});
 const started=Date.now(),initial=await live.evaluate((v:HTMLVideoElement)=>v.currentTime);const snapshots:any[]=[],results:any[]=[];let cursor=0,frames:any[]=[],failure:string|null=null,completed=false;
 const verification={measurement:false,continuity:false,replay:false,preservation:false};
 const save=()=>{
  const seen=new Set(frames.map((f:any)=>f.rtp)),samples=results.filter(r=>r.kind==='violence').flatMap(r=>r.sampled_rtp);
  const exchangeSamples=results.filter(r=>r.kind==='visual_exchange').flatMap(r=>r.sampled_rtp||[]);
  const elapsed=snapshots.at(-1)?.seconds??(Date.now()-started)/1000,playback=(snapshots.at(-1)?.view.time??initial)-initial;
  fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify({scope:'Local browser stream using '+(source?'a repeated attributed stock control':'synthetic test-pattern video')+'; actual installed violence model and '+(learned?'learned exchange model':'person/hand exchange rules')+'. Not Android/Wi-Fi or independent accuracy validation.',source:source?path.basename(source):'testsrc2',started_at:new Date(started).toISOString(),session_id:id,completed,verification,failure,requested_duration:duration,elapsed,playback,playback_ratio:playback/elapsed,source_rtp_samples:samples.length,source_rtp_matches:samples.filter(s=>seen.has(s)).length,exchange_rtp_samples:exchangeSamples.length,exchange_rtp_matches:exchangeSamples.filter(s=>seen.has(s)).length,frames,snapshots,results},null,2));
 };
 save();
 try{
  for(let i=0;Date.now()-started<duration*1000;i++){
   await page.waitForTimeout(Math.min(10000,duration*1000-(Date.now()-started)));
   const status=await(await reviewer.request.get(`/api/live/${id}/stream`,{timeout:10000})).json();
   const findings=await(await reviewer.request.get(`/api/live/${id}/results?after=${cursor}`,{timeout:10000})).json();
   if(findings.items?.length){cursor=findings.items.at(-1).seq;results.push(...findings.items);}
   const view=await live.evaluate((v:HTMLVideoElement)=>({time:v.currentTime,rate:v.playbackRate,...Object.fromEntries(['totalVideoFrames','droppedVideoFrames'].map(k=>[k,(v.getVideoPlaybackQuality() as any)[k]]))}));
   frames=await reviewer.evaluate(()=>(window as any).frameSamples||[]);
   snapshots.push({seconds:(Date.now()-started)/1000,...status.analysis,published:status.published,view});
   save();
   fs.writeFileSync(path.join(folder,'progress.json'),JSON.stringify({seconds:snapshots.at(-1).seconds,analysis:status.analysis,results:results.length,view},null,2));
   if(i%6===5)console.log('Measured stream seconds:',Math.round(snapshots.at(-1).seconds),'video windows:',status.analysis.video_windows,'exchange frames:',status.analysis.exchange_frames,'skipped:',status.analysis.skipped_video_windows);
   expect(status.published,'Camera connection must remain active throughout the measurement').toBe(true);
   expect(view.time,'Live playback must not reset during the measurement').toBeGreaterThan(initial);
  }
  verification.measurement=true;
 }catch(error){failure=error instanceof Error?error.message:String(error);throw error;}finally{
  // Preserve measured samples even on interruption; never leave an older success report behind.
  save();
 }
 try{
 expect(results.some(r=>r.kind==='violence')).toBe(true);expect(snapshots.at(-1).exchange_frames).toBeGreaterThan(10);expect(results.every(r=>r.kind!=='conversation')).toBe(true);
 if(learned&&process.env.SENTINEL_BENCH_EXPECT_TRANSFER==='1')expect(results.some(r=>r.kind==='visual_exchange'&&r.inference_source==='learned-visual-transfer')).toBe(true);
 if(learned)expect(snapshots.at(-1).exchange_coverage?.completed_windows,'Learned analysis must complete genuine temporal windows').toBeGreaterThan(0);
 expect(snapshots.at(-1).view.time-initial).toBeGreaterThan(duration*.94);
 expect(snapshots.every(s=>s.view.rate===1)).toBe(true);
 verification.continuity=true;
  // Exercise real retained source packets and explicit case preservation.
  await reviewer.getByRole('button',{name:'Replay interval',exact:true}).first().click();
  const replay=reviewer.getByLabel('Original interval replay');await expect(replay).toBeVisible();
  await replay.evaluate((v:HTMLVideoElement)=>{v.muted=true;return v.play();});
  await expect.poll(()=>replay.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.1);
  verification.replay=true;
  await reviewer.getByRole('button',{name:'Preserve for review',exact:true}).first().click();
  await reviewer.getByRole('dialog').getByRole('button',{name:'Create investigation case'}).click();
  await expect(reviewer.getByRole('link',{name:'Open preserved case'})).toBeVisible();
  verification.preservation=true;
  fs.mkdirSync('.impeccable/review/live',{recursive:true});
  await reviewer.evaluate(()=>window.scrollTo(0,0));
  await reviewer.screenshot({path:'.impeccable/review/live/desktop-model-results.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'.impeccable/review/live/phone-model-results.png',fullPage:true});
  await page.getByRole('button',{name:'End session',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'End session'}).click();await ctx.close();
  completed=true;
 }catch(error){failure=error instanceof Error?error.message:String(error);throw error;}finally{save();}
});
