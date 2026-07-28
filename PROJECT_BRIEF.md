# POKER DUALITY / DuoPoker — project brief (historical)

> **Note (2026):** This brief is aspirational history. Canonical stack and layout: [README.md](./README.md), [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), [docs/DEPLOY.md](./docs/DEPLOY.md).  
> Current production: **Node 24**, **Hono on Vercel** + Neon Postgres, mode name **JOKER** (not RASPISNOY), tiers **BRONZE…BLACK** (not Royal). Express+Socket.IO remains for local/Mode B realtime. Mongo is optional/legacy.

## CONTEXT & GOALS
Premium cross-platform poker platform with Texas Hold'em and classic Joker («расписной»).
- Single account: Web (PWA) + iOS + Android
- Multiplayer: REST polling on Vercel; Socket.IO optional for realtime hosts
- No real-money gambling. Monetization via virtual chips, cosmetics, subscriptions, organizer SaaS
- Premium UI: 3D table scene, glassmorphism, micro-animations

---

## TECH STACK (current)

- **Frontend (Web)**: React 18 + TypeScript + Vite + R3F + Tailwind + Framer Motion + Zustand
- **Mobile**: Expo 52 (React Native) + Expo Router
- **API**: Node.js 24 + Hono (Vercel) ; legacy Express + Socket.IO (`apps/backend`)
- **Database**: PostgreSQL (Prisma) ; Redis/Mongo optional for legacy stack
- **Auth**: JWT + refresh + Google/Apple OAuth
- **Payments**: Stripe + YooKassa (web); RevenueCat (mobile)
- **Infra**: Vercel + Neon (+ optional Render for Socket.IO)

---

## 📁 ОЖИДАЕМАЯ MONOREPO СТРУКТУРА

/poker-duality
├── /apps
│ ├── /web # React + Vite + R3F
│ ├── /mobile # Expo + React Native
│ └── /backend # Node.js + Express + Socket.io
├── /packages
│ ├── /shared-types # TS interfaces, DTOs, enums, constants
│ ├── /game-engine # RNG, hand evaluator, state machine, rules (Hold'em + Raspisnoy)
│ ├── /ui-kit # Premium components, glassmorphism, 3D wrappers, theme
│ └── /db-schema # Prisma schema, migrations, seeds
├── /infra # docker-compose, nginx, terraform, CI/CD workflows
└── /docs # architecture, api, monetization, compliance, runbooks


---

## 🗄️ DATABASE SCHEMA (PRISMA OUTLINE)
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String?
  displayName   String
  avatar        String?
  chips         Int      @default(10000)
  level         Int      @default(1)
  xp            Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  subscriptions Subscription[]
  inventory     UserItem[]
  sessions      GameSession[]
  @@map("users")
}

model Subscription {
  id          String   @id @default(cuid())
  userId      String
  tier        Tier     // SILVER | GOLD | PLATINUM | ROYAL
  status      Status   // ACTIVE | EXPIRED | CANCELLED
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
  @@map("subscriptions")
}

model UserItem {
  id        String @id @default(cuid())
  userId    String
  itemId    String // card_skin, table_skin, avatar_frame, voice_pack, emote_set
  rarity    Rarity // COMMON | RARE | EPIC | LEGENDARY
  equipped  Boolean @default(false)
  user      User   @relation(fields: [userId], references: [id])
  @@map("user_inventory")
}

model GameSession {
  id          String   @id @default(cuid())
  mode        Mode     // HOLDEM | RASPISNOY
  status      Status   // LOBBY | IN_PROGRESS | FINISHED
  players     String[] // userIds
  buyIn       Int
  rake        Int
  startedAt   DateTime?
  finishedAt  DateTime?
  hands       Hand[]
  @@map("game_sessions")
}

model Hand {
  id          String   @id @default(cuid())
  sessionId   String
  round       Int
  cards       String[] // serialized
  actions     Action[] // bet, check, fold, call, raise
  winnerId    String?
  pot         Int
  session     GameSession @relation(fields: [sessionId], references: [id])
  @@map("hands")
}

💰 СИСТЕМА МОНЕТИЗАЦИИ (БЕЗ REALE MONEY GAMBLING)
Виртуальная валюта: Chips (ежедневные бонусы, реклама за просмотр, покупка за фиат). Вывод невозможен.
Косметический магазин:
Колоды (анимированные рубашки, голографические, 3D)
Столы (текстуры, динамическое освещение, частицы)
Аватары + рамки + статусы (свечение, префиксы, эффекты появления)
Голосовые пакеты, эмодзи, жесты за столом
Подписки (Stripe / IAP):
Silver ($4.99/мес): +50% бонусы, 5 колод, базовая статистика
Gold ($9.99/мес): всё из Silver + голосовой чат, heat-maps, приватные столы
Platinum ($19.99/мес): AI-тренер, 3D-эффекты, ранний доступ, турниры
Royal ($49.99/мес): кастомный стол/лого, API статистика, revenue share
Battle Pass: сезонные квесты → эксклюзивные скины, XP, виртуальные сундуки
🛑 Compliance: чёткий disclaimer в UI/ToS. Виртуальные фишки не конвертируются в фиат. Все покупки финальны. Логи транзакций в MongoDB.


🎨 PREMIUM UI/UX & 3D GUIDELINES
Тема: Dark mode (#0A0A0A), акценты #FFD700 (gold), #50C878 (emerald), #1A1A2E (deep blue)
Стиль: Glassmorphism + Neumorphism + PBR-материалы + мягкие тени
Анимации: Framer Motion (micro-interactions), GSAP (complex), Lottie/Rive (UI states)
3D сцена: @react-three/fiber + @react-three/drei (Environment, ContactShadows, Float, OrbitControls)
Ключевые компоненты:
PokerTable3D → динамическая камера, физика карт, частицы при победе
SkinSelector → 3D-витрина с вращением, превью в реальном времени
SubscriptionTierCard → glassmorphism + glow + tier badge
VoiceChatPanel → push-to-talk, waveform visualizer, mute/react
DualModeLobby → единая страница, два премиум-блока (Hold'em / Расписной)
Mobile: адаптивные жесты, bottom nav, haptic feedback, offline cache для lobby, PWA manifest
🔄 REALTIME & CROSS-PLATFORM SYNC
WebSocket rooms по sessionId
Redis pub/sub для matchmaking, lobby broadcast, anti-cheat rate limits
State machine для игровых фаз: DEAL → PRE-FLOP → FLOP → TURN → RIVER → SHOWDOWN
Hand evaluator: библиотека hand-evaluator или кастомная на TS
Replay system: сохранение actions[] → 3D replay через временные метки
Cross-sync: JWT session + Redis cache → одинаковый прогресс на всех устройствах
Anti-lag: server-side tick rate 30Hz, client-side prediction, reconciliation
📝 STEP-BY-STEP IMPLEMENTATION PLAN
Выполняй строго по порядку. После каждого шага запускай pnpm dev → тестируй → коммить → переходи к следующему.
📦 Init Monorepo → pnpm workspaces, TypeScript strict, ESLint, Prettier, Husky, Vitest
🗄️ DB & Auth → Prisma schema, JWT auth, session sync, user profile CRUD, OAuth2
🎲 Game Engine → RNG, hand evaluator, state machine, rules for Hold'em + Raspisnoy
🌐 WebSocket Server → rooms, matchmaking, state broadcast, anti-lag, reconnect logic
💳 Monetization → Stripe integration, subscription tiers, inventory system, chip economy, webhooks
🖼️ UI/UX Core → glassmorphism kit, theme provider, 3D table wrapper, dual-mode lobby routing
📱 Mobile Adapt → Expo setup, shared hooks, PWA manifest, offline fallback, IAP/RevenueCat
🎬 Animations & Effects → Framer Motion transitions, particle systems, victory effects, voice chat UI
🧪 Testing & Opt → unit (vitest), e2e (playwright), load testing (k6), Redis cache tuning
🚀 Deploy & CI/CD → Docker compose, GitHub Actions, staging/prod envs, monitoring (Sentry, Prometheus)



🤖 CURSOR RULES (ВСТАВИТЬ В .cursorrules)
[ROLE]
Ты Senior Full-Stack Architect & 3D UI Engineer. Пиши production-ready код на TypeScript.
Следуй SOLID, Clean Architecture, DRY. Используй строгую типизацию (strict: true).

[RULES]
1. Всегда указывай полный путь файла в начале блока: `// 📁 apps/backend/src/auth/jwt.ts`
2. Разбивай сложные задачи на атомарные файлы. Не генерируй >150 строк за раз.
3. Используй `try/catch`, `zod` для валидации, кастомные Error классы.
4. Для 3D: только `@react-three/fiber` + `@react-three/drei`. Raw Three.js запрещён без оберток.
5. Стейт: Zustand (UI), Socket events (game), Prisma (DB), Redis (cache).
6. Монетизация: НИКАКИХ real-money gambling. Виртуальные фишки не выводятся. Добавляй disclaimer.
7. Если требуется внешняя библиотека → укажи `pnpm add <package>`.
8. После генерации → кратко объясни архитектуру и как тестировать локально.
9. Импорты: используй `@/` алиасы, относительные пути запрещены для cross-package.
10. Коммиты: conventional commits. Каждый шаг = отдельная ветка/PR.

[MODE]
- Используй `Composer` для создания/изменения нескольких файлов.
- Запрашивай уточнения, если спецификация неполная.
- Генерируй `README.md` для каждого модуля с инструкцией по запуску.
- При ошибках → предлагай 2-3 варианта исправления, а не один.

