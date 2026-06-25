# DuoPoker Polish Roadmap

This roadmap turns the current project audit into a practical path toward a more polished product. It is intentionally staged: fix visible inconsistencies first, add confidence around production flows next, then tackle larger architecture and mobile parity work.

## Current Baseline

DuoPoker is already a mature monorepo with a strong game core and a clear premium visual direction:

- Web: React, Vite, Tailwind, Framer Motion, R3F in `apps/web`.
- Mobile: Expo native shell in `apps/mobile`.
- Production API: Hono serverless API in `packages/api`.
- Realtime legacy stack: Express and Socket.IO in `apps/backend`.
- Game rules: pure shared engine in `packages/game-engine`.
- Shared UI: glass-morphism primitives in `packages/ui-kit`.
- Shared contracts and design tokens: `packages/shared-types`.

The biggest opportunities are consistency and confidence: the brand language is good, but not applied everywhere; the game engine is well tested, but the production REST/polling path and UI surfaces need stronger coverage; the mobile app works as a companion, but does not yet match web feature depth.

## Priority 0: Immediate Wins

These are low-risk changes that should improve perceived quality quickly.

### UI Consistency

- Replace `premium-btn` usages with `Button` from `packages/ui-kit/src/components/Button.tsx`, or define the missing compatibility classes in one place if a full replacement is too large for the first pass.
- Start with the known call sites in `apps/web/src/routes/Lobby.tsx`, `apps/web/src/routes/AdminPage.tsx`, `apps/web/src/components/TableInviteBanner.tsx`, `apps/web/src/components/VipInviteBanner.tsx`, and `apps/web/src/components/referrals/ReferralPanel.tsx`.
- Standardize CTA hierarchy: primary for irreversible or main actions, ghost for secondary actions, secondary for positive non-primary actions.
- Keep the existing dark glass, gold, and emerald style direction rather than introducing a new visual language.

### Design Tokens

- Treat `packages/shared-types/src/theme.ts` as the source of truth for brand colors.
- Keep `apps/web/src/index.css` and `apps/web/tailwind.config.ts` synchronized with shared tokens.
- Add a small token-sync check or snapshot test once token churn becomes common.

### Loading And Empty States

- Review route fallbacks in `apps/web/src/main.tsx` and page-level loading states for lobby, profile, clubs, and table management.
- Prefer `LoadingSkeleton`, `GlassPanel`, and `EmptyState` from `packages/ui-kit` over one-off placeholders.
- Make queue, invite, and checkout error states visible and actionable.

### Copy And Localization

- Consolidate mobile copy that currently lives in `apps/mobile/src/lib/strings.ts` with the existing i18n setup where practical.
- Keep Russian as the default experience while ensuring all critical flows have English strings through `apps/web/src/i18n/locales`.
- Audit short CTA labels on mobile for clarity under narrow widths.

## Priority 1: Product And UX Polish

These changes improve the core user journey without changing the backend model.

### Core Journeys

Focus on these flows in order:

1. Register or login.
2. Choose mode, opponent, player count, and Joker options.
3. Enter queue and understand waiting or matched state.
4. Join table, act during a hand, leave or continue safely.
5. Configure profile, cosmetics, and table preferences.
6. Accept VIP or club table invites.
7. Create and manage clubs or private tables.
8. Understand subscriptions, virtual chips, and compliance limits.

### Lobby

`apps/web/src/routes/Lobby.tsx` is the most important marketing and conversion surface. It should become easier to iterate on:

- Extract self-contained sections from the large route file only where it makes testing or UX iteration safer.
- Keep auth, queue controls, subscription preview, referral panel, and 3D table preview visually distinct.
- Make queue state transitions explicit: idle, searching, waiting for human, matched, failed.
- Lazy-load or defer heavy decorative pieces, especially R3F previews, on constrained devices.

### Table

The table is the core product surface and should favor clarity over decoration during active play:

- Preserve the existing layout router in `apps/web/src/components/table/layouts/TableLayoutRouter.tsx`.
- Add a clearer explanation for mobile immersive mode near the user preference that controls it.
- Make turn state, legal actions, current bet, and connection status visually unambiguous.
- Review small-screen density around chat, voice, leaderboard, and Joker-specific panels.

### Profile, Cosmetics, And Subscriptions

- Make cosmetics ownership, eligibility, and equipped state obvious in `apps/web/src/routes/ProfilePage.tsx`.
- Keep subscription cards visually consistent with the rest of the UI kit.
- Ensure purchase and compliance copy clearly states play-money and non-withdrawable chip rules.

### Clubs And Invites

- Treat club onboarding as an organizer funnel, not just a form.
- Surface plan limits before users hit blocked actions.
- Make invite acceptance resilient: expired, already accepted, unauthorized, and table closed states need clear copy and next actions.

## Priority 2: Mobile Parity

The mobile app currently covers login, lobby, invite deep links, and the native table. That is a good companion scope, but it creates product gaps compared with the web app.

### Keep Native

These flows should remain native because they directly affect mobile gameplay:

- Login and session restore.
- Lobby quick queue.
- Deep link invite acceptance.
- Native Hold'em and Joker table.
- Push notification routing.
- Voice entry points.

### Add Next

These are the best candidates for native expansion:

- Profile summary, avatar, nickname, and table status.
- Equipped cosmetics and a read-only inventory view.
- Basic subscription status and entitlement visibility.
- Legal links and compliance summary.
- Club/table invite inbox.

### Defer Or Keep Web-First

These can stay web-first until the core mobile loop is stronger:

- Full cosmetics shop.
- Club creation and advanced organizer management.
- Admin tools.
- Detailed billing and payment management.

### Reduce Drift

- Keep shared gameplay behavior in `@duopoker/table-client`.
- Avoid duplicating business rules in React Native components.
- Define a small set of cross-platform visual decisions: colors, radius, spacing, typography scale, card sizing, and table HUD hierarchy.

## Priority 3: Technical Stabilization

The game engine is the strongest shared foundation. The main technical risk is the split between production serverless API behavior and legacy realtime backend behavior.

### Production API Confidence

- Add automated coverage for the same-origin Vercel-style path: `/api/game/queue`, `/api/game/join`, `/api/game/session/:id`, `/api/game/action`, and table leave or ready-next-hand flows.
- Exercise polling behavior from `packages/table-client/src/create-table-store.ts`, not only Socket.IO behavior.
- Add at least one E2E or integration test that proves a user can queue, join, act, poll state, and complete a minimal hand against `packages/api`.

### Realtime Strategy

Choose one long-term direction before large feature work:

1. Keep Vercel REST/polling as the primary production path and optimize around it.
2. Promote the Socket.IO backend to a first-class production service.
3. Move toward a shared server core used by both Hono and Express transports.

The third option has the best maintainability profile if both transports must survive. It should extract shared session, matchmaking, monetization, auth, and invite services without moving transport-specific concerns into `packages/game-engine`.

### Session Consistency

- Keep `packages/api` DB-authoritative for serverless mode.
- Avoid expanding in-memory session assumptions in `apps/backend` unless that backend becomes the chosen production realtime service.
- Document any behavior differences between REST polling and Socket.IO before changing gameplay UX.

### Route And Component Maintainability

- Split oversized route files only around stable boundaries: auth panel, queue panel, subscription panel, table shell, admin sections, club management sections.
- Avoid broad refactors that do not directly enable UX work, tests, or shared logic extraction.
- Keep component APIs small and aligned with existing `@duopoker/ui-kit` patterns.

## Priority 4: Quality Gates

The current CI pipeline is broad, but several important classes of defects can still pass.

### CI

- Remove the non-failing dependency audit pattern in `.github/workflows/ci.yml` once current advisories are triaged.
- Prefer `pnpm audit --audit-level=high` as a failing gate for production branches.
- Keep `pnpm lint`, `pnpm test`, `packages/game-engine` test/build, API bundle, backend build, and web build as required gates.

### UI Regression

- Add lightweight component tests for UI-kit primitives and route-level critical controls.
- Add visual regression snapshots for lobby, table desktop, table mobile, profile, invite banners, and club onboarding once the styling baseline is cleaned up.
- Include a test or static check that catches undefined shared CSS utility classes like `premium-btn`.

### Accessibility

- Verify keyboard focus order on lobby auth, profile modals, invite banners, club management, and admin controls.
- Confirm modal focus trapping and escape/close behavior.
- Preserve `prefers-reduced-motion` behavior for table, lobby, and cosmetic animations.
- Add accessible names for custom table controls where visual labels are not enough.

### Performance

- Track web vitals for lobby and table separately.
- Watch mobile web cost from R3F, large images, blur, and glow effects.
- Keep the current mobile immersive performance overrides, but make the visual tradeoff intentional and documented.

## Priority 5: Security, Ops, And Reliability

DuoPoker already documents many security decisions in `docs/SECURITY.md`. The next step is turning more of those decisions into enforced guardrails.

### Rate Limiting

- Replace in-memory serverless rate limiting in `packages/api/src/middleware/rate-limit.ts` with a distributed backend such as Upstash Redis.
- Keep local fallback behavior for development.
- Add route-specific limits for auth, checkout, invites, profile updates, and game actions.

### Token Storage And CSP

- Keep the current localStorage JWT risk documented.
- Before changing auth storage, first harden CSP and audit inline script/style requirements from Vite and third-party libraries.
- Do not add new third-party scripts without a security review.

### Production Environment Safety

- Add startup or build-time checks for dangerous production env combinations.
- Explicitly fail production when mock checkout, weak secrets, missing encryption key, or unexpected API routing is detected.
- Keep `VITE_API_URL` unset for Vercel mode as documented in `docs/DEPLOY.md`.

### Observability

- Expand Sentry usage around queue, table join, action submission, checkout, push, and invite flows.
- Add structured server logs for game actions, session access failures, checkout transitions, and invite acceptance.
- Keep compliance event logging aligned with club and monetization workflows.

## Suggested Implementation Order

1. Fix `premium-btn` inconsistency and standardize CTA usage.
2. Add a small static/UI check to prevent missing shared classes from returning.
3. Improve queue, invite, checkout, and route loading/error states.
4. Add production REST/polling integration coverage.
5. Split `Lobby.tsx` only around sections touched by UX polish.
6. Add mobile profile summary and invite inbox.
7. Decide long-term realtime strategy and extract shared server services if both API stacks stay.
8. Move rate limiting to a distributed store and tighten CI audit behavior.
9. Add visual regression and accessibility checks for the polished baseline.

## Definition Of Done

DuoPoker can be considered polished when:

- Main web flows look consistent and use the shared design system.
- Mobile clearly supports the core play loop and does not surprise users with missing account basics.
- Production REST/polling gameplay has automated coverage.
- Socket.IO and REST behavior differences are intentional and documented.
- CI catches high-risk dependency, UI, game-engine, API, and build regressions.
- Security and deployment docs match enforced production behavior.
- The product feels coherent across lobby, table, profile, invites, clubs, and mobile entry points.
