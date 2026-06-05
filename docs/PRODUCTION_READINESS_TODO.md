# DuoPoker Production Readiness TODO

This checklist targets a release-grade `Club SaaS + Play-Money` rollout (no real-money payouts).

## 1) Legal and policy baseline (P0)

- [ ] Finalize Terms of Service for social play-money positioning.
- [ ] Finalize Privacy Policy (data retention, deletion flow, support contact).
- [ ] Add Community Rules that prohibit real-money betting behavior through platform tooling.
- [ ] Publish organizer policy: no rake, no payout handling, no in-app fund transfers.
- [ ] Prepare App Store reviewer notes with explicit non-gambling constraints.
- [ ] Prepare Google Play policy declarations and age-rating metadata.
- [ ] Run legal review for first launch jurisdictions and keep written counsel summary.

## 2) Core monetization and entitlements (P0)

- [ ] Define SKU IDs for organizer plans (`club_basic`, `club_pro`, `club_network`) and add-ons.
- [ ] Add entitlement matrix (feature flags by plan tier) in backend config.
- [ ] Add billing lifecycle states (`trial`, `active`, `grace`, `past_due`, `cancelled`) where needed.
- [ ] Implement idempotent webhook processing for every billing provider event.
- [ ] Add plan upgrade/downgrade rules and limits for prorated periods.
- [ ] Add invoice history endpoint for organizer accounts.
- [ ] Add retry/dunning notifications for failed recurring payments.

## 3) Database and data integrity (P0)

- [ ] Apply migrations in staging, then production with maintenance SOP.
- [ ] Add data constraints for unique club membership roles and ownership consistency.
- [ ] Add usage counters for active tables and members by billing cycle.
- [ ] Add automated daily integrity check job (dangling memberships, invalid roles, over-limit clubs).
- [ ] Add archival strategy for inactive clubs and closed private tables.

## 4) Backend API hardening (P0)

- [ ] Add RBAC middleware helper shared by all club routes.
- [ ] Add request idempotency keys for paid and provisioning endpoints.
- [ ] Add stricter validation for invite flows and rate-limit abuse controls.
- [ ] Add API responses for entitlement overflow (`402`/`409` with clear reason codes).
- [ ] Add admin endpoints for moderation actions and compliance event review.
- [ ] Add contract tests for all `/clubs/*` routes.

## 5) Realtime and game-session integration (P0)

- [ ] Add club/table authorization checks into Socket.IO join flow.
- [ ] Add server guards for non-cash chip economy invariants.
- [ ] Add private table lifecycle transitions (`scheduled -> live -> closed`) with audit.
- [ ] Add reconnect behavior for private tables with role checks.
- [ ] Add load-shedding strategy for websocket burst traffic.

## 6) Web and mobile product UX (P0/P1)

- [ ] Build organizer onboarding flow (`create club -> choose plan -> create table`).
- [ ] Build members/roles management UI for owners/admins.
- [ ] Build plan limits and usage meter UI.
- [ ] Add private club invite acceptance flow (deep links on mobile).
- [ ] Add clear legal notice in billing and table creation screens.
- [ ] Add graceful downgrade UX when plan expires (read-only mode for club config).

## 7) Security and abuse prevention (P0)

- [ ] Enable strict secret management (no secrets in repo or logs).
- [ ] Enable webhook signature verification and replay attack protection.
- [ ] Add per-user/per-club rate limits for critical actions.
- [ ] Add suspicious pattern detection (bot invites, table spam, role abuse).
- [ ] Add moderation queue and alerting for high-risk compliance events.
- [ ] Add periodic dependency vulnerability scanning in CI.

## 8) Observability and operations (P0)

- [ ] Define SLOs (API p95 latency, socket uptime, billing success).
- [ ] Add dashboards: API health, websocket health, billing events, active clubs.
- [ ] Add alerts for payment webhook failures and entitlement drift.
- [ ] Add structured logs with correlation IDs across HTTP and sockets.
- [ ] Add backup/restore runbook and perform restore drill in staging.
- [ ] Add incident response playbook and ownership rotation.

## 9) QA and release process (P0)

- [ ] Add unit tests for plan-limit enforcement and RBAC checks.
- [ ] Add integration tests for webhook to entitlement pipeline.
- [ ] Add E2E tests for organizer onboarding and private table creation.
- [ ] Add regression tests for auth, lobby, subscriptions, and socket gameplay.
- [ ] Add release checklist gate in CI (tests, lint, migration check, env check).
- [ ] Add canary rollout and rollback procedure.

## 10) Commercial readiness (P1)

- [ ] Finalize pricing experiments and A/B matrix.
- [ ] Add churn instrumentation and cancellation reason capture.
- [ ] Add referral or partner code system for organizer acquisition.
- [ ] Add customer support macros and SLA policy by plan tier.
- [ ] Add monthly KPI review cadence (`MRR`, `churn`, `ARPC`, `active clubs`).
