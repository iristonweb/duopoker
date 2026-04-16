# HTTP API (backend)

Base URL: `http://localhost:4000` (set `PUBLIC_WEB_URL`, `VITE_API_URL` in deployments).

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

## Stripe webhook

`POST /monetization/stripe/webhook` — **raw body**, `stripe-signature` header. Configure `STRIPE_WEBHOOK_SECRET`.

## Socket.IO

- `queueMatchmaking` `{ userId, mode, buyIn }`
- `joinSession` `{ sessionId, userId, mode, buyIn }` — prefers JWT user when `auth.token` set
- `playerAction` — validated action; user id from JWT if present
- `reconnectSession` `{ sessionId }` — restores snapshot from memory or Postgres
- `readyNextHand` `{ sessionId }` after `street === COMPLETE`
- `voiceSignal` — WebRTC SDP/ICE relay within table room
