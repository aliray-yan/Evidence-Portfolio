import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { SAMPLES } from '../frontend/src/data/samples';
const require = createRequire(import.meta.url);
const sharp = require(process.env.BLUEPRINT_SHARP_PATH || 'sharp');
const destination = path.resolve('frontend/public/samples');
await fs.mkdir(destination, { recursive: true });
const xml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
for (const sample of SAMPLES) {
  const p = sample.plan, scale = 64, ox = 95, oy = 145, w = p.plot.width * scale + 190, h = p.plot.length * scale + 245;
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="white"/><g font-family="Arial,sans-serif"><text x="${ox}" y="42" font-size="24" font-weight="bold" fill="#203c32">${xml(sample.name)}</text><text x="${ox}" y="67" font-size="12" fill="#6e7d71">BLUEPRINT3D · ORIGINAL TEST PLAN · GROUND FLOOR</text><text x="${w / 2}" y="${oy - 30}" text-anchor="middle" font-size="18">${p.plot.width.toFixed(2)} m</text><text x="${ox - 35}" y="${oy + p.plot.length * scale / 2}" text-anchor="middle" font-size="18" transform="rotate(-90 ${ox - 35} ${oy + p.plot.length * scale / 2})">${p.plot.length.toFixed(2)} m</text>`];
  for (const r of p.rooms) {
    const xs = r.boundary.map(q => q.x), ys = r.boundary.map(q => q.y), x = (Math.min(...xs) + Math.max(...xs)) / 2, y = (Math.min(...ys) + Math.max(...ys)) / 2;
    parts.push(`<text x="${ox + x * scale}" y="${oy + y * scale - 8}" text-anchor="middle" font-size="${r.name.length > 15 ? 13 : 15}" fill="#47544b">${xml(r.name)}</text><text x="${ox + x * scale}" y="${oy + y * scale + 14}" text-anchor="middle" font-size="12" fill="#728077">${(Math.max(...xs) - Math.min(...xs)).toFixed(2)} × ${(Math.max(...ys) - Math.min(...ys)).toFixed(2)} m</text>`);
  }
  for (const wall of p.walls)
    parts.push(`<line x1="${ox + wall.start.x * scale}" y1="${oy + wall.start.y * scale}" x2="${ox + wall.end.x * scale}" y2="${oy + wall.end.y * scale}" stroke="#20332a" stroke-width="${wall.thickness * scale}" stroke-linecap="square"/>`);
  for (const o of [...p.doors, ...p.windows]) {
    const wall = p.walls.find(q => q.id === o.wallId)!, dx = wall.end.x - wall.start.x, dy = wall.end.y - wall.start.y, len = Math.hypot(dx, dy), angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const x = ox + (wall.start.x + dx / len * o.offset) * scale, y = oy + (wall.start.y + dy / len * o.offset) * scale, span = o.width * scale, thick = wall.thickness * scale;
    parts.push(`<g transform="translate(${x} ${y}) rotate(${angle})"><rect x="0" y="${-thick / 2 - 1}" width="${span}" height="${thick + 2}" fill="white"/>`);
    if (p.doors.includes(o))
      parts.push(`<path d="M0 0 L0 ${span} M0 ${span} A${span} ${span} 0 0 0 ${span} 0" fill="none" stroke="#8e7f68" stroke-width="1.4"/>`);
    else
      parts.push(`<rect x="0" y="${-thick / 2 + 2}" width="${span}" height="${thick - 4}" fill="#e6f2f3" stroke="#447b82" stroke-width="1.5"/><path d="M0 0 H${span}" stroke="#447b82" stroke-width="1"/>`);
    parts.push('</g>');
  }
  parts.push(`<text x="${ox}" y="${h - 48}" font-size="12" fill="#53675a">${p.plot.width * p.plot.length} m² · ${sample.beds} bedroom${sample.beds > 1 ? 's' : ''} · All dimensions in metres</text><text x="${ox}" y="${h - 27}" font-size="10" fill="#879387">For app testing and design visualization. Not a construction drawing.</text></g></svg>`);
  const svg = parts.join('');
  await fs.writeFile(path.join(destination, `${sample.id}.svg`), svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(destination, `${sample.id}.png`));
  await fs.writeFile(path.join(destination, `${sample.id}.json`), JSON.stringify(p, null, 2));
  console.log(`${sample.id}: ${p.plot.width} × ${p.plot.length} m, ${p.rooms.length} rooms`);
}
await fs.writeFile(path.join(destination, 'README.txt'), 'Blueprint3D sample floor plans\n\nstudio: 8 x 7 m, one bedroom\nfamily: 12 x 10 m, two bedrooms\nnarrow: 6 x 12 m, one bedroom\nvilla: 14 x 12 m, three bedrooms\n\nUse PNG for image-upload tests, SVG for printing, or JSON for exact editable geometry.\nOpen the app Sample plans page to create a 3D project instantly.\nImage analysis is approximate; add doors/windows manually and check scale.\nAll coordinates and dimensions in the JSON are stored in metres.\nOriginal test layouts, not construction drawings.\n');
