# HTTP API

DuoPoker has two HTTP surfaces:

| Surface | Base URL | Role |
|---------|----------|------|
| **Production (Hono)** | `/api/*` on Vercel (`packages/api`) | Canonical REST: auth, game, clubs, monetization, admin, referrals, voice, coach |
| **Legacy realtime (Express)** | `http://localhost:4000` (`apps/backend`) | Socket.IO + subset of REST for local / Mode B |

Clients on Vercel use **Hono** paths below (prefix `/api`). Local Hono: `http://localhost:3001/api`.

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [DEPLOY.md](./DEPLOY.md).

## Auth (Hono)

| Method | Path | Body | Notes |
|--------|------|------|------|
| POST | `/api/auth/register` | `{ email, password, displayName }` | bcrypt hash |
| POST | `/api/auth/login` | `{ email, password }` | returns tokens |
| POST | `/api/auth/refresh` | `{ refreshToken }` | |
| POST | `/api/auth/logout` | `{ refreshToken }` | |
| GET | `/api/auth/me` | `Authorization: Bearer …` | profile, subscription, inventory |

## Profile (`Authorization` required)

| GET | `/api/profile/me/nickname` | Current nickname |
| PUT | `/api/profile/me` | `{ displayName?, avatar?, tableStatus? }` — avatar is data-URL only |
| PUT | `/api/profile/me/nickname` | `{ nickname }` |
| PUT | `/api/profile/me/cosmetics/equip` | `{ itemId }` |
| GET | `/api/profile/:id` | Public read (**no email**) |
| PUT | `/api/profile/:id` | Owner only |

## Monetization

| GET | `/api/monetization/catalog` | Public catalog |
| POST | `/api/monetization/subscription/checkout` | YooKassa player subscription (primary RUB) |
| POST | `/api/monetization/checkout-session` | Stripe Checkout (parallel) |
| POST | `/api/monetization/yookassa/webhook` | Verifies payment via YooKassa API before activate |
| POST | `/api/monetization/stripe/webhook` | Raw body + `stripe-signature` |
| POST | `/api/monetization/bonus` | Fixed daily bonus (server amount, idempotent) |
| POST | `/api/monetization/purchase` | Dev mock only (`allowDevMockCheckout`) |

## Game (REST, auth required) — Hono

| POST | `/api/game/queue` | Matchmaking ticket |
| POST | `/api/game/join` | Join assigned session |
| POST | `/api/game/action` | Player action |
| GET | `/api/game/session/:sessionId` | Poll session snapshot |
| … | chat, VIP invites, table invites | See `packages/api/src/routes/game.ts` |

Express exposes only `GET /game/session/:sessionId/players` for REST; full realtime is Socket.IO.

## Clubs, admin, referrals, coach, compliance, notifications

Mounted on **Hono only** (`packages/api/src/app.ts`): `/api/clubs/*`, `/api/admin/*`, `/api/referrals/*`, `/api/coach/*`, `/api/compliance/*`, `/api/notifications/*`.

## Socket.IO (Express `:4000`)

- `queueMatchmaking` `{ userId, mode, buyIn }`
- `joinSession` `{ sessionId, userId, mode, buyIn }` — JWT user preferred when `auth.token` set
- `playerAction` — validated; user id from JWT if present
- `reconnectSession` `{ sessionId }`
- `readyNextHand` `{ sessionId }` after `street === COMPLETE`
- `voiceSignal` — WebRTC SDP/ICE relay within table room

## Compliance

- Virtual chips are non-withdrawable and non-convertible.
- No rake, payout, cashout, or player-to-player money transfer endpoints.
- Paid features map to SaaS tooling / cosmetics / subscriptions, not game outcomes.
