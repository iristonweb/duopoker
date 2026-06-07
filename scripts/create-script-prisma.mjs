import { createRequire } from 'module';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadDbEnv } from './load-db-env.mjs';

loadDbEnv();

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const clientDir = join(root, 'packages/db-schema/src/generated/prisma-client');
const hasNativeEngine = existsSync(join(clientDir, 'query_engine-windows.dll.node'));

/** Prisma for maintenance scripts. Uses native engine when present, else pg driver adapter. */
export const createScriptPrisma = async () => {
  if (hasNativeEngine || process.platform !== 'win32') {
    const { PrismaClient } = await import('@duopoker/db-schema');
    const prisma = new PrismaClient();
    return { prisma, pool: null };
  }

  const { PrismaClient } = require(join(clientDir, 'wasm.js'));
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { Pool } = require('pg');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (packages/db-schema/.env or env)');
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  return { prisma, pool };
};

export const closeScriptPrisma = async ({ prisma, pool }) => {
  await prisma.$disconnect();
  if (pool) await pool.end();
};
