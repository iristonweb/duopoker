# Deploying DuoPoker

The web shell (Vite) and the realtime API (Express + Socket.IO) are separate processes. Static hosting (for example Vercel) only serves the frontend; the backend must run on a long‑lived host with WebSocket support.

## Local stack with Docker

From the repository root:

```bash
docker compose -f infra/docker-compose.yml up --build
```

This starts PostgreSQL, Redis, MongoDB, and the API on port **4000**. The API will **still start** if MongoDB is unreachable (replays and Mongo-backed logs are skipped); PostgreSQL and Redis are required for auth and matchmaking.

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

- `VITE_API_URL=http://localhost:4000` — must match the origin where the API listens (including `http://127.0.0.1:4000` vs `localhost` if you mix hosts; prefer consistency with `CORS_ORIGIN` on the backend).

### Solo queue and subscriptions (local dev)

- `ALLOW_SOLO_QUEUE=true` — one player in matchmaking is paired with a server bot so you can open a table without a second browser. The compose file sets this for the `backend` service.
- **Stripe test mode**: create products/prices in the [Stripe test dashboard](https://dashboard.stripe.com/test/apikeys), set `STRIPE_SECRET_KEY` to your **sk_test_…** key, and set `STRIPE_PRICE_SILVER`, `STRIPE_PRICE_GOLD`, etc. to each price’s ID (`price_…`).
- **Without Stripe**: set `MOCK_CHECKOUT=true` on the backend. `POST /monetization/checkout-session` then redirects to `/lobby?checkout=mock&success=1` instead of calling Stripe (still requires a signed-in user).

## Vercel (frontend)

In the Vercel project, add a **build** environment variable (used at compile time):

- **`VITE_API_URL`** — full HTTPS origin of your deployed API (for example `https://duopoker-api.onrender.com`). **Never leave this empty:** an empty string makes the browser call `/auth/register` on `*.vercel.app`, which has no API and returns **404** for registration, Socket.IO, and `/monetization/*`.

After adding or changing it, trigger a **new deployment** (Vite inlines env at build time).

On the backend, add your Vercel site origin to **`CORS_ORIGIN`** (for example `https://duopoker.vercel.app`) so browsers are allowed to call the API.

The file [vercel.json](../vercel.json) builds `@duopoker/web` only; the Express server must run elsewhere (Render, Fly.io, Railway, a VPS, etc.).

## Backend (production checklist)

Required environment variables (see also [apps/backend/.env.example](../apps/backend/.env.example)):

| Variable | Purpose |
|----------|---------|
| `PORT` | HTTP port (default 4000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis for sessions / pubsub |
| `MONGO_URL` | MongoDB for replays / analytics (API starts without it; features degrade) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Strong random strings |
| `PUBLIC_WEB_URL` | Frontend URL for Stripe redirects |
| `CORS_ORIGIN` | Comma-separated allowed browser origins |

Optional:

| Variable | Purpose |
|----------|---------|
| `ALLOW_SOLO_QUEUE` | `true` = matchmaking can create human+bot tables |
| `MOCK_CHECKOUT` | `true` = fake checkout redirect without `STRIPE_SECRET_KEY` |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Payments |
| `STRIPE_PRICE_SILVER` … `STRIPE_PRICE_ROYAL` | Price IDs for catalog + checkout |
| `SENTRY_DSN_BACKEND` | Backend error tracking (integrate in your deployment) |
| `VITE_SENTRY_DSN` | Frontend Sentry (set on Vercel for web build) |

## Observability

- Frontend: set `VITE_SENTRY_DSN` (optional `VITE_SENTRY_TRACES_SAMPLE_RATE`) for [Sentry](https://sentry.io/) initialization in `apps/web/src/main.tsx`.
- Backend: `/health` includes `mongo: "up" | "down"` next to `status: "ok"`; expose `/metrics` (Prometheus text); wire Grafana using [infra/docker-compose.yml](../infra/docker-compose.yml) as a pattern.
