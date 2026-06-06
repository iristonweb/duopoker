# DuoPoker Mobile (Expo)

Native companion for [duopoker.ru](https://duopoker.ru) — auth, push invites, deep links, quick queue.

## Setup

```bash
cp apps/mobile/.env.example apps/mobile/.env
# EXPO_PUBLIC_API_URL=https://duopoker.ru/api
pnpm --filter @duopoker/mobile dev
```

## EAS build (push notifications)

1. `cd apps/mobile && eas init`
2. Set `EXPO_PUBLIC_EAS_PROJECT_ID` in `.env`
3. `eas credentials` — FCM (Android) + APNs (iOS)
4. `eas build --profile preview`

## Deep links

Push payloads open:

- `/invite/:code` — accept club invite
- `/table/:sessionId` — join session (+ open web table)
- `/lobby` — default

Custom scheme: `duopoker://invite/ABC123`

## Notes

- Full 3D table UI is web-only for now; mobile opens browser for live play.
- Production API is Vercel `/api` — no Socket.IO required.
