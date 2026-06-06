/**
 * Restore true PNG transparency on chip / frame / title *_game.png assets.
 * Uses edge-connected flood fill so light gold/silver foreground is preserved.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cosmeticsDir = path.join(root, 'apps/web/public/assets/cosmetics');

const isMatteBackground = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  return chroma <= 30 && max >= 132;
};

const similarBackground = (r1, g1, b1, r2, g2, b2) => {
  const dr = Math.abs(r1 - r2);
  const dg = Math.abs(g1 - g2);
  const db = Math.abs(b1 - b2);
  return dr + dg + db <= 48;
};

const floodFromSeeds = (data, width, height, channels, seeds) => {
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const read = (idx) => {
    const o = idx * channels;
    return [data[o], data[o + 1], data[o + 2]];
  };

  for (const idx of seeds) {
    if (idx < 0 || idx >= total || visited[idx]) continue;
    const [r, g, b] = read(idx);
    if (!isMatteBackground(r, g, b)) continue;
    visited[idx] = 1;
    queue[tail++] = idx;
  }

  while (head < tail) {
    const idx = queue[head++];
    const o = idx * channels;
    data[o + 3] = 0;

    const r0 = data[o];
    const g0 = data[o + 1];
    const b0 = data[o + 2];
    const x = idx % width;
    const y = (idx - x) / width;

    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1]
    ]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nIdx = ny * width + nx;
      if (visited[nIdx]) continue;
      const [r, g, b] = read(nIdx);
      if (!isMatteBackground(r, g, b)) continue;
      if (!similarBackground(r0, g0, b0, r, g, b)) continue;
      visited[nIdx] = 1;
      queue[tail++] = nIdx;
    }
  }
};

const removeEdgeBackground = (data, width, height, channels) => {
  const edgeSeeds = [];
  for (let x = 0; x < width; x++) {
    edgeSeeds.push(x, (height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    edgeSeeds.push(y * width, y * width + (width - 1));
  }
  floodFromSeeds(data, width, height, channels, edgeSeeds);
};

const removeFrameInterior = (data, width, height, channels) => {
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const radius = Math.floor(Math.min(width, height) * 0.22);
  const seeds = [];
  for (let a = 0; a < 360; a += 15) {
    const rad = (a * Math.PI) / 180;
    const x = Math.round(cx + Math.cos(rad) * radius);
    const y = Math.round(cy + Math.sin(rad) * radius);
    if (x >= 0 && y >= 0 && x < width && y < height) seeds.push(y * width + x);
  }
  seeds.push(cy * width + cx);
  floodFromSeeds(data, width, height, channels, seeds);
};

const processFile = async (filePath) => {
  const archiveDir = path.join(path.dirname(filePath), '_sources');
  fs.mkdirSync(archiveDir, { recursive: true });
  const base = path.basename(filePath);
  const archivePath = path.join(archiveDir, base);
  if (!fs.existsSync(archivePath)) {
    fs.copyFileSync(filePath, archivePath);
  }

  const { data, info } = await sharp(archivePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);

  removeEdgeBackground(out, width, height, channels);
  if (filePath.includes(`${path.sep}frames${path.sep}`)) {
    removeFrameInterior(out, width, height, channels);
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, quality: 95, effort: 10 })
    .toFile(filePath);

  const meta = await sharp(filePath).metadata();
  const check = await sharp(filePath).ensureAlpha().raw().toBuffer();
  let transparent = 0;
  let whiteOpaque = 0;
  for (let i = 0; i < check.length; i += 4) {
    if (check[i + 3] < 16) transparent++;
    else if (check[i] > 240 && check[i + 1] > 240 && check[i + 2] > 240) whiteOpaque++;
  }
  const px = width * height;
  console.log(
    `${path.relative(cosmeticsDir, filePath)} → alpha=${meta.hasAlpha} transparent=${((transparent / px) * 100).toFixed(1)}% white=${((whiteOpaque / px) * 100).toFixed(2)}%`
  );
};

const slots = ['chips', 'frames', 'titles'];

for (const slot of slots) {
  const dir = path.join(cosmeticsDir, slot);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('_game.png')).sort()) {
    await processFile(path.join(dir, f));
  }
}

console.log('[fix-game-asset-alpha] done');
