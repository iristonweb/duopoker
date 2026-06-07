# DuoPoker Mobile (Expo)

Native companion for [duopoker.ru](https://duopoker.ru) — auth, push invites, deep links, quick queue, **native poker table**.

## Setup

```bash
cp apps/mobile/.env.example apps/mobile/.env
# EXPO_PUBLIC_API_URL=https://duopoker-api.onrender.com/api  (or local backend)
pnpm --filter @duopoker/mobile dev
```

For realtime gameplay (Socket.IO), point `EXPO_PUBLIC_API_URL` at your long-lived backend (Render/Fly/local Express), not Vercel-only `/api`.

## EAS build (push notifications + voice mic)

1. `cd apps/mobile && eas init`
2. Set `EXPO_PUBLIC_EAS_PROJECT_ID` in `.env`
3. `eas credentials` — FCM (Android) + APNs (iOS)
4. `eas build --profile preview`

## Deep links

Push payloads open:

- `/invite/:code` — accept club invite
- `/table/:sessionId` — native table (Hold'em + Joker)
- `/lobby` — default

Custom scheme: `duopoker://invite/ABC123`

## Architecture

- **Table UI** — fully native React Native (`apps/mobile/src/table/`), shared logic in `@duopoker/table-client`
- **Session sync** — Socket.IO when backend supports it, REST polling fallback
- **Voice** — LiveKit via `livekit-client` + `/voice/token` (requires EAS dev build for mic/WebRTC)
- **Cosmetics** — asset URLs resolved from `EXPO_PUBLIC_WEB_URL` (optional, defaults to duopoker.ru)

## Notes

- WebView table removed; no `EXPO_PUBLIC_WEB_URL` required for gameplay.
- i18n reuses web locale files (`apps/web/src/i18n/locales`).
