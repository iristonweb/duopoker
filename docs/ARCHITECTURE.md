# DuoPoker architecture

## Monorepo layout

- `apps/web` — React + Vite + Tailwind + R3F lobby and table UI.
- `packages/api` — Hono serverless API (Vercel `api/[[...path]].ts`), Prisma → PostgreSQL, stateless game sessions.
- `apps/backend` — **Legacy** Express + Socket.IO stack for local Docker dev (not used on Vercel).
- `apps/mobile` — Expo shell.
- `packages/game-engine` — Hold'em / Raspisnoy rules, hand evaluation, table state machine, side pots, per-viewer state sanitization. See [RASPISNOY.md](./RASPISNOY.md).
- `packages/shared-types` — Shared TS types (sessions, cards, theme tokens).
- `packages/ui-kit` — Glass-morphism UI primitives.
- `packages/db-schema` — Prisma schema and migrations.

## Data flow (Vercel / serverless)

1. Clients authenticate via `/auth/register`, `/auth/login` (JWT + `device_sessions` in Postgres).
2. Matchmaking: `POST /game/queue` writes a row to `matchmaking_tickets`; when two players share mode + buy-in, a session id is returned.
3. `POST /game/join` adds the player and may call `startNewHand` when two or more players are seated.
4. `POST /game/action` drives `applyTableAction` in `game-engine`. State is persisted to `game_sessions.gameState`.
5. Clients poll `GET /game/session/:id?userId=` every ~1.5s on the table page (no WebSockets on standard Vercel).
6. Chip economy and cosmetics use `/monetization/*`. Stripe Checkout + webhook applies subscriptions or chip packs.
7. Club organizers use `/clubs/*` for private clubs/tables with plan-based limits (play-money only).

## Scaling notes

- Game state is **Postgres-authoritative** — safe for multi-instance serverless (read-modify-write per action).
- Matchmaking uses the `matchmaking_tickets` table instead of in-memory queues.
- Optional: add Upstash Redis later for rate limits or pub/sub if sub-second latency is required.

## Compliance posture

- DuoPoker is implemented as a social play-money platform with paid organizer SaaS features.
- Backend does not expose payout/cashout/p2p transfer APIs.
- Club actions create `compliance_events` entries for moderation and audit.
