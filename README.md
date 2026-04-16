# DuoPoker

Local-first monorepo for cross-platform poker platform with dual modes (Hold'em and Raspisnoy), realtime multiplayer and premium UI.

## Stack
- Web: React + Vite + R3F
- Mobile: Expo + React Native
- Backend: Node.js + Express + Socket.IO
- Data: PostgreSQL + Redis + MongoDB

## Quick start
1. Install dependencies: `pnpm install`
2. Start infrastructure: `docker compose -f infra/docker-compose.yml up -d`
3. Run all apps: `pnpm dev`

## Compliance
- No real-money gambling.
- Virtual chips are non-withdrawable and non-convertible.
- Purchases are final.
