import { spawn } from 'node:child_process';
import path from 'node:path';
import type { BlueprintAnalyzer, FloorPlanDraft } from './BlueprintAnalyzer';
const SCRIPT_PATH = path.join(__dirname, 'worker', 'semantic_plan.py');
export class HeuristicBlueprintAnalyzer implements BlueprintAnalyzer {
  analyze(input: {
    imagePath: string;
    plotWidthMeters?: number;
    plotLengthMeters?: number;
  }): Promise<FloorPlanDraft> {
    return new Promise((resolve, reject) => {
      const binary = process.env.PYTHON_BIN ?? (process.platform === 'win32' ? 'python' : 'python3');
      const args = [SCRIPT_PATH, input.imagePath];
      if (input.plotWidthMeters)
        args.push('--plot-width', String(input.plotWidthMeters));
      if(input.plotLengthMeters)args.push('--plot-length',String(input.plotLengthMeters));
      const child = spawn(binary, args, { windowsHide: true, env: process.env });
      let stdout = '', stderr = '', timedOut = false;
      const timer = setTimeout(() => { timedOut = true; child.kill(); reject(new Error('Image analysis timed out after 90 seconds. Try a smaller, clearer drawing.')); }, 90000);
      child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); if (stdout.length > 10 * 1024 * 1024) {
        child.kill();
        clearTimeout(timer);
        reject(new Error('Analysis output exceeds the size limit.'));
      } });
      child.stderr.on('data', (chunk: Buffer) => { stderr = (stderr + chunk.toString()).slice(-20000); });
      child.on('error', error => { clearTimeout(timer); reject(new Error(`Could not start Python: ${error.message}. Set PYTHON_BIN in backend/.env.`)); });
      child.on('close', code => { clearTimeout(timer); if (timedOut)
        return; if (code !== 0) {
        let message='The drawing could not be analyzed. Check the analysis libraries and Tesseract installation, or choose Basic wall draft.';
        try {const diagnostic=JSON.parse(stderr.trim()) as {error?:string};if(diagnostic.error)message=diagnostic.error;}catch{/* Keep the full diagnostic in the server log. */}
        console.error('Blueprint analysis worker failed:',stderr.trim());
        reject(new Error(message));
        return;
      } try {
        resolve(JSON.parse(stdout) as FloorPlanDraft);
      }
      catch {
        reject(new Error('The analysis worker returned invalid JSON.'));
      } });
    });
  }
}
