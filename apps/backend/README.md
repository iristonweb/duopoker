# Backend

Express + Socket.IO service for auth, profile, monetization, and realtime game sessions.

## Run
- `pnpm --filter @duopoker/backend dev`

## Endpoints
- `GET /health`
- `POST /auth/login`
- `GET /profile/:id`
- `PUT /profile/:id`
- `POST /monetization/bonus`
- `POST /monetization/purchase`
