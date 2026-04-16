# DuoPoker architecture

## Monorepo layout

- `apps/web` — React + Vite + Tailwind + R3F lobby and table preview.
- `apps/backend` — Express HTTP API, Socket.IO realtime, Prisma → PostgreSQL, Redis sessions, MongoDB analytics/replays.
- `apps/mobile` — Expo shell + socket client.
- `packages/game-engine` — Hold’em / Raspisnoy rules, hand evaluation, table state machine.
- `packages/shared-types` — Shared TS types (sessions, cards, theme tokens).
- `packages/ui-kit` — Glass-morphism UI primitives.
- `packages/db-schema` — Prisma schema and migrations.

## Data flow

1. Clients authenticate via `/auth/register`, `/auth/login`, or `/oauth/google` (ID token).
2. JWT access token is sent on Socket.IO `auth.token` (optional). Fallback guest IDs are still accepted for development.
3. Matchmaking queues users in-memory; when enough players share mode + buy-in, a session id is broadcast.
4. `joinSession` adds the player and may call `startNewHand` when two or more players are seated.
5. `playerAction` drives `applyTableAction` in `game-engine`. Resulting `SessionState` is broadcast and persisted to PostgreSQL (`game_sessions.gameState`) for reconnect.
6. Chip economy and cosmetics use `/monetization/*`. Stripe Checkout + webhook applies subscriptions (`subscriptions` table) or chip packs / inventory.

## Scaling notes

- In-memory `sessions` map is authoritative during a running process; Redis Pub/Sub is used for matchmaking fan-out. For multi-node, persist snapshots (already JSON) and optionally load from Redis.
- Rate limiting applies per HTTP route and per socket user for actions.
