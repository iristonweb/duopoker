# DuoPoker

Local-first monorepo for cross-platform poker platform with dual modes (Hold'em and Joker), realtime multiplayer and premium UI.

## Stack
- Web: React + Vite + R3F
- API (production): Hono serverless on Vercel (`packages/api`)
- Legacy local API: Express + Socket.IO (`apps/backend`)
- Data: PostgreSQL (required); Redis/Mongo optional for legacy stack

## Quick start (Vercel-style local dev)
**Node.js 24.x** (same as CI). Recommended: [fnm](https://github.com/Schniz/fnm) — repo includes [`.nvmrc`](.nvmrc); run `fnm install && fnm use`.

1. Install dependencies: `pnpm install`
2. Postgres: `docker compose -f infra/docker-compose.yml up postgres -d`
3. Build schema: `pnpm --filter @duopoker/db-schema build` then `pnpm db:push`
4. API: `pnpm --filter @duopoker/api dev` (port **3001**)
5. Web: `pnpm --filter @duopoker/web dev` (port **5180**) — **do not set** `VITE_API_URL`; Vite proxies `/api` → `:3001`

For **full Socket.IO + voice** locally, use `pnpm --filter @duopoker/backend dev` (:4000) and set `VITE_API_URL=http://localhost:4000` in `apps/web/.env`.

Seed platform superadmin (password only via env, never commit):

```powershell
$env:ADMIN_EMAIL="you@example.com"
$env:ADMIN_PASSWORD="your-secure-password"
pnpm --filter @duopoker/db-schema seed
```

## Environment variables

| File | Назначение |
|------|------------|
| [`.env.vercel.example`](.env.vercel.example) | Шаблон для **Vercel** (без секретов, в git) |
| [`.env.vercel.local`](.env.vercel.local) | Готовый файл для **Import** в Vercel (gitignore, только у тебя локально) |
| [`apps/backend/.env.example`](apps/backend/.env.example) | Локальный Express / Render |
| [`apps/web/.env.example`](apps/web/.env.example) | Локальный Vite |
| [`packages/db-schema/.env.example`](packages/db-schema/.env.example) | `pnpm db:push` |

Vercel: **не задавай** `VITE_API_URL`. Import `.env.vercel.local` → Redeploy.

See [docs/DEPLOY.md](docs/DEPLOY.md).

Push notifications: [docs/PUSH_SETUP.md](docs/PUSH_SETUP.md).

## Compliance
- No real-money gambling.
- Virtual chips are non-withdrawable and non-convertible.
- Purchases are final.
- Private club payments unlock organizer SaaS features only (limits, moderation, scheduling), not game outcomes.
