# Голосовой чат и полный realtime

## Почему Vercel alone недостаточно

Vercel serverless **не держит постоянные WebSocket-соединения**. Для мгновенного стола (без polling 1.5s) и голоса нужен **long-lived процесс** — Express + Socket.IO на Render/Fly.io/Railway.

Рекомендуемая **бесплатная** связка:

| Сервис | Роль | Free tier |
|--------|------|-----------|
| **Neon** | PostgreSQL (`DATABASE_URL`) | 0.5 GB, sleep OK |
| **Render** | `apps/backend` — REST + Socket.IO + voice relay | Web service free (sleep ~15 min idle) |
| **Vercel** | `apps/web` — статика + опционально serverless API | Hobby |
| **Upstash** (опционально) | Redis для сессий / pubsub | 10k cmd/day |

MongoDB **не обязателен** — реплеи и ledger деградируют gracefully без него.

---

## 1. Как реализован голосовой чат (текущий код)

**WebRTC + Socket.IO signaling** (уже в репозитории):

```
Browser A                    Render backend                 Browser B
   |  getUserMedia()              |                            |
   |  createOffer()               |                            |
   |-- voiceSignal(offer) ------->|------ voiceSignal ------->|
   |                              |                            | setRemoteDescription
   |                              |                            | createAnswer()
   |<----- voiceSignal(answer) ---|<----- voiceSignal --------|
   |<=========== encrypted audio (P2P) ========================>|
```

- Событие `voiceSignal` в `apps/backend/src/socket/server.ts` — ретрансляция SDP/ICE в комнату стола.
- UI: `apps/web/src/components/VoiceRoom.tsx` — push-to-talk, STUN Google.
- **Включено**, когда `VITE_API_URL` указывает на Render/local backend (`usesRealtimeSocket()`).

### Ограничения beta-реализации

| Проблема | Решение |
|----------|---------|
| NAT / мобильные сети — P2P не соединяется | **TURN-сервер** (Metered.ca free, Cloudflare Calls, Twilio) |
| Mesh на 6+ игроков | SFU: **LiveKit Cloud** (free tier) или Daily.co |
| Нет шифрования сигналинга | JWT на Socket.IO (уже optional auth) |

---

## 2. LiveKit (рекомендуется — уже в коде)

1. [LiveKit Cloud](https://cloud.livekit.io) → создай проект.
2. **Settings → Keys** — скопируй API Key, API Secret, WebSocket URL (`wss://…livekit.cloud`).
3. На **Render** (или Vercel serverless) задай env:
   ```
   LIVEKIT_API_KEY=APIxxxxx
   LIVEKIT_API_SECRET=xxxxxxxx
   LIVEKIT_URL=wss://your-project.livekit.cloud
   ```
4. На столе нажми **Join voice (LiveKit)** — клиент вызывает `POST /voice/token`, подключается к SFU.

Эндпоинты:
- `GET /voice/status` — `livekit: configured | missing`
- `POST /voice/token` — `{ sessionId, userId, displayName? }` → `{ token, url, roomName }`

Голос **не зависит от Socket.IO** — работает и с Vercel API, если LiveKit env заданы.

### Старый вариант: WebRTC mesh через Socket.IO

Deprecated in UI; `voiceSignal` в socket server остаётся для совместимости.

---

## 3. Деплой «без ограничений»

### Neon

1. Создай проект на [neon.tech](https://neon.tech).
2. Скопируй connection string → `DATABASE_URL`.
3. Миграции:
   ```bash
   DATABASE_URL="postgresql://..." pnpm --filter @duopoker/db-schema exec prisma migrate deploy --schema=packages/db-schema/prisma/schema.prisma
   ```

### Render (backend)

1. Blueprint из [render.yaml](../render.yaml) или New Web Service из репо.
2. Env:
   - `DATABASE_URL` — Neon
   - `JWT_SECRET`, `JWT_REFRESH_SECRET` — random
   - `PUBLIC_WEB_URL` — `https://your-app.vercel.app`
   - `CORS_ORIGIN` — тот же Vercel URL
   - `ALLOW_SOLO_QUEUE=true` — тест с ботом
   - `REDIS_URL` — опционально (Upstash); без Redis auth работает через Postgres `device_sessions`
3. URL вида `https://duopoker-api.onrender.com`.

### Vercel (frontend)

**Build env (обязательно для full realtime):**

```
VITE_API_URL=https://duopoker-api.onrender.com
```

Redeploy после изменения (Vite вшивает env при сборке).

Клиент автоматически:
- REST + Socket.IO → Render
- Голос → WebRTC через `voiceSignal`
- Без `VITE_API_URL` → fallback на Vercel `/api/*` + polling (демо без голоса)

---

## 4. Локальная разработка (full stack)

```bash
# Terminal 1 — Postgres (Docker) + миграции
docker compose -f infra/docker-compose.yml up postgres -d
pnpm --filter @duopoker/db-schema build

# Terminal 2 — backend :4000
DATABASE_URL=postgresql://duopoker:duopoker@127.0.0.1:5434/duopoker
ALLOW_SOLO_QUEUE=true
pnpm --filter @duopoker/backend dev

# Terminal 3 — web :5173
# apps/web/.env:
# VITE_API_URL=http://localhost:4000
pnpm --filter @duopoker/web dev
```

Два браузера → Queue → голос «Start voice session (beta)» на обоих после join.

---

## 5. TURN (если голос не соединяется)

В `VoiceRoom.tsx` расширь `iceServers`:

```typescript
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:global.relay.metered.ca:443',
    username: process.env.VITE_TURN_USERNAME,
    credential: process.env.VITE_TURN_CREDENTIAL
  }
]
```

Metered.ca даёт бесплатные TURN credentials для dev.
