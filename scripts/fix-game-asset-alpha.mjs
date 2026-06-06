/**
 * Safe transparency for chip / frame / title *_game.png assets.
 * Preserves full chip/frame artwork — removes only studio backdrop.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cosmeticsDir = path.join(root, 'apps/web/public/assets/cosmetics');
const transparentBg = { r: 0, g: 0, b: 0, alpha: 0 };

const isLightMatte = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min <= 36 && max >= 115;
};

const isDarkBackdrop = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min <= 22 && max <= 48;
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

const removeExteriorBackdrop = (data, width, height, channels) => {
  const cx = width / 2;
  const cy = height / 2;
  let maxR = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * channels;
      if (data[p + 3] < 16) continue;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      if (isLightMatte(r, g, b) || isDarkBackdrop(r, g, b)) continue;
      maxR = Math.max(maxR, Math.hypot(x - cx, y - cy));
    }
  }

  if (maxR < 8) return;
  const cutoff = maxR * 1.04;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.hypot(x - cx, y - cy) > cutoff) {
        data[(y * width + x) * channels + 3] = 0;
      }
    }
  }
};

const floodLightFromEdges = (data, width, height, channels) =>
  floodFromEdges(data, width, height, channels, isLightMatte);

const floodDarkFromEdges = (data, width, height, channels) =>
  floodFromEdges(data, width, height, channels, isDarkBackdrop);

const erodeLightHalos = (data, width, height, channels, passes = 6) => {
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
        if (!isLightMatte(data[p], data[p + 1], data[p + 2])) continue;
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

const floodFrameInterior = (data, width, height, channels) => {
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const isInteriorBg = (r, g, b) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const c = max - min;
    if (isLightMatte(r, g, b)) return true;
    return c <= 22 && max <= 52;
  };

  const push = (idx) => {
    if (idx < 0 || idx >= total || visited[idx]) return;
    const p = idx * channels;
    if (!isInteriorBg(data[p], data[p + 1], data[p + 2])) return;
    visited[idx] = 1;
    queue[tail++] = idx;
  };

  push(cy * width + cx);
  const r0 = Math.floor(Math.min(width, height) * 0.2);
  for (let a = 0; a < 360; a += 15) {
    const rad = (a * Math.PI) / 180;
    push((Math.round(cy + Math.sin(rad) * r0)) * width + Math.round(cx + Math.cos(rad) * r0));
  }

  while (head < tail) {
    const idx = queue[head++];
    data[idx * channels + 3] = 0;
    push(idx - 1);
    push(idx + 1);
    push(idx - width);
    push(idx + width);
  }
};

const processFile = async (filePath, kind) => {
  const archiveDir = path.join(path.dirname(filePath), '_sources');
  fs.mkdirSync(archiveDir, { recursive: true });
  const base = path.basename(filePath);
  const archivePath = path.join(archiveDir, base);
  if (!fs.existsSync(archivePath)) fs.copyFileSync(filePath, archivePath);

  const { data, info } = await sharp(archivePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);

  floodLightFromEdges(out, width, height, channels);
  erodeLightHalos(out, width, height, channels);
  if (kind === 'frames') {
    floodDarkFromEdges(out, width, height, channels);
    floodFrameInterior(out, width, height, channels);
  }

  const rgbaPng = await sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
  let working = rgbaPng;
  try {
    working = await sharp(rgbaPng).trim({ threshold: 2 }).png().toBuffer();
  } catch {
    working = rgbaPng;
  }

  {
    const trimmed = await sharp(working).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const trimmedOut = Buffer.from(trimmed.data);
    if (kind === 'chips') removeExteriorBackdrop(trimmedOut, trimmed.info.width, trimmed.info.height, trimmed.info.channels);
    if (kind === 'titles') {
      floodDarkFromEdges(trimmedOut, trimmed.info.width, trimmed.info.height, trimmed.info.channels);
      erodeLightHalos(trimmedOut, trimmed.info.width, trimmed.info.height, trimmed.info.channels);
    }
    working = await sharp(trimmedOut, {
      raw: { width: trimmed.info.width, height: trimmed.info.height, channels: 4 }
    })
      .png()
      .toBuffer();
  }

  const meta = await sharp(working).metadata();
  const tw = meta.width ?? width;
  const th = meta.height ?? height;

  let pipeline = sharp(working);
  if (kind === 'titles') {
    pipeline = pipeline.resize(480, 140, { fit: 'inside', background: transparentBg });
  } else {
    const side = Math.max(tw, th);
    const padTop = Math.floor((side - th) / 2);
    const padLeft = Math.floor((side - tw) / 2);
    pipeline = pipeline
      .extend({
        top: padTop,
        bottom: side - th - padTop,
        left: padLeft,
        right: side - tw - padLeft,
        background: transparentBg
      })
      .resize(512, 512, { fit: 'contain', background: transparentBg });
  }

  await pipeline.png({ compressionLevel: 9, palette: false, effort: 10 }).toFile(filePath);

  const fm = await sharp(filePath).metadata();
  const raw = await sharp(filePath).ensureAlpha().raw().toBuffer();
  let trans = 0;
  for (let i = 3; i < raw.length; i += 4) if (raw[i] < 16) trans++;
  console.log(`${path.relative(cosmeticsDir, filePath)} → ${fm.width}x${fm.height} trans=${((trans / (raw.length / 4)) * 100).toFixed(0)}%`);
};

for (const slot of ['chips', 'frames', 'titles']) {
  const dir = path.join(cosmeticsDir, slot);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('_game.png')).sort()) {
    await processFile(path.join(dir, f), slot);
  }
}

console.log('[fix-game-asset-alpha] done');
