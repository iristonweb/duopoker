/**
 * Restore true RGBA transparency on chip / frame / title *_game.png assets.
 * 1. Flood-fill white/checkerboard matte from edges (+ frame interior)
 * 2. Defringe near-white halos
 * 3. Trim, pad to square, resize — export as non-palette PNG (avoids white matte in browsers)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cosmeticsDir = path.join(root, 'apps/web/public/assets/cosmetics');

const EXPORT_SIZE = 512;

const isMatteBackground = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min <= 30 && max >= 132;
};

const similarBackground = (r1, g1, b1, r2, g2, b2) =>
  Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2) <= 48;

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
    data[idx * channels + 3] = 0;
    const o = idx * channels;
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
  const seeds = [cy * width + cx];
  for (let a = 0; a < 360; a += 12) {
    const rad = (a * Math.PI) / 180;
    const x = Math.round(cx + Math.cos(rad) * radius);
    const y = Math.round(cy + Math.sin(rad) * radius);
    if (x >= 0 && y >= 0 && x < width && y < height) seeds.push(y * width + x);
  }
  floodFromSeeds(data, width, height, channels, seeds);
};

const defringeNearWhite = (data, channels) => {
  for (let i = 0; i < data.length; i += channels) {
    const a = data[i + 3];
    if (a < 8) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const chroma = max - Math.min(r, g, b);
    if (chroma > 38) continue;
    if (max >= 200) {
      const keep = Math.max(0, 1 - (max - 175) / 80);
      data[i + 3] = Math.round(a * keep * keep);
    }
  }
};

const processFile = async (filePath, kind) => {
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
  if (kind === 'frames') removeFrameInterior(out, width, height, channels);
  defringeNearWhite(out, channels);

  const transparentBg = { r: 0, g: 0, b: 0, alpha: 0 };
  const rgbaPng = await sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();

  let working = rgbaPng;
  try {
    working = await sharp(rgbaPng).trim({ threshold: 8 }).png().toBuffer();
  } catch {
    /* keep full canvas */
  }

  const tMeta = await sharp(working).metadata();
  const tw = tMeta.width ?? width;
  const th = tMeta.height ?? height;

  let exporter = sharp(working);
  if (kind === 'titles') {
    exporter = exporter.resize(480, 140, { fit: 'inside', background: transparentBg });
  } else {
    const side = Math.max(tw, th);
    const padTop = Math.floor((side - th) / 2);
    const padLeft = Math.floor((side - tw) / 2);
    exporter = exporter
      .extend({
        top: padTop,
        bottom: side - th - padTop,
        left: padLeft,
        right: side - tw - padLeft,
        background: transparentBg
      })
      .resize(EXPORT_SIZE, EXPORT_SIZE, { fit: 'contain', background: transparentBg });
  }

  await exporter.png({ compressionLevel: 9, palette: false, effort: 10 }).toFile(filePath);

  const meta = await sharp(filePath).metadata();
  console.log(
    `${path.relative(cosmeticsDir, filePath)} → ${meta.width}x${meta.height} alpha=${meta.hasAlpha} palette=${meta.isPalette ?? false}`
  );
};

for (const slot of ['chips', 'frames', 'titles']) {
  const dir = path.join(cosmeticsDir, slot);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('_game.png')).sort()) {
    await processFile(path.join(dir, f), slot);
  }
}

console.log('[fix-game-asset-alpha] done');
