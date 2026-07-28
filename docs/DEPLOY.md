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

Локально один раз создай таблицы (или синхронизируй существующую Neon):

```powershell
cd C:\Users\gtx\Desktop\Projectss\DuoPoker
$env:DATABASE_URL="postgresql://USER:PASS@ep-xxx.neon.tech/neondb?sslmode=require"
pnpm sync:prod-db
```

`sync:prod-db` применяет squashed-миграцию `20260401000000_init`, помечает её applied если схема уже была через `db:push`, и выдаёт недостающую косметику подписчикам.

### 2. Vercel — Environment Variables

Project → **Settings → Environment Variables** (Production + Preview):

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | строка из Neon (Pooled / pooler) |
| `DIRECT_DATABASE_URL` | прямая строка Neon (без `-pooler` в хосте); если не задана — `vercel-build.mjs` выведет из `DATABASE_URL` |
| `JWT_SECRET` | случайная длинная строка (64+ символов) |
| `JWT_REFRESH_SECRET` | другая случайная строка |
| `PUBLIC_WEB_URL` | `https://duopoker.ru` |
| `CORS_ORIGIN` | `https://duopoker.ru,https://www.duopoker.ru,https://duopoker.vercel.app` |
| `ALLOW_SOLO_QUEUE` | `true` |
| `MOCK_CHECKOUT` | `true` для demo; **`false` + Stripe keys для реальных платежей** |
| `LIVEKIT_API_KEY` | из cloud.livekit.io |
| `LIVEKIT_API_SECRET` | из cloud.livekit.io |
| `LIVEKIT_URL` | `wss://xxx.livekit.cloud` |
| `VAPID_PUBLIC_KEY` | Web Push public key (`npx web-push generate-vapid-keys`) |
| `VAPID_PRIVATE_KEY` | Web Push private key |
| `VAPID_SUBJECT` | `mailto:your@email.com` |

Подробнее: [PUSH_SETUP.md](./PUSH_SETUP.md).

**Не добавляй** `VITE_API_URL` — API на том же домене через `/api/*` (см. `vercel.json`).

**Маршруты SPA** (`/profile`, `/admin`, `/clubs`, `/lobby` и т.д.) отдаются как `index.html`. API только под префиксом `/api/…` — короткие rewrites вроде `/profile → /api/profile` ломают страницы.

**Root Directory:** Settings → **Build and Deployment** → Root Directory должен быть **пустым** (корень репозитория). Handler — `api/index.ts`, конфиг — корневой `vercel.json`.

Сгенерировать JWT (PowerShell):

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Git push → Redeploy

Перед push, если менялась Prisma-схема, один раз примени миграции на Neon:

```powershell
$env:DATABASE_URL="postgresql://...pooler...neon.tech/neondb?sslmode=require"
$env:DIRECT_DATABASE_URL="postgresql://...direct...neon.tech/neondb?sslmode=require"
pnpm sync:prod-db
```

Vercel build **не** запускает `prisma migrate deploy` (избегаем advisory lock на Neon pooler).

```powershell
git add -A
git commit -m "Vercel API, LiveKit voice, Neon-ready"
git push
```

Vercel → **Deployments → Redeploy** (если env меняли после последнего деплоя).

### 4. Проверка после деплоя

Подробнее: [DOMAIN.md](./DOMAIN.md) (REG.RU + Vercel).

```text
https://duopoker.ru/api/health
→ {"status":"ok","runtime":"vercel-serverless"}

https://duopoker.ru/health
→ то же (rewrite)

https://duopoker.ru/api/voice/status
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

## Founder / Superadmin

The founder account (set via `FOUNDER_EMAIL`) receives **SUPERADMIN**, **BLACK lifetime**, all cosmetics, and 999 999 chips.

### Automatic (after deploy)

Set optional env on Vercel:

| Variable | Value |
|----------|--------|
| `FOUNDER_EMAIL` | `iristonweb@gmail.com` (default if omitted) |

On **login or register**, matching email gets the founder package idempotently. Sign out and sign in again if `/admin` does not appear immediately.

### One-time bootstrap (HTTP)

| Variable | Value |
|----------|--------|
| `FOUNDER_GRANT_SECRET` | random long string |

After redeploy:

```bash
curl -X POST "https://duopoker.ru/api/admin/bootstrap-founder?email=iristonweb@gmail.com" \
  -H "x-founder-secret: YOUR_SECRET"
```

### Manual (Neon DATABASE_URL)

```powershell
$env:DATABASE_URL="postgresql://..."
node scripts/grant-founder.mjs iristonweb@gmail.com
```

Verify: `GET /api/auth/me` → `"role":"SUPERADMIN"`. Admin UI: `/admin`.

---

## Player subscriptions (YooKassa, RUB)

Prices are in rubles (see `packages/shared-types/src/pricing.ts`):

| Tier | Price |
|------|-------|
| Bronze | 290 ₽/mo |
| Silver | 490 ₽/mo |
| Gold | 990 ₽/mo |
| Platinum | 1 990 ₽/mo |
| Diamond | 2 990 ₽/mo |
| Black | 4 990 ₽/mo |

Checkout: `POST /api/monetization/subscription/checkout` → redirect to YooKassa.

Webhook (same as clubs):

```text
https://duopoker.ru/api/monetization/yookassa/webhook
```

Required env: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`. For local demo without payments: `MOCK_CHECKOUT=true` (non-production only).

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
https://duopoker.ru/api/monetization/yookassa/webhook
```

Return URL после оплаты: `/clubs/:clubId?checkout=success`

---

## Stripe (player subscriptions)

Webhook URL (режим A):

```
https://duopoker.ru/api/monetization/stripe/webhook
```
