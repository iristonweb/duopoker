/**
 * Mark existing migrations as applied when DB was created via db:push (P3005).
 * Run once, then: pnpm db:migrate
 */
import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'prisma', 'migrations');
const skip = process.argv[2];

const all = readdirSync(migrationsDir)
  .filter((d) => d !== 'migration_lock.toml' && !d.startsWith('.'))
  .sort();

const toBaseline = skip ? all.filter((d) => d !== skip) : all.slice(0, -1);

for (const name of toBaseline) {
  console.log(`Marking applied: ${name}`);
  execSync(`npx prisma migrate resolve --applied ${name} --schema prisma/schema.prisma`, {
    cwd: join(__dirname, '..'),
    stdio: 'inherit'
  });
}

console.log('Done. Run: pnpm db:migrate');
