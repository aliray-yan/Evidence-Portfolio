import { defineConfig } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
const benchmark=process.env.SENTINEL_STREAM_BENCH==='1';
const violence=benchmark?path.resolve(JSON.parse(fs.readFileSync('.local/model-selection.json','utf8')).directory):'';
const models=benchmark?JSON.parse(fs.readFileSync('.local/ai-selection.json','utf8')).models:{};
const exchange=benchmark?path.resolve(models.exchange_model.path):'',hands=benchmark?path.resolve(models.gesture_model.path):'';
const learnedExchange=benchmark&&models.learned_exchange_model?path.resolve(models.learned_exchange_model.path):'';
// Browser regressions must never inherit a real cloud credential.
process.env.OPENROUTER_API_KEY = '';
process.env.SENTINEL_OPENROUTER_REAL_CASES = '0';
export default defineConfig({
 testDir:'./e2e',fullyParallel:false,workers:1,timeout:60000,retries:0,
 reporter:[['list'],['json',{outputFile:'test-results/e2e-results.json'}]],
 use:{baseURL:'http://127.0.0.1:8010',viewport:{width:1440,height:1000},
  launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined},
  trace:benchmark?'off':'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:'python -m uvicorn backend.main:app --host 127.0.0.1 --port 8010',
  url:'http://127.0.0.1:8010/api/public/config',reuseExistingServer:false,timeout:60000,
  env:{SENTINEL_DATA_DIR:path.resolve('.local/e2e-'+Date.now()),SENTINEL_DEMO:'1',SENTINEL_WORKERS:'1',
   SENTINEL_VIOLENCE_MODEL:violence,SENTINEL_WHISPER_MODEL:'',SENTINEL_EXCHANGE_MODEL:exchange,SENTINEL_GESTURE_MODEL:hands,
   SENTINEL_LEARNED_EXCHANGE_MODEL:learnedExchange,
   SENTINEL_POSE_MODEL:'',SENTINEL_FACE_MODEL:'',SENTINEL_OBJECT_MODEL:'',SENTINEL_ACOUSTIC_MODEL:'',
   SENTINEL_DIARIZATION_MODEL:'',SENTINEL_RETRIEVAL_MODEL:''}}
});
