import {test,expect} from '@playwright/test';

test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']},permissions:['camera','microphone']});

test('consented camera recording uploads and completes real privacy processing',async({page})=>{
 await page.goto('/');await page.getByLabel('Workspace role').selectOption('demo-citizen');await page.getByRole('button',{name:'Enter demonstration'}).click();
 await expect(page.getByRole('heading',{name:'Operations overview'})).toBeVisible();
 await page.goto('/capture');await page.getByRole('button',{name:'Record with camera'}).click();
 await expect(page.getByRole('button',{name:'Enable camera & microphone'})).toBeDisabled();
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Enable camera & microphone'}).click();
 await page.getByRole('button',{name:'Start recording',exact:true}).click();
 await expect(page.getByText('00:02 · Recording')).toBeVisible();
 await expect(page.getByRole('button',{name:'Submit evidence'})).toBeDisabled();
 await page.getByRole('button',{name:'Stop recording',exact:true}).click();
 await expect(page.getByText(/Recording ready/)).toBeVisible();
 await page.getByRole('button',{name:'Turn camera off'}).click();
 await page.getByLabel('Case title').fill('Synthetic browser camera test pattern');
 await page.getByRole('button',{name:'Submit evidence'}).click();
 await expect(page.getByRole('heading',{name:'Synthetic browser camera test pattern',exact:true})).toBeVisible();
 await expect(page.getByText('Partial analysis.',{exact:true})).toBeVisible({timeout:60000});
 const c=await(await page.request.get('/api/cases/'+page.url().split('/').pop())).json();
 expect(c.privacy_status).toBe('full_frame_blurred');expect(c.captured_at).toBeTruthy();expect(c.risk_score).toBeNull();
});
