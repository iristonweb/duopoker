# Безопасность DuoPoker

Документ описывает меры защиты данных, закрытые уязвимости и обязательные переменные окружения для production (`https://duopoker.ru`).

## Шифрование персональных данных

Поля профиля **avatar** и **tableStatus** шифруются на сервере (AES-256-GCM) перед записью в БД.

| Переменная | Описание |
|---|---|
| `DATA_ENCRYPTION_KEY` | 64 hex-символа (256 бит) или passphrase. **Обязательна в production.** |

Без ключа данные хранятся как есть (режим миграции). После установки ключа новые записи шифруются; старые читаются в открытом виде до пересохранения профиля.

Email и пароли: email в БД в открытом виде (нужен для входа), пароль — bcrypt hash.

## Обязательные секреты (production)

| Переменная | Назначение |
|---|---|
| `JWT_SECRET` | Access-токены (не dev-default) |
| `JWT_REFRESH_SECRET` | Refresh-токены |
| `DATA_ENCRYPTION_KEY` | Шифрование avatar/status |
| `DATABASE_URL` | PostgreSQL |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | Подписки и чип-паки |
| `YOOKASSA_SHOP_ID` + `YOOKASSA_SECRET_KEY` | Клубные тарифы (РФ) |

`MOCK_CHECKOUT=true` **отключён в production** — mock-подписки и произвольные покупки недоступны.

## Dependency audit (CI)

`pnpm audit --audit-level=high` is a failing CI gate. Overrides in root `package.json` use version floors (`>=x.y.z` / `~7.18.0`), not exact vulnerable pins.

| Advisory | Policy |
|---|---|
| [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2) (react-router RSC CSRF) | Ignored via `pnpm.auditConfig.ignoreGhsas`. Patch is only in react-router `>=8.3.0`, which requires React 19. App uses Vite SPA + `react-router-dom` ~7.18 (not RSC). Revisit on React 19 upgrade. |

## Закрытые уязвимости

| Проблема | Исправление |
|---|---|
| Клиент задавал сумму daily bonus | Фиксированный бонус 500 фишек, 1 раз в день, idempotent `paymentEvent` (**Hono + Express**) |
| LiveKit token без auth | `POST /voice/token` требует JWT + членство в сессии |
| Join в чужую игру | `assertCanJoinSession`: match assignment, club seat или rejoin (open-join только вне production) |
| Предсказуемые session ID | UUID (`sess-{uuid}`, `club-{uuid}`) |
| IDOR закрытия клубного стола | Проверка `tableId` + `clubId` перед close |
| Email в публичном профиле | `GET /profile/:id` — без email (только owner) |
| YooKassa webhook без проверки | Платёж верифицируется через API YooKassa перед активацией (**Hono + Express**) |
| Mock Stripe/YooKassa в prod | `allowDevMockCheckout()` — только dev (**Hono + Express**) |
| Socket impersonation | JWT обязателен в production; `userId` из payload игнорируется |
| CORS reflect-any | Whitelist origins из `CORS_ORIGIN` + `PUBLIC_WEB_URL` (localhost только вне production) |

## HTTP-заголовки

API (`security-headers` middleware) и статика (`vercel.json`):

- `Strict-Transport-Security` (production)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`

## Аватары

Только загруженные data-URL (`image/jpeg|png|webp|gif`), max ~320 KB. Внешние URL запрещены (SSRF/privacy).

## JWT в localStorage

Токены хранятся в `localStorage` на клиенте — стандартный риск XSS. Рекомендации:

- Не вставлять сторонние скрипты на duopoker.ru
- CSP можно усилить отдельно (требует аудита inline-стилей Vite)

## Rate limiting

API: 120 req/min globally, 20 req/min on `/auth/*`. Uses **Upstash Redis** when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set; otherwise process-local Map (not multi-instance safe).

## Чеклист деплоя Vercel

1. `DATA_ENCRYPTION_KEY` — сгенерировать: `openssl rand -hex 32`
2. `JWT_SECRET`, `JWT_REFRESH_SECRET` — уникальные длинные строки
3. `PUBLIC_WEB_URL=https://duopoker.ru`
4. `CORS_ORIGIN=https://duopoker.ru,https://www.duopoker.ru`
5. Stripe + YooKassa webhook URLs в dashboards провайдеров
6. **Не** ставить `MOCK_CHECKOUT=true` в production

## Сообщить об уязвимости

Пишите на контакт из репозитория / Issues GitHub с пометкой **Security**.
