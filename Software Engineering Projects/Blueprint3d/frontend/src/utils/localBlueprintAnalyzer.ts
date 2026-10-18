import type { FloorPlan } from '../types/floorPlan';
export async function analyzeLocalImage(url: string, knownWidth?: number): Promise<FloorPlan> {
  const image = new Image();
  image.src = url;
  await image.decode();
  if (image.naturalWidth > 15000 || image.naturalHeight > 15000)
    throw new Error('Image dimensions are too large. Resize to under 15,000 pixels per side.');
  const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  return new Promise((resolve, reject) => { const worker = new Worker(new URL('../workers/blueprint.worker.ts', import.meta.url), { type: 'module' }); const cleanup = () => { clearTimeout(timer); worker.terminate(); }; const timer = setTimeout(() => { cleanup(); reject(new Error('Analysis took too long. Use a simpler image or trace it in the editor.')); }, 20000); worker.onmessage = e => { cleanup(); if (e.data.error)
    reject(new Error(e.data.error));
  else
    resolve(e.data.plan); }; worker.onerror = () => { cleanup(); reject(new Error('Local analysis could not finish. Try a clearer image.')); }; worker.postMessage({ pixels, width: canvas.width, height: canvas.height, knownWidth }, [pixels.buffer]); });
}
