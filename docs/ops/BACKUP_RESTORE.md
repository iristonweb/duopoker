# Backup and restore (Neon)

## Backups

- Neon continuous PITR on production branch
- Export schema weekly: `prisma migrate diff`

## Restore drill (staging)

1. Neon Console → Branches → Restore to timestamp
2. Point staging `DATABASE_URL` to restored branch
3. `prisma migrate deploy` + smoke tests
4. Document RTO/RPO in incident log

## Production restore

- Create new branch from PITR, validate, swap connection string in Vercel env, redeploy
