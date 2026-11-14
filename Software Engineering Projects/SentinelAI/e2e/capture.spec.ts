import {test,expect} from '@playwright/test';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';

const cameraFixture=path.resolve('.local/camera-test.y4m');
// Synthetic camera only, matching the active capture configuration.
test.beforeAll(()=>{fs.mkdirSync(path.dirname(cameraFixture),{recursive:true});execFileSync('python',['-c',"import sys; from backend.pipeline import run_ffmpeg; run_ffmpeg(['-f','lavfi','-i','testsrc2=size=320x240:rate=20','-t','5','-pix_fmt','yuv420p',sys.argv[1]])",cameraFixture]);});
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+cameraFixture,'--use-fake-ui-for-media-stream']},permissions:['camera']});

test('consented camera recording uploads and completes real privacy processing',async({page})=>{
 await page.addInitScript(()=>{
  const Original=window.MediaRecorder;
  (window as any).__captureDiagnostics=[];
  window.MediaRecorder=class extends Original {
   constructor(stream:MediaStream,options?:MediaRecorderOptions){
    super(stream,options);
    for(const event of ['start','stop','error','dataavailable'])this.addEventListener(event,e=>(window as any).__captureDiagnostics.push({event,time:performance.now(),bytes:(e as BlobEvent).data?.size,tracks:stream.getTracks().map(t=>({kind:t.kind,state:t.readyState,enabled:t.enabled,muted:t.muted}))}));
   }
  };
 });
 await page.goto('/');await page.getByLabel('Workspace role').selectOption('demo-citizen');await page.getByRole('button',{name:'Enter demonstration'}).click();
 await expect(page.getByRole('heading',{name:'Operations overview'})).toBeVisible();
 await page.goto('/capture');await page.getByRole('button',{name:'Record with camera'}).click();
 await expect(page.getByRole('button',{name:'Enable camera'})).toBeDisabled();
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Enable camera'}).click();
 await expect.poll(()=>page.getByLabel('Live camera preview').evaluate((video:HTMLVideoElement)=>video.getVideoPlaybackQuality().totalVideoFrames)).toBeGreaterThan(2);
 expect(await page.getByLabel('Live camera preview').evaluate((v:HTMLVideoElement)=>(v.srcObject as MediaStream).getAudioTracks().length)).toBe(0);
 await page.getByRole('button',{name:'Start recording',exact:true}).click();
 await expect(page.getByText('00:02 · Recording')).toBeVisible({timeout:20000});
 await expect(page.getByRole('button',{name:'Submit evidence'})).toBeDisabled();
 await page.getByRole('button',{name:'Stop recording',exact:true}).click();
 await test.info().attach('capture-diagnostics',{body:JSON.stringify(await page.evaluate(()=>(window as any).__captureDiagnostics)),contentType:'application/json'});
 await expect(page.getByText(/Recording ready/)).toBeVisible();
 await page.getByRole('button',{name:'Turn camera off'}).click();
 await page.getByLabel('Case title').fill('Synthetic browser camera test pattern');
 await page.getByRole('button',{name:'Submit evidence'}).click();
 await expect(page.getByRole('heading',{name:'Synthetic browser camera test pattern',exact:true})).toBeVisible();
 await expect(page.getByText('Partial analysis.',{exact:true})).toBeVisible({timeout:60000});
 const c=await(await page.request.get('/api/cases/'+page.url().split('/').pop())).json();
 expect(c.privacy_status).toBe('full_frame_blurred');expect(c.captured_at).toBeTruthy();expect(c.risk_score).toBeNull();
});
