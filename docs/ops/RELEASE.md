# Release process

## Pre-merge gate (CI)

- `pnpm lint && pnpm test`
- `prisma migrate deploy` on integration DB
- `node scripts/integrity-check.mjs` (nightly + optional pre-release)

## Deploy

1. Merge to `main` → Vercel production build
2. Verify `/api/health` and organizer checkout mock in staging first when risky

## Rollback

- Vercel: promote previous deployment
- Git: `git revert` + hotfix branch if schema-compatible
- Schema incompatible: forward migration only — do not revert SQL on prod

## Canary

- Use Vercel preview for feature branches; promote after E2E pass
