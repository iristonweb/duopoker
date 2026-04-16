# Deploying DuoPoker

The web shell (Vite) and the realtime API (Express + Socket.IO) are separate processes. Static hosting (for example Vercel) only serves the frontend; the backend must run on a long‑lived host with WebSocket support.

## Local stack with Docker

From the repository root:

```bash
docker compose -f infra/docker-compose.yml up --build
```

This starts PostgreSQL, Redis, MongoDB, and the API on port **4000**.

Apply Prisma migrations before the first request (run on your machine with `DATABASE_URL` pointing at the Docker Postgres port **5433** on the host, or exec into a tooling container):

```bash
set DATABASE_URL=postgresql://duopoker:duopoker@localhost:5433/duopoker
pnpm --filter @duopoker/db-schema exec prisma migrate deploy --schema=packages/db-schema/prisma/schema.prisma
```

Run the web app:

```bash
pnpm --filter @duopoker/web dev
```

Set in `apps/web/.env` (or export):

- `VITE_API_URL=http://localhost:4000`

## Vercel (frontend)

In the Vercel project, add a **build** environment variable (used at compile time):

- `VITE_API_URL` — full HTTPS origin of your deployed API, for example `https://api.example.com`

Redeploy after changing this value. The file [vercel.json](../vercel.json) builds `@duopoker/web` only.

## Backend (production checklist)

Required environment variables (see also [apps/backend/.env.example](../apps/backend/.env.example)):

| Variable | Purpose |
|----------|---------|
| `PORT` | HTTP port (default 4000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis for sessions / pubsub |
| `MONGO_URL` | MongoDB for replays / analytics |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Strong random strings |
| `PUBLIC_WEB_URL` | Frontend URL for Stripe redirects |
| `CORS_ORIGIN` | Comma-separated allowed browser origins |

Optional:

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Payments |
| `STRIPE_PRICE_SILVER` … `STRIPE_PRICE_ROYAL` | Price IDs for catalog + checkout |
| `SENTRY_DSN_BACKEND` | Backend error tracking (integrate in your deployment) |
| `VITE_SENTRY_DSN` | Frontend Sentry (set on Vercel for web build) |

## Observability

- Frontend: set `VITE_SENTRY_DSN` (optional `VITE_SENTRY_TRACES_SAMPLE_RATE`) for [Sentry](https://sentry.io/) initialization in `apps/web/src/main.tsx`.
- Backend: expose `/metrics` (Prometheus text) and `/health`; wire Grafana using [infra/docker-compose.yml](../infra/docker-compose.yml) as a pattern.
