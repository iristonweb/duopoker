/**
 * Remove studio black backdrop from DP CLUB logo PNG/JPEG and regenerate favicons.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logoDir = path.join(root, 'apps/web/public/assets/logo');
const publicDir = path.join(root, 'apps/web/public');
const logoPath = path.join(logoDir, 'dp-club-logo.png');
const sourcesDir = path.join(logoDir, '_sources');
const transparentBg = { r: 0, g: 0, b: 0, alpha: 0 };

const isDarkBackdrop = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min <= 28 && max <= 56;
};

const floodFromEdges = (data, width, height, channels, test) => {
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    const p = idx * channels;
    if (!test(data[p], data[p + 1], data[p + 2])) return;
    visited[idx] = 1;
    queue[tail++] = idx;
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  while (head < tail) {
    const idx = queue[head++];
    data[idx * channels + 3] = 0;
    const x = idx % width;
    const y = (idx - x) / width;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }
};

const erodeDarkHalos = (data, width, height, channels, passes = 4) => {
  const total = width * height;
  const alpha = new Uint8Array(total);
  for (let i = 0; i < total; i++) alpha[i] = data[i * channels + 3];

  for (let pass = 0; pass < passes; pass++) {
    const next = new Uint8Array(alpha);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (alpha[idx] < 16) continue;
        const p = idx * channels;
        if (!isDarkBackdrop(data[p], data[p + 1], data[p + 2])) continue;
        const touchesVoid =
          (x === 0 || alpha[idx - 1] < 16) ||
          (x === width - 1 || alpha[idx + 1] < 16) ||
          (y === 0 || alpha[idx - width] < 16) ||
          (y === height - 1 || alpha[idx + width] < 16);
        if (touchesVoid) next[idx] = 0;
      }
    }
    alpha.set(next);
  }

  for (let i = 0; i < total; i++) data[i * channels + 3] = alpha[i];
};

const processLogo = async () => {
  fs.mkdirSync(sourcesDir, { recursive: true });
  const archivePath = path.join(sourcesDir, 'dp-club-logo-original.jpg');
  if (!fs.existsSync(archivePath)) fs.copyFileSync(logoPath, archivePath);

  const { data, info } = await sharp(archivePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);

  floodFromEdges(out, width, height, channels, isDarkBackdrop);
  erodeDarkHalos(out, width, height, channels, 5);

  let working = await sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
  try {
    working = await sharp(working).trim({ threshold: 4 }).png().toBuffer();
  } catch {
    /* keep untrimmed */
  }

  const meta = await sharp(working).metadata();
  const tw = meta.width ?? width;
  const th = meta.height ?? height;
  const side = Math.max(tw, th);
  const padTop = Math.floor((side - th) / 2);
  const padLeft = Math.floor((side - tw) / 2);

  const square = await sharp(working)
    .extend({
      top: padTop,
      bottom: side - th - padTop,
      left: padLeft,
      right: side - tw - padLeft,
      background: transparentBg
    })
    .resize(1024, 1024, { fit: 'fill' })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();

  await sharp(square).toFile(logoPath);

  const favicon = await sharp(square)
    .resize(512, 512, { fit: 'contain', background: transparentBg })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await sharp(favicon).toFile(path.join(publicDir, 'favicon.png'));

  const appleTouch = await sharp(square)
    .resize(180, 180, { fit: 'contain', background: transparentBg })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await sharp(appleTouch).toFile(path.join(publicDir, 'apple-touch-icon.png'));

  const raw = await sharp(logoPath).ensureAlpha().raw().toBuffer();
  let trans = 0;
  for (let i = 3; i < raw.length; i += 4) if (raw[i] < 16) trans++;
  const pct = ((trans / (raw.length / 4)) * 100).toFixed(1);
  console.log(`dp-club-logo.png → 1024x1024, transparent=${pct}%`);
  console.log('favicon.png + apple-touch-icon.png regenerated');
};

await processLogo();
console.log('[process-logo-alpha] done');
