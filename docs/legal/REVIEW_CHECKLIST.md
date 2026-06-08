# Legal Review Checklist — DuoPoker

**Product:** DuoPoker (DP CLUB · Duo Poker Club)  
**Website:** https://duopoker.ru  
**Positioning:** Social play-money poker + organizer SaaS (club administration tools)  
**Primary jurisdiction:** Russian Federation (RU)  
**Last updated:** 2026-06-08  
**Prepared for:** External counsel review prior to public launch

---

## Purpose

This checklist guides legal counsel through DuoPoker's compliance posture. The product is **not** real-money gambling. Counsel should verify that all customer-facing documents, store submissions, and operational flows are consistent with that positioning under applicable law in the launch jurisdictions.

---

## Executive summary for counsel

| Topic | Product stance |
|-------|----------------|
| Real-money gambling | **Not offered** |
| Virtual currency | Play-money chips; no cashout or fiat exchange |
| Monetization | IAP: chip packs, cosmetic subscriptions, organizer plan subscriptions |
| Organizer fees | SaaS-style club tools only — not game outcomes or prizes |
| Rake / house take from pots | **Not supported** |
| P2P money transfers | **Not supported** |
| Target users | 18+ |
| Primary market | Russia (RU); expansion TBD |

---

## 1. Terms of Service (Пользовательское соглашение)

**Current draft location:** `apps/web/src/routes/LegalTerms.tsx` → `/legal/terms`  
**Status:** ☐ Draft ☐ Counsel review ☐ Approved ☐ Published

### Counsel should verify

- [ ] Clear statement that DuoPoker is entertainment-only play-money poker
- [ ] Virtual chips defined; explicit **no cash value**, **no withdrawal**, **no exchange for fiat**
- [ ] Minimum age requirement stated (18+ or jurisdiction-specific higher threshold)
- [ ] Account suspension/termination grounds (fraud, real-money side betting, abuse)
- [ ] Limitation of liability and disclaimer of warranties appropriate for RU consumer law
- [ ] Governing law and dispute resolution (RU jurisdiction per launch plan)
- [ ] Modification notice mechanism for terms updates
- [ ] IP ownership (software, branding DP CLUB / DuoPoker)
- [ ] Prohibition on using the platform to arrange off-platform real-money gambling
- [ ] Cross-reference to Privacy Policy, Community Rules, and Organizer Policy

### Open questions for counsel

| # | Question | Counsel notes |
|---|----------|---------------|
| 1 | Is 18+ sufficient for RU, or is a higher age or licensing reference required for simulated poker? | |
| 2 | Are standard limitation-of-liability clauses enforceable for B2C in RU? | |
| 3 | Required consumer withdrawal/cooling-off rights for digital subscriptions (DP CLUB, organizer plans)? | |

---

## 2. Privacy Policy (Политика конфиденциальности)

**Current draft location:** `apps/web/src/routes/LegalPrivacy.tsx` → `/legal/privacy`  
**Status:** ☐ Draft ☐ Counsel review ☐ Approved ☐ Published

### Counsel should verify

- [ ] Identity of data controller (legal entity name, address, contact)
- [ ] Categories of personal data collected (account, gameplay, payment metadata, device/session)
- [ ] Legal bases for processing under applicable law (contract, consent, legitimate interest)
- [ ] Third-party processors listed (Stripe, YooKassa, Apple, Google, RevenueCat, hosting, Sentry if enabled)
- [ ] International data transfers (if any) and safeguards
- [ ] Retention periods per data category
- [ ] User rights: access, correction, deletion, objection, portability (as applicable)
- [ ] **Account deletion flow** documented and technically implementable (see Section 5)
- [ ] Cookie / analytics disclosure if web tracking is used
- [ ] Children's privacy — service not directed at under-18 users
- [ ] Contact for privacy requests (`privacy@` or DPO if required)
- [ ] Alignment with Google Play Data safety and Apple App Privacy labels

### RU-specific (152-FZ)

- [ ] Localization requirements for RU users if mandated
- [ ] Data localization / storage jurisdiction for RU personal data
- [ ] Notification to Roskomnadzor if required for operator classification

---

## 3. Community Rules (Правила сообщества)

**Current draft location:** _[TBD — planned `/legal/community`]_  
**Status:** ☐ Not drafted ☐ Draft ☐ Counsel review ☐ Approved ☐ Published

### Counsel should verify

- [ ] Prohibition of harassment, hate speech, illegal content
- [ ] Prohibition of **real-money betting** arranged through or alongside platform use
- [ ] Prohibition of chip selling / account trading for real money
- [ ] Moderation rights and appeal process
- [ ] Consequences: warnings, suspension, permanent ban
- [ ] UGC policy (display names, club names, chat if enabled)
- [ ] Reporting mechanism and response SLA
- [ ] Consistency with Terms enforcement provisions

---

## 4. Organizer Policy (Политика организатора клубов)

**Current draft location:** Embedded in Terms (`LegalTerms.tsx` — Organizer policy section); full standalone doc _[TBD]_  
**Status:** ☐ Draft ☐ Counsel review ☐ Approved ☐ Published

### Product facts for counsel

Organizer subscriptions (`BASIC`, `PRO`, `NETWORK`) unlock **platform tooling**:

- Member and active-table limits
- Invite links and role management (moderator, member)
- Club branding and scheduling utilities
- Compliance event logging for moderation audit

They do **not**:

- Purchase favorable odds or outcomes
- Enable rake collection through the platform
- Process payouts or prizes to members
- Facilitate peer-to-peer fund transfers

### Counsel should verify

- [ ] Subscription is clearly characterized as **SaaS / platform services**, not gambling operator services
- [ ] Organizer is not licensed as a gambling operator solely by paying for club tools
- [ ] Organizer liability for member conduct and off-platform arrangements addressed
- [ ] No implied agency between DuoPoker and club organizers regarding member funds
- [ ] Refund/cancellation terms for organizer plans (YooKassa, Stripe, mobile IAP)
- [ ] Plan tier limits accurately described in marketing and checkout
- [ ] Tax/VAT treatment of organizer subscription fees in RU

### Open questions for counsel

| # | Question | Counsel notes |
|---|----------|---------------|
| 1 | Does enabling private poker clubs for organizers trigger gambling-adjacent licensing in RU when all play is virtual? | |
| 2 | Are organizer terms sufficient to disclaim liability for user-run side betting? | |

---

## 5. Account and data deletion flow (Удаление аккаунта и данных)

**Status:** ☐ Designed ☐ Implemented ☐ Counsel review ☐ Published in Privacy Policy

### Required user-facing commitments

- [ ] Clear instructions for requesting deletion (in-app and/or email)
- [ ] Identity verification step before deletion (prevent abuse)
- [ ] Scope of deletion defined: profile, gameplay history, club memberships, inventory
- [ ] Exceptions documented: billing records retained per legal/accounting requirements
- [ ] Timeline for completion (e.g. 30 days) stated
- [ ] Effect on active subscriptions (cancel via store first; no refund policy stated)

### Technical / operational checklist

- [ ] API or admin workflow exists to process deletion requests
- [ ] Redis sessions / device tokens invalidated
- [ ] Anonymization vs hard delete policy for analytics aggregates
- [ ] Backup retention and purge schedule documented
- [ ] Apple App Store and Google Play account deletion requirements met (if applicable)

### Deletion request template (for Privacy Policy)

```
To: privacy@duopoker.ru
Subject: Account deletion request
Body: Registered email, display name, confirmation that you understand deletion is irreversible.
```

---

## 6. Jurisdiction — Russian Federation (Юрисдикция: РФ)

**Primary launch market:** Russia  
**Status:** ☐ Counsel review ☐ Written opinion received

### Counsel should assess

- [ ] Applicability of Federal Law No. 244-FZ (gambling regulation) to **play-money** online poker
- [ ] Consumer protection (including subscription services and digital content)
- [ ] Personal data law (152-FZ) compliance
- [ ] Payment services: YooKassa / Stripe usage and merchant obligations
- [ ] Advertising restrictions for gambling-themed products (even play-money)
- [ ] Age verification requirements
- [ ] Tax obligations (VAT on digital services, subscription revenue)
- [ ] Terms governing law and venue (Russian courts / arbitration)
- [ ] Whether any product copy implies lottery, betting, or licensed gambling activity

### Expansion jurisdictions

| Region | Review status | Notes |
|--------|---------------|-------|
| RU | ☐ Pending | Primary |
| EU / GDPR | ☐ Pending | If distributed |
| US (state-level) | ☐ Pending | Simulated gambling varies by state |
| Other | ☐ N/A | |

---

## 7. Play-money disclaimer (Дисклеймер: только игровые фишки)

**Status:** ☐ Counsel review ☐ Approved wording ☐ Implemented in UI and store listings

### Approved disclaimer text — English (draft)

> **Play-money only.** DuoPoker is an entertainment product. Virtual chips have no real-world monetary value and cannot be withdrawn, exchanged for cash, or transferred for value. No real-money gambling is offered. Winning or losing chips does not result in financial gain or loss.

### Approved disclaimer text — Russian (draft)

> **Только игровые фишки.** DuoPoker — развлекательный продукт. Виртуальные фишки не имеют денежной стоимости, не подлежат выводу, обмену на реальные деньги или передаче за вознаграждение. Азартные игры на реальные деньги не предлагаются. Выигрыш или проигрыш фишек не влечёт финансовой прибыли или убытка.

### Placement checklist

- [ ] App / web lobby (visible without scrolling where feasible)
- [ ] Shop and checkout flows
- [ ] Club creation and organizer subscription checkout
- [ ] App Store and Google Play listings
- [ ] Terms of Service opening paragraph
- [ ] Registration / age gate screen

---

## 8. Monetization and payments

### Counsel should verify

| Revenue stream | Legal characterization | Reviewed |
|----------------|------------------------|----------|
| Virtual chip packs | Sale of digital entertainment currency (no cash value) | ☐ |
| DP CLUB cosmetic subscriptions | Digital content / subscription service | ☐ |
| Organizer plan subscriptions | SaaS / platform services | ☐ |
| Referral program (`docs/REFERRAL_PROGRAM.md`) | Marketing incentive; no cash gambling linkage | ☐ |

- [ ] Refund policy consistent across Stripe, YooKassa, Apple IAP, Google Play Billing
- [ ] No marketing language implying "win money" or "cash prizes"
- [ ] Loot box / randomized paid mechanics — **not present** (confirm)
- [ ] Price display in RUB compliant with local consumer rules

---

## 9. App store and platform compliance

| Document | Location | Counsel sign-off |
|----------|----------|------------------|
| App Store Review Notes | `docs/store/APP_STORE_REVIEW_NOTES.md` | ☐ |
| Google Play Declarations | `docs/store/GOOGLE_PLAY.md` | ☐ |
| Apple App Privacy nutrition labels | App Store Connect | ☐ |
| Google Play Data safety form | Play Console | ☐ |

Verify store submissions are **consistent** with Terms, Privacy Policy, and play-money disclaimers. Any inconsistency is a regulatory and platform-policy risk.

---

## 10. Operational compliance

- [ ] Know-your-product training for support staff (play-money positioning)
- [ ] Escalation path for reports of real-money side betting
- [ ] `compliance_events` audit trail reviewed for sufficiency (backend)
- [ ] Incident response plan for data breaches
- [ ] DMCA / copyright takedown process if UGC assets are user-uploaded
- [ ] Sanctions / restricted persons screening if required

---

## 11. Document inventory

| Document | Owner | Version | Last counsel review | Next review |
|----------|-------|---------|---------------------|-------------|
| Terms of Service | Legal / Product | _[TBD]_ | _[date]_ | _[date]_ |
| Privacy Policy | Legal / DPO | _[TBD]_ | _[date]_ | _[date]_ |
| Community Rules | Legal / Trust & Safety | _[TBD]_ | _[date]_ | _[date]_ |
| Organizer Policy | Legal / Product | _[TBD]_ | _[date]_ | _[date]_ |
| Cookie Policy | Legal | _[TBD]_ | _[date]_ | _[date]_ |
| Play-money disclaimer (EN/RU) | Legal / Marketing | _[TBD]_ | _[date]_ | _[date]_ |

---

## 12. Counsel deliverables

Upon completion of review, counsel should provide:

1. **Written opinion** on play-money classification under RU law (and any expansion markets reviewed)
2. **Redline or approval** of Terms, Privacy, Community Rules, and Organizer Policy
3. **Approved disclaimer wording** (EN + RU) for in-app and store use
4. **Deletion flow** sign-off aligned with 152-FZ and platform store requirements
5. **List of residual risks** and recommended mitigations before launch
6. **Go / no-go recommendation** for public release in RU

---

## 13. Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| General Counsel / External counsel | | | |
| Product lead | | | |
| Engineering lead | | | |
| Compliance / Trust & Safety | | | |

---

## Appendix A — Key technical facts (for counsel reference)

- Backend does **not** expose payout, cashout, or P2P transfer APIs (`docs/ARCHITECTURE.md`).
- Club actions generate `compliance_events` for moderation audit.
- Virtual `chips` balance is server-side; no blockchain or convertible token.
- Game modes: Texas Hold'em, Joker (play-money only).
- Auth: email/password, Google OAuth, Apple Sign In; JWT + device sessions.

## Appendix B — Related internal documents

- `docs/ARCHITECTURE.md` — compliance posture summary
- `docs/PRODUCTION_READINESS_TODO.md` — legal baseline P0 items
- `docs/store/APP_STORE_REVIEW_NOTES.md` — Apple submission notes
- `docs/store/GOOGLE_PLAY.md` — Google Play declarations
- `docs/REFERRAL_PROGRAM.md` — referral mechanics
- `packages/shared-types/src/brand.ts` — canonical brand strings
