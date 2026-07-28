# DuoPoker architecture

## Monorepo layout

- `apps/web` — React + Vite + Tailwind + R3F lobby and table UI.
- `apps/mobile` — Expo companion (auth, lobby, table, shop, invites).
- `apps/backend` — **Legacy** Express + Socket.IO stack for local Docker / Mode B realtime.
- `packages/api` — Hono serverless API (Vercel), Prisma → PostgreSQL, polling game sessions.
- `packages/game-engine` — Hold'em / Joker rules, hand evaluation, table state machine. See [JOKER.md](./JOKER.md).
- `packages/shared-types` — Shared TS types, theme, joker schedule, pricing.
- `packages/table-client` — Shared table store/hooks for web + mobile.
- `packages/server-core` / `session-core` / `server-shared` — Shared server helpers (oauth, session, crypto, LiveKit).
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
- Optional: Upstash Redis (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) for distributed rate limits; falls back to process-local Map.

## Compliance posture

- DuoPoker is implemented as a social play-money platform with paid organizer SaaS features.
- Backend does not expose payout/cashout/p2p transfer APIs.
- Club actions create `compliance_events` entries for moderation and audit.

## Dual API stacks — when to use which

| Concern | `packages/api` (Vercel) | `apps/backend` (Render / Docker) |
|--------|-------------------------|-----------------------------------|
| Transport | REST polling (~1.5s) | Socket.IO realtime + minimal REST |
| Matchmaking | Postgres `matchmaking_tickets` | In-memory queue |
| Game state | DB read-modify-write per action | In-memory cache + async Postgres snapshot |
| Voice | LiveKit token via REST | LiveKit + socket `voiceSignal` |
| VIP invites | Yes | No |
| Referrals / admin | Yes | Partial / no admin routes |
| Local dev | `pnpm dev:vercel` | `docker compose` or `pnpm --filter @duopoker/backend dev` |

**Production (Vercel):** `apps/web` → `packages/api` → `packages/game-engine` → Postgres.

**Local realtime / E2E:** `apps/web` with `VITE_API_PROXY=http://localhost:4000` → `apps/backend` Socket.IO.

Both stacks share `@duopoker/game-engine` rules and `@duopoker/shared-types` joker schedule/legality. Persisted `gameState` JSON is validated via `parseLoadedSessionState` (Zod) on load.
