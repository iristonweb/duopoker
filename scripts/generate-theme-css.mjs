#!/usr/bin/env node
/**
 * Generates CSS custom properties from packages/shared-types/src/theme.ts
 * Run: node scripts/generate-theme-css.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { colors, radii, shadows, zIndex } from '../packages/shared-types/src/theme.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'apps/web/src/theme-vars.generated.css');

const toKebab = (s) =>
  s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase();

const lines = [
  '/* AUTO-GENERATED — do not edit. Run: node scripts/generate-theme-css.mjs */',
  ':root {'
];

for (const [key, value] of Object.entries(colors)) {
  lines.push(`  --color-${toKebab(key)}: ${value};`);
}
for (const [key, value] of Object.entries(radii)) {
  lines.push(`  --radius-${key}: ${value}px;`);
}
for (const [key, value] of Object.entries(shadows)) {
  lines.push(`  --shadow-${toKebab(key)}: ${value};`);
}
for (const [key, value] of Object.entries(zIndex)) {
  lines.push(`  --z-${toKebab(key)}: ${value};`);
}

lines.push('}');
lines.push('');

writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Wrote ${outPath}`);
