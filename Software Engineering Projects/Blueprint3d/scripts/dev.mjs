import { spawn } from 'node:child_process';
const npmCli=process.env.npm_execpath;
if(!npmCli)throw new Error('Start the studio with npm run dev.');
const children=['backend','frontend'].map(project=>spawn(process.execPath,[npmCli,'--prefix',project,'run','dev'],{stdio:'inherit',windowsHide:true}));
let openTimer;
if(process.argv.includes('--open')) {
  let checking=false,attempts=0;
  openTimer=setInterval(async()=>{
    if(checking)return;checking=true;attempts++;
    try {
      const responses=await Promise.all(['http://localhost:5173','http://localhost:4000/api/analysis/health'].map(url=>fetch(url,{signal:AbortSignal.timeout(1000)})));
      if(responses.every(response=>response.ok)) {
        clearInterval(openTimer);
        const url='http://localhost:5173/reference';
        if(process.platform==='win32')spawn('cmd',['/c','start','',url],{windowsHide:true,stdio:'ignore'});
        else spawn(process.platform==='darwin'?'open':'xdg-open',[url],{stdio:'ignore'});
      }
    }catch{/* The services are still starting. */}finally{checking=false;if(attempts>=60)clearInterval(openTimer);}
  },500);
}
let stopping=false;
const stop=()=>{if(stopping)return;stopping=true;clearInterval(openTimer);for(const child of children){if(process.platform==='win32'&&child.pid)spawn('taskkill',['/pid',String(child.pid),'/t','/f'],{windowsHide:true,stdio:'ignore'});else child.kill();}};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
for(const child of children)child.on('exit',code=>{if(!stopping){stop();process.exitCode=code??1;}});
