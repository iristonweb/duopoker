# 🎯 POKER DUALITY — ИНСТРУКЦИЯ ДЛЯ CURSOR

## 📌 КОНТЕКСТ & ЦЕЛИ
Создать премиум кроссплатформенную покер-платформу с двумя режимами: Texas Hold'em и Расписной покер.
✅ Единый аккаунт: Web (PWA) + iOS + Android + Desktop
✅ Реальный мультиплеер в реальном времени (WebSocket)
✅ 🚫 БЕЗ азартных игр на реальные деньги. Монетизация ТОЛЬКО через виртуальные фишки, косметику, подписки и геймификацию
✅ Премиум UI: 3D-сцена стола, glassmorphism, неон, PBR-материалы, микро-анимации
✅ Масштабируемая архитектура, готовая к 100k+ CCU, авто-масштабирование, региональные ноды
Сгенерировать крутые баннеры и фоны со скинами и прочим, возможны и анимации

---

## 🛠️ ТЕХНОЛОГИЧЕСКИЙ СТЕК (STRICT)
- **Frontend (Web)**: React 18 + TypeScript + Vite + `@react-three/fiber` + `@react-three/drei` + TailwindCSS + Framer Motion + Zustand
- **Mobile**: Expo (React Native) + TypeScript + `react-native-reanimated` + `react-native-skia` + Expo Router
- **Backend**: Node.js 20 + Express + TypeScript + `socket.io` + `@fastify/websocket` (опционально)
- **Database**: PostgreSQL (Prisma ORM) + Redis (sessions, matchmaking, pub/sub) + MongoDB (logs, analytics, replays)
- **Auth**: JWT + Refresh Tokens + OAuth2 (Google/Apple) + Device Sync via Redis
- **Payments**: Stripe (Web) + RevenueCat / Apple IAP / Google Play Billing (Mobile)
- **Infra**: Docker + Docker Compose → AWS/GCP → CI/CD GitHub Actions → Nginx/Cloudflare
- **State/Realtime**: Zustand (UI) + Socket.IO Rooms + Redis Pub/Sub + Zod validation
- **3D/Effects**: Three.js + `@react-three/drei` + GSAP/Lottie/Rive (UI states)

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

