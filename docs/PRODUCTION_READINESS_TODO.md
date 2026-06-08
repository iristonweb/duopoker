# DuoPoker Production Readiness TODO

This checklist targets a release-grade `Club SaaS + Play-Money` rollout (no real-money payouts).

## 1) Legal and policy baseline (P0)

- [x] Finalize Terms of Service for social play-money positioning.
- [x] Finalize Privacy Policy (data retention, deletion flow, support contact).
- [x] Add Community Rules that prohibit real-money betting behavior through platform tooling.
- [x] Publish organizer policy: no rake, no payout handling, no in-app fund transfers.
- [x] Prepare App Store reviewer notes with explicit non-gambling constraints.
- [x] Prepare Google Play policy declarations and age-rating metadata.
- [ ] Run legal review for first launch jurisdictions and keep written counsel summary. *(requires counsel — see `docs/legal/REVIEW_CHECKLIST.md`)*

## 2) Core monetization and entitlements (P0)

- [x] Define SKU IDs for organizer plans (`club_basic`, `club_pro`, `club_network`) and add-ons.
- [x] Add entitlement matrix (feature flags by plan tier) in backend config.
- [x] Add billing lifecycle states (`trial`, `active`, `grace`, `past_due`, `cancelled`) where needed.
- [x] Implement idempotent webhook processing for every billing provider event.
- [x] Add plan upgrade/downgrade rules and limits for prorated periods.
- [x] Add invoice history endpoint for organizer accounts.
- [x] Add retry/dunning notifications for failed recurring payments.

## 3) Database and data integrity (P0)

- [x] Apply migrations in staging, then production with maintenance SOP.
- [x] Add data constraints for unique club membership roles and ownership consistency.
- [x] Add usage counters for active tables and members by billing cycle.
- [x] Add automated daily integrity check job (dangling memberships, invalid roles, over-limit clubs).
- [x] Add archival strategy for inactive clubs and closed private tables.

## 4) Backend API hardening (P0)

- [x] Add RBAC middleware helper shared by all club routes.
- [x] Add request idempotency keys for paid and provisioning endpoints.
- [x] Add stricter validation for invite flows and rate-limit abuse controls.
- [x] Add API responses for entitlement overflow (`402`/`409` with clear reason codes).
- [x] Add admin endpoints for moderation actions and compliance event review.
- [x] Add contract tests for all `/clubs/*` routes.

## 5) Realtime and game-session integration (P0)

- [x] Add club/table authorization checks into Socket.IO join flow.
- [x] Add server guards for non-cash chip economy invariants.
- [x] Add private table lifecycle transitions (`scheduled -> live -> closed`) with audit.
- [x] Add reconnect behavior for private tables with role checks.
- [x] Add load-shedding strategy for websocket burst traffic.

## 6) Web and mobile product UX (P0/P1)

- [x] Build organizer onboarding flow (`create club -> choose plan -> create table`).
- [x] Build members/roles management UI for owners/admins.
- [x] Build plan limits and usage meter UI.
- [x] Add private club invite acceptance flow (deep links on mobile).
- [x] Add clear legal notice in billing and table creation screens.
- [x] Add graceful downgrade UX when plan expires (read-only mode for club config).

## 7) Security and abuse prevention (P0)

- [x] Enable strict secret management (no secrets in repo or logs).
- [x] Enable webhook signature verification and replay attack protection.
- [x] Add per-user/per-club rate limits for critical actions.
- [x] Add suspicious pattern detection (bot invites, table spam, role abuse).
- [x] Add moderation queue and alerting for high-risk compliance events.
- [x] Add periodic dependency vulnerability scanning in CI.

## 8) Observability and operations (P0)

- [x] Define SLOs (API p95 latency, socket uptime, billing success).
- [x] Add dashboards: API health, websocket health, billing events, active clubs.
- [x] Add alerts for payment webhook failures and entitlement drift.
- [x] Add structured logs with correlation IDs across HTTP and sockets.
- [x] Add backup/restore runbook and perform restore drill in staging.
- [x] Add incident response playbook and ownership rotation.

## 9) QA and release process (P0)

- [x] Add unit tests for plan-limit enforcement and RBAC checks.
- [x] Add integration tests for webhook to entitlement pipeline.
- [x] Add organizer E2E smoke test.
- [x] Add regression E2E in CI.
- [x] Add release gate (migration + integrity check).
- [x] Add canary/rollback documentation.

## 10) Commercial P1

- [x] Pricing A/B feature flag (`PRICING_VARIANT`).
- [x] Churn capture on subscription cancel (`POST /monetization/cancel-reason`).
- [x] Referral system documented in admin/support macros.
- [x] Support macros prepared.
- [x] KPI cadence template prepared.
