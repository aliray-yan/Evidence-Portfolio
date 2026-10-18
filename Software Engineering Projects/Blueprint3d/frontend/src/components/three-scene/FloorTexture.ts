import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
export function createFloorTexture(kind: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = kind === 'tile' ? '#eeeae0' : '#dabd96';
  ctx.fillRect(0, 0, 256, 256);
  if (kind === 'tile') {
    ctx.strokeStyle = '#d6d1c5';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 256; i += 128) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }
  }
  else {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = ['#dec6a3', '#d6ba93', '#dfc5a0', '#d8bc96'][i % 4];
      ctx.fillRect(i * 32, 0, 31, 256);
      ctx.strokeStyle = '#bca47f';
      ctx.lineWidth = .5;
      ctx.beginPath();
      ctx.moveTo(i * 32, 0);
      ctx.lineTo(i * 32, 256);
      ctx.moveTo(i * 32, (i % 3) * 80 + 30);
      ctx.lineTo(i * 32 + 32, (i % 3) * 80 + 30);
      ctx.stroke();
      for (let j = 0; j < 4; j++) {
        ctx.strokeStyle = '#b69a701a';
        ctx.beginPath();
        ctx.moveTo(i * 32 + 5 + j * 7, 0);
        ctx.bezierCurveTo(i * 32 + j * 7, 70, i * 32 + 10 + j * 5, 180, i * 32 + 5 + j * 7, 256);
        ctx.stroke();
      }
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(.5, .5);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
