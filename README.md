# DuoPoker

Local-first monorepo for cross-platform poker platform with dual modes (Hold'em and Raspisnoy), realtime multiplayer and premium UI.

## Stack
- Web: React + Vite + R3F
- API (production): Hono serverless on Vercel (`packages/api`)
- Legacy local API: Express + Socket.IO (`apps/backend`)
- Data: PostgreSQL (required); Redis/Mongo optional for legacy stack

## Quick start (Vercel-style local dev)
1. Install dependencies: `pnpm install`
2. Postgres: `docker compose -f infra/docker-compose.yml up postgres -d`
3. Build schema: `pnpm --filter @duopoker/db-schema build`
4. API: `pnpm --filter @duopoker/api dev` (port 3001)
5. Web: `pnpm --filter @duopoker/web dev` (port 5173, proxies API)

See [docs/DEPLOY.md](docs/DEPLOY.md) for Vercel deployment.

## Compliance
- No real-money gambling.
- Virtual chips are non-withdrawable and non-convertible.
- Purchases are final.
- Private club payments unlock organizer SaaS features only (limits, moderation, scheduling), not game outcomes.
