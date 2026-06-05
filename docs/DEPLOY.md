# Deploying DuoPoker

## Режим A — всё на Vercel (фронт + API + голос)

Один проект Vercel: React + serverless API (`api/index.ts` + esbuild bundle → `packages/api`).

| Функция | Как работает |
|---------|----------------|
| Auth, профиль, магазин, клубы | `/api/*` на Vercel |
| Игра | REST + polling ~1.5 с (без WebSocket) |
| Голос | **LiveKit** — `POST /voice/token` на Vercel |
| База | **Neon** PostgreSQL (`DATABASE_URL` на Vercel) |

**Важно:** `VITE_API_URL` на Vercel **не задавай** (или оставь пустым). Иначе браузер уйдёт на внешний хост вместо `/api` на том же домене.

---

## Режим B — максимальный realtime (Vercel + Render)

| | Vercel | Render |
|---|--------|--------|
| Фронт | ✅ | — |
| API + Socket.IO | — | `apps/backend` |
| Игра | — | мгновенно через WebSocket |
| Голос | LiveKit или socket | LiveKit |

На Vercel Build env: `VITE_API_URL=https://your-api.onrender.com`

---

# Режим A: пошагово (Vercel + Neon + LiveKit)

### 1. Neon — база данных

1. [neon.tech](https://neon.tech) → Create project.
2. Скопируй **Connection string** (Pooled, `postgresql://…`).

Локально один раз создай таблицы:

```powershell
cd C:\Users\gtx\Desktop\Projectss\DuoPoker
$env:DATABASE_URL="postgresql://USER:PASS@ep-xxx.neon.tech/neondb?sslmode=require"
pnpm db:push
```

### 2. Vercel — Environment Variables

Project → **Settings → Environment Variables** (Production + Preview):

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | строка из Neon |
| `JWT_SECRET` | случайная длинная строка (64+ символов) |
| `JWT_REFRESH_SECRET` | другая случайная строка |
| `PUBLIC_WEB_URL` | `https://duopoker.vercel.app` (твой домен) |
| `ALLOW_SOLO_QUEUE` | `true` |
| `MOCK_CHECKOUT` | `true` для demo; **`false` + Stripe keys для реальных платежей** |
| `LIVEKIT_API_KEY` | из cloud.livekit.io |
| `LIVEKIT_API_SECRET` | из cloud.livekit.io |
| `LIVEKIT_URL` | `wss://xxx.livekit.cloud` |

**Не добавляй** `VITE_API_URL` — API на том же домене через rewrites.

**Root Directory:** Settings → **Build and Deployment** → Root Directory должен быть **пустым** (корень репозитория). Handler — `api/index.ts`, конфиг — корневой `vercel.json`.

Сгенерировать JWT (PowerShell):

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Git push → Redeploy

```powershell
git add -A
git commit -m "Vercel API, LiveKit voice, Neon-ready"
git push
```

Vercel → **Deployments → Redeploy** (если env меняли после последнего деплоя).

### 4. Проверка после деплоя

```text
https://duopoker.vercel.app/api/health
→ {"status":"ok","runtime":"vercel-serverless"}

https://duopoker.vercel.app/health
→ то же (rewrite)

https://duopoker.vercel.app/api/voice/status
→ {"livekit":"configured",...}
```

В браузере: Register → Queue → стол → **Join voice (LiveKit)**.

---

# Режим B: Render (опционально, если нужен Socket.IO)

См. [render.yaml](../render.yaml) и [VOICE_AND_REALTIME.md](./VOICE_AND_REALTIME.md).

---

## Local development

### Vercel-style (polling, no Socket.IO)

```powershell
docker compose -f infra/docker-compose.yml up postgres -d
pnpm db:push
pnpm --filter @duopoker/api dev          # :3001
pnpm --filter @duopoker/web dev          # :5180 — leave VITE_API_URL unset
```

Optional: `VITE_API_PROXY=http://localhost:3001` in `apps/web/.env` (this is the default proxy target).

### Full realtime (Socket.IO + LiveKit)

```powershell
pnpm --filter @duopoker/backend dev    # :4000
pnpm --filter @duopoker/web dev        # :5180
```

`apps/web/.env`: `VITE_API_URL=http://localhost:4000`

### Seed superadmin

```powershell
$env:ADMIN_EMAIL="you@example.com"
$env:ADMIN_PASSWORD="your-secure-password"
pnpm --filter @duopoker/db-schema seed
```

Login → `GET /api/auth/me` should return `"role":"SUPERADMIN"`. Admin UI: `/admin`.

### Post-deploy checklist

1. `GET /api/health` → `{"status":"ok",...}`
2. `ALLOW_SOLO_QUEUE=true` on Vercel (solo matchmaking works)
3. Do **not** set `VITE_API_URL` on Vercel
4. Register / login → Queue → match → `/table/:id`
5. Queue API errors show a red banner in lobby (not silent failure)
6. RU default UI; EN switch in header changes labels

---

---

## YooKassa / ЮMoney (оплата клубов)

Организаторские планы PRO и NETWORK оплачиваются через ЮKassa (ЮMoney для бизнеса).

| Переменная | Описание |
|------------|----------|
| `YOOKASSA_SHOP_ID` | ID магазина в личном кабинете ЮKassa |
| `YOOKASSA_SECRET_KEY` | Секретный ключ API |
| `MOCK_CHECKOUT=true` | Dev: мгновенная активация плана без редиректа |

Webhook URL (режим A):

```text
https://duopoker.vercel.app/api/monetization/yookassa/webhook
```

Return URL после оплаты: `/clubs/:clubId?checkout=success`

---

## Stripe (player subscriptions)

Webhook URL (режим A):

```
https://duopoker.vercel.app/monetization/stripe/webhook
```
