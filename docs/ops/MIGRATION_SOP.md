# Database migration SOP

## Staging

1. `pnpm --filter @duopoker/db-schema exec prisma migrate deploy`
2. Run `node scripts/integrity-check.mjs`
3. Smoke-test `/api/health` and club checkout mock

## Production (Vercel + Neon)

- Migrations run in `vercel.json` build via `prisma migrate deploy`
- Never edit applied migration SQL; add a new migration instead
- For breaking changes: announce maintenance, deploy off-peak MSK

## Rollback

- Prisma has no automatic down migrations — restore Neon PITR (see `BACKUP_RESTORE.md`) or forward-fix with a new migration
