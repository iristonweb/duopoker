# Привязка домена duopoker.ru (REG.RU → Vercel)

Проект **duopoker** на Vercel уже настроен на домены:

- `duopoker.ru` (основной)
- `www.duopoker.ru` (алиас)

Осталось прописать DNS у REG.RU и обновить env на Vercel (см. ниже).

---

## Диагностика: сайт не открывается по duopoker.ru

**Симптом:** `duopoker.ru` не открывается, но `https://duopoker.vercel.app` работает.

**Причина (проверено):** домен **не резолвится в DNS** — у REG.RU не прописаны (или ещё не применились) A-записи на Vercel.

### Что сделать в REG.RU (обязательно)

1. [reg.ru](https://www.reg.ru) → **Мои домены** → **duopoker.ru**
2. **DNS-серверы** → должны быть **серверы REG.RU** (ns1.reg.ru / ns2.reg.ru), не «сторонние» без записей
3. **Управление зоной DNS** → добавьте:

| Тип | Имя | Значение |
|-----|-----|----------|
| **A** | `@` | `76.76.21.21` |
| **A** | `www` | `76.76.21.21` |

4. Удалите старые A/CNAME для `@` и `www`, если они ведут на другой хостинг
5. Подождите **15 мин – 24 ч** (обычно 30–60 мин)

### Проверка с вашего ПК

```powershell
nslookup duopoker.ru
nslookup www.duopoker.ru
```

Ожидается ответ: **Address: 76.76.21.21**

Если «Non-existent domain» или пусто — DNS ещё не настроен или не обновился.

### Проверка в Vercel

1. Project **duopoker** → **Settings** → **Domains**
2. `duopoker.ru` и `www.duopoker.ru` → статус **Valid Configuration** (зелёный)
3. Если **Invalid** — Vercel покажет, какие записи нужны; сверьте с REG.RU

### После появления DNS

```text
https://duopoker.ru/api/health  → {"status":"ok",...}
https://duopoker.ru/lobby       → лобби
```

---

## 1. DNS в личном кабинете REG.RU

1. Открой [reg.ru](https://www.reg.ru) → **Мои домены** → **duopoker.ru** → **DNS-серверы и зона**.
2. Убедись, что используются **DNS-серверы REG.RU** (не сторонние), и открой **Редактирование зоны** / **Управление DNS**.

Добавь записи:

| Тип | Имя (хост) | Значение | TTL |
|-----|------------|----------|-----|
| **A** | `@` (или пусто) | `76.76.21.21` | 3600 |
| **A** | `www` | `76.76.21.21` | 3600 |

> Альтернатива для `www`: **CNAME** `www` → `cname.vercel-dns.com` (если REG.RU не даёт A для поддомена).

Удали конфликтующие старые A/CNAME для `@` и `www`, если они указывают на другой хостинг.

**Проверка** (через 5–30 минут, иногда до 24 ч):

```powershell
nslookup duopoker.ru
nslookup www.duopoker.ru
```

Оба должны резолвиться в `76.76.21.21`.

---

## 2. Vercel — статус домена

1. [vercel.com](https://vercel.com) → проект **duopoker** → **Settings** → **Domains**.
2. Статус `duopoker.ru` и `www.duopoker.ru` должен стать **Valid Configuration**.
3. В **Primary domain** выбери `duopoker.ru`, включи редирект `www` → apex (рекомендуется).

CLI (уже выполнено локально):

```powershell
vercel domains add duopoker.ru
vercel domains add www.duopoker.ru
```

---

## 3. Environment Variables на Vercel

Project → **Settings → Environment Variables** (Production + Preview):

| Переменная | Новое значение |
|------------|----------------|
| `PUBLIC_WEB_URL` | `https://duopoker.ru` |
| `CORS_ORIGIN` | `https://duopoker.ru,https://www.duopoker.ru,https://duopoker.vercel.app` |

**Не задавай** `VITE_API_URL` — API остаётся на том же домене через `/api`.

После изменения env: **Deployments → Redeploy** последнего деплоя.

---

## 4. Webhooks и внешние сервисы

Обнови URL в кабинетах, если уже настроены:

| Сервис | URL |
|--------|-----|
| Stripe webhook | `https://duopoker.ru/api/monetization/stripe/webhook` |
| YooKassa webhook | `https://duopoker.ru/api/monetization/yookassa/webhook` |
| LiveKit | без смены (ключи те же) |

---

## 5. Проверка после привязки

```text
https://duopoker.ru/api/health
→ {"status":"ok","runtime":"vercel-serverless"}

https://duopoker.ru/lobby
→ лобби открывается, login/register работают
```

Старый адрес `https://duopoker.vercel.app` продолжит работать параллельно.

---

## Опционально: DNS через Vercel

Вместо A-записей можно делегировать NS на Vercel:

- `ns1.vercel-dns.com`
- `ns2.vercel-dns.com`

В REG.RU: **DNS-серверы** → указать эти NS. Тогда записи управляются в Vercel Dashboard.
