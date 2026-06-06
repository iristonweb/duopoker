# Push-уведомления — DuoPoker

## Ваш стек: **Режим A (только Vercel)**

| Компонент | Где |
|-----------|-----|
| Фронт + API | **Vercel** (`duopoker.ru` / `/api/*`) |
| База | **Neon** PostgreSQL |
| Socket.IO | **Нет** в production (Vercel serverless не держит WebSocket) |
| `apps/backend` | **Только локально** для dev / тестов realtime |

Render в проекте **не используется** — `render.yaml` это опциональный шаблон (Режим B), его можно игнорировать.

---

## Как работают invite на duopoker.ru (без Render)

| Канал | Работает? |
|-------|-----------|
| **Web Push** (браузер, вкладка в фоне) | ✅ если заданы VAPID на Vercel |
| **Звук + баннер в лобби** (вкладка открыта) | ✅ polling каждые 15 с + Web Push |
| **Мгновенный socket** (0 ms) | ❌ без отдельного long-lived сервера |
| **Expo mobile push** | ✅ через Expo Push API (отдельная настройка) |

---

## Production: что добавить на Vercel

1. [Vercel Dashboard](https://vercel.com) → **duopoker** → **Settings** → **Environment Variables**
2. Импортируй [`.env.vercel.local`](../.env.vercel.local) **или** добавь только:

| Переменная | Обязательно |
|------------|-------------|
| `VAPID_PUBLIC_KEY` | ✅ |
| `VAPID_PRIVATE_KEY` | ✅ |
| `VAPID_SUBJECT` | ✅ (`mailto:iristonweb@gmail.com`) |

3. **Redeploy** production.

**Не добавляй** на Vercel (если нет Render):

- `BACKEND_INTERNAL_URL`
- `NOTIFY_INTERNAL_SECRET`
- `VITE_API_URL` (оставь пустым — same-origin `/api`)

---

## Локальная разработка

| Файл | Когда |
|------|-------|
| [`packages/api/.env`](../packages/api/.env) | `pnpm --filter @duopoker/api dev` (:3001) |
| [`apps/backend/.env`](../apps/backend/.env) | `pnpm --filter @duopoker/backend dev` (:4000) — только локально |
| [`apps/web/.env`](../apps/web/.env) | `VITE_API_URL=http://localhost:4000` — socket + мгновенные invite |

Локально с backend: socket + NOTIFY secret связывают API и Express.  
Локально только api (:3001): как на Vercel — polling + Web Push.

---

## Проверка на duopoker.ru

1. Лобби → **Enable invite notifications** → разрешить в Chrome/Edge.
2. Второй аккаунт → VIP или club invite.
3. Ожидай:
   - вкладка открыта → баннер + звук (до 15 с или сразу при Web Push);
   - вкладка в фоне → OS-уведомление (Web Push).

---

## Mobile (Expo) — вручную

См. раздел ниже в этом файле — нужны Apple Developer + Firebase / EAS.

1. `eas init` + `eas credentials`
2. `apps/mobile/.env`: `EXPO_PUBLIC_API_URL=https://duopoker.ru/api`
3. `eas build`

---

## Опционально: Режим B (Render) — вам не нужен

Если когда-нибудь понадобится Socket.IO в production:

- Деплой `apps/backend` на Render/Fly/Railway
- `VITE_API_URL=https://your-api.example.com` на Vercel Build
- `BACKEND_INTERNAL_URL` + `NOTIFY_INTERNAL_SECRET` на Vercel

Сейчас **не делайте** — у вас всё на Vercel.

---

## Troubleshooting

| Симптом | Решение |
|---------|---------|
| Нет OS push | VAPID на Vercel + redeploy + разрешение в браузере |
| Звук с задержкой ~15 с | Норма для Vercel-only (polling); Web Push быстрее в фоне |
| Push subscribe fail | Проверь `GET /api/notifications/vapid-public-key` |
| iOS Safari | Web Push ограничен; используй native app |

---

## Перегенерация ключей

```powershell
npx web-push generate-vapid-keys
```

Обнови `packages/api/.env` и Vercel env, redeploy.
