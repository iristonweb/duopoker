/**
 * Normalize AI card backs to portrait poker ratio.
 * 1. Trim black/checkerboard padding
 * 2. Center-crop to 2.5:3.5
 * 3. Resize to 500×700 for web performance
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backsDir = path.join(root, 'apps/web/public/assets/cosmetics/backs');
const sourcesDir = path.join(backsDir, '_sources');

const CARD_W = 500;
const CARD_H = 700;
const CARD_RATIO = CARD_W / CARD_H;

const decks = [
  'deck_classic',
  'deck_bronze',
  'deck_silver',
  'deck_gold',
  'deck_platinum',
  'deck_diamond',
  'deck_black'
];

fs.mkdirSync(sourcesDir, { recursive: true });

for (const id of decks) {
  const sourceInRepo = path.join(backsDir, `${id}.png`);
  const sourceArchive = path.join(sourcesDir, `${id}.png`);

  if (!fs.existsSync(sourceArchive) && fs.existsSync(sourceInRepo)) {
    const meta = await sharp(sourceInRepo).metadata();
    if ((meta.width ?? 0) >= 1200) {
      fs.copyFileSync(sourceInRepo, sourceArchive);
      console.log(`archived source ${id} ${meta.width}x${meta.height}`);
    }
  }

  const src = fs.existsSync(sourceArchive) ? sourceArchive : sourceInRepo;
  if (!fs.existsSync(src)) {
    console.warn(`skip missing ${id}`);
    continue;
  }

  let pipeline = sharp(src);

  const trimmed = await pipeline.clone().trim({ threshold: 18 }).toBuffer();
  let meta = await sharp(trimmed).metadata();
  let work = trimmed;

  const w = meta.width ?? 1;
  const h = meta.height ?? 1;
  const currentRatio = w / h;

  if (currentRatio > CARD_RATIO * 1.05) {
    const cropW = Math.round(h * CARD_RATIO);
    const left = Math.max(0, Math.round((w - cropW) / 2));
    work = await sharp(trimmed).extract({ left, top: 0, width: cropW, height: h }).toBuffer();
    meta = await sharp(work).metadata();
    console.log(`${id}: landscape trim ${w}x${h} → center crop ${meta.width}x${meta.height}`);
  } else if (currentRatio < CARD_RATIO * 0.95) {
    const cropH = Math.round(w / CARD_RATIO);
    const top = Math.max(0, Math.round((h - cropH) / 2));
    work = await sharp(trimmed).extract({ left: 0, top, width: w, height: cropH }).toBuffer();
    meta = await sharp(work).metadata();
    console.log(`${id}: tall trim ${w}x${h} → center crop ${meta.width}x${meta.height}`);
  } else {
    console.log(`${id}: trim ${w}x${h} (ratio ok)`);
  }

  const outBuf = await sharp(work)
    .resize(CARD_W, CARD_H, { fit: 'fill' })
    .png({ compressionLevel: 9, quality: 92 })
    .toBuffer();

  const outMain = path.join(backsDir, `${id}.png`);
  const outGame = path.join(backsDir, `${id}_game.png`);
  await sharp(outBuf).toFile(outMain);
  await sharp(outBuf).toFile(outGame);
  console.log(`${id}: → ${CARD_W}x${CARD_H}`);
}

console.log('[crop-deck-backs] done');
