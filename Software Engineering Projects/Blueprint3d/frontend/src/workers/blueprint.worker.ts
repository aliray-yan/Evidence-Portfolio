import { extractRasterPlan } from '../utils/rasterPlan';
self.onmessage = (event: MessageEvent<{
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  knownWidth?: number;
}>) => { try {
  const { pixels, width, height, knownWidth } = event.data;
  self.postMessage({ plan: extractRasterPlan(pixels, width, height, knownWidth) });
}
catch (e) {
  self.postMessage({ error: (e as Error).message });
} };
