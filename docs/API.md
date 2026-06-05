# HTTP API (backend)

Base URL: `http://localhost:4000` (set `PUBLIC_WEB_URL`, `VITE_API_URL`, and `CORS_ORIGIN` in deployments — see [DEPLOY.md](./DEPLOY.md)).

## Auth

| Method | Path | Body | Notes |
|--------|------|------|------|
| POST | `/auth/register` | `{ email, password, password min 8, displayName }` | bcrypt hash |
| POST | `/auth/login` | `{ email, password }` | returns tokens |
| POST | `/auth/refresh` | `{ refreshToken }` | |
| POST | `/auth/logout` | `{ refreshToken }` | |
| GET | `/auth/me` | `Authorization: Bearer …` | includes `nickname` |

## Users (`Authorization` required)

| GET | `/users/lookup?nickname=foo` | Resolve `@nickname` → user profile |

## Profile (`Authorization` required for PUT)

| GET | `/profile/me/nickname` | Current nickname |
| PUT | `/profile/me/nickname` | `{ nickname }` — 3–20 chars, lowercase |
| GET | `/profile/:id` | Public read |
| PUT | `/profile/:id` | Must match JWT user id |

## Monetization

| GET | `/monetization/catalog` | Public — subscriptions, chip packs, cosmetics, organizer plans (RUB) |
| POST | `/monetization/checkout-session` | Stripe Checkout URL (player subs) |
| POST | `/monetization/yookassa/webhook` | YooKassa payment events (club plans) |
| POST | `/monetization/shop/cosmetic` | `{ itemId }` | Chips → `user_inventory` |
| POST | `/monetization/bonus` | Daily bonus (guarded) |
| POST | `/monetization/purchase` | Trusted purchase log (prefer webhooks in prod) |

## Private clubs

| Method | Path | Body | Notes |
|--------|------|------|------|
| GET | `/clubs/plans` | - | Organizer plans (RUB) + disclaimer |
| GET | `/clubs/invite/:inviteCode` | - | Public table preview |
| POST | `/clubs/invite/:inviteCode/accept` | - | Accept invite (auth) |
| POST | `/clubs` | `{ name, description?, visibility }` | Creates club + BASIC plan |
| GET | `/clubs/mine` | - | My clubs |
| GET | `/clubs/:clubId` | - | Dashboard data + members |
| POST | `/clubs/:clubId/checkout` | `{ tier: PRO \| NETWORK }` | YooKassa redirect URL |
| POST | `/clubs/:clubId/members` | `{ userId? \| nickname?, role }` | Admin only |
| POST | `/clubs/:clubId/private-tables` | `{ name, mode, maxPlayers, virtualBuyIn }` | Admin only |
| GET | `/clubs/:clubId/private-tables` | - | Member |
| GET | `/clubs/:clubId/private-tables/:tableId` | - | Member |
| POST | `/clubs/:clubId/private-tables/:tableId/invite` | `{ userId? \| nickname? }` | Admin |
| POST | `/clubs/:clubId/private-tables/:tableId/accept` | - | Accept table invite |
| POST | `/clubs/:clubId/private-tables/:tableId/start` | - | Creates `sessionId`, LIVE |
| POST | `/clubs/:clubId/private-tables/:tableId/join` | - | Join live table |
| POST | `/clubs/:clubId/private-tables/:tableId/close` | - | Admin |

## Game (REST, auth required)

| GET | `/game/session/:sessionId/players` | Nicknames for seated players |

## Stripe webhook

`POST /monetization/stripe/webhook` — **raw body**, `stripe-signature` header. Configure `STRIPE_WEBHOOK_SECRET`.

## Socket.IO

- `queueMatchmaking` `{ userId, mode, buyIn }`
- `joinSession` `{ sessionId, userId, mode, buyIn }` — prefers JWT user when `auth.token` set
- `playerAction` — validated action; user id from JWT if present
- `reconnectSession` `{ sessionId }` — restores snapshot from memory or Postgres
- `readyNextHand` `{ sessionId }` after `street === COMPLETE`
- `voiceSignal` — WebRTC SDP/ICE relay within table room

## Compliance constraints (non-gambling baseline)

- Virtual chips are non-withdrawable and non-convertible.
- No rake, no payout endpoints, no cashout endpoints, no player-to-player money transfer endpoints.
- Paid features map to organizer SaaS tooling (club/table operations), not to game outcomes.
