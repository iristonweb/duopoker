import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/** Load packages/db-schema/.env when DATABASE_URL is not already set. */
export const loadDbEnv = (opts = {}) => {
  const override = opts.override === true;
  if (process.env.DATABASE_URL && !override) return;
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const envPath = join(root, 'packages', 'db-schema', '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key] || override) process.env[key] = val;
  }
};
