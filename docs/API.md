# HTTP API (backend)

Base URL: `http://localhost:4000` (set `PUBLIC_WEB_URL`, `VITE_API_URL`, and `CORS_ORIGIN` in deployments — see [DEPLOY.md](./DEPLOY.md)).

## Auth

| Method | Path | Body | Notes |
|--------|------|------|------|
| POST | `/auth/register` | `{ email, password, password min 8, displayName }` | bcrypt hash |
| POST | `/auth/login` | `{ email, password }` | returns tokens |
| POST | `/auth/refresh` | `{ refreshToken }` | |
| POST | `/auth/logout` | `{ refreshToken }` | |
| GET | `/auth/me` | `Authorization: Bearer …` | |

## OAuth

| POST | `/oauth/google` | `{ idToken }` | Requires `GOOGLE_CLIENT_ID` |
| GET | `/oauth/google/status` | | |
| POST | `/oauth/apple` | | Returns 501 (JWKS validation TBD) |

## Profile (`Authorization` required for PUT)

| GET | `/profile/:id` | Public read |
| PUT | `/profile/:id` | Must match JWT user id |

## Monetization

| GET | `/monetization/catalog` | Public — subscriptions, chip packs, cosmetics |
| POST | `/monetization/checkout-session` | `{ priceId, mode: subscription \| payment, itemId? }` Stripe Checkout URL |
| POST | `/monetization/shop/cosmetic` | `{ itemId }` | Chips → `user_inventory` |
| POST | `/monetization/bonus` | Daily bonus (guarded) |
| POST | `/monetization/purchase` | Trusted purchase log (prefer Stripe webhook in prod) |

## Private clubs (`Authorization` required except plans)

| Method | Path | Body | Notes |
|--------|------|------|------|
| GET | `/clubs/plans` | - | Organizer plans and non-gambling compliance disclaimer |
| POST | `/clubs` | `{ name, description?, visibility }` | Creates club, owner membership, default BASIC organizer plan |
| GET | `/clubs/mine` | - | My clubs with role and plan summary |
| POST | `/clubs/:clubId/members` | `{ userId, role }` | Owner/admin only, plan member-limit enforced |
| POST | `/clubs/:clubId/private-tables` | `{ name, mode, maxPlayers, virtualBuyIn }` | Owner/admin only, active-table limit enforced |
| GET | `/clubs/:clubId/private-tables` | - | Club member only |

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
