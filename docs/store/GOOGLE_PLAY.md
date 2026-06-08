# Google Play Store Declarations — DuoPoker

**App name:** DuoPoker (DP CLUB · Duo Poker Club)  
**Package name:** _[TBD — e.g. `ru.duopoker.app`]_  
**Primary website:** https://duopoker.ru  
**Last updated:** 2026-06-08  
**Document owner:** Product / Compliance

---

## Product summary

DuoPoker is a cross-platform **play-money poker** entertainment product. Users play Texas Hold'em and Joker using **virtual chips** with **no real-money gambling**, **no cashout**, and **no peer-to-peer monetary transfers**.

Monetization uses **Google Play Billing** for:

- Virtual chip packs (consumables)
- DP CLUB cosmetic subscriptions (auto-renewing)
- Club organizer plan subscriptions (auto-renewing — SaaS tooling only)

---

## Gambling and simulated gambling policy

### Declaration: Simulated gambling — **Yes** (play-money only)

| Question | Answer | Notes |
|----------|--------|-------|
| Real-money gambling | **No** | No wagering of fiat currency |
| Simulated gambling | **Yes** | Poker gameplay with virtual chips |
| Cash prizes | **No** | Virtual chips only; no withdrawal |
| Prizes with real-world value | **No** | Cosmetics are visual; no gift cards |
| Skill-based real-money contests | **No** | Not applicable |

### Policy alignment

Under [Google Play Real-Money Gambling, Games, and Contests](https://support.google.com/googleplay/android-developer/answer/9877032) policy:

- DuoPoker is **not** a real-money gambling app and does **not** require a gambling license.
- The app falls under **simulated gambling** (social casino / play-money card games).
- Virtual currency:
  - Is purchased optionally via IAP
  - Has **no real-world monetary value**
  - **Cannot** be redeemed, transferred for value, or cashed out
- Paid features do **not** affect game odds or outcomes.

### In-app disclaimers

The following must appear in the app (lobby, shop, club flows) and in store listing where space allows:

> Play-money only. Virtual chips cannot be cashed out. No real-money gambling.

Russian (primary market):

> Только игровые фишки. Вывод средств невозможен. Без азартных игр на реальные деньги.

---

## Age rating (IARC / content rating questionnaire)

| Content type | Rating guidance |
|--------------|-----------------|
| Simulated gambling | Present — play-money poker |
| Real gambling | None |
| User interaction | Users can interact (clubs, display names) |
| Shares location | No |
| Unrestricted internet | Yes (PWA / API) |

**Target rating:** PEGI 18 / ESBR Mature / **18+** — confirm final rating with IARC questionnaire answers.

Registration must include age verification (18+) at sign-up.

---

## In-app purchases and subscriptions

### IAP categories

| Product type | Play Billing type | Examples | Real-world value |
|--------------|-------------------|----------|------------------|
| Chip packs | Consumable (in-app product) | Starter, Standard, Mega packs | No — entertainment currency |
| DP CLUB cosmetics | Subscription | Silver, Gold, Platinum, Royal | No — visual perks only |
| Club organizer plans | Subscription | BASIC, PRO, NETWORK | No — admin tooling only |

### Subscriptions — key declarations

- Subscriptions auto-renew unless cancelled
- Users can manage/cancel via Google Play → Subscriptions
- **Restore purchases** supported in-app
- Organizer subscriptions unlock **platform features** (member limits, moderation, table caps) — **not** game winnings or odds

### Billing integration

- Mobile: Google Play Billing Library + RevenueCat (or direct Play Billing)
- Web: Stripe / YooKassa (separate from Play; no circumvention of Play Billing for digital goods on Android)

---

## Data safety section

> **Placeholder — complete in Google Play Console Data safety form before release.**  
> Align answers with the published Privacy Policy and actual SDK/data collection.

### Summary for Play Console form

| Data type | Collected | Shared | Purpose | Optional |
|-----------|-----------|--------|---------|----------|
| Email address | Yes | No | Account authentication | No |
| User IDs | Yes | No | Account, gameplay | No |
| Name / display name | Yes | No | Profile, clubs | Yes (user-provided) |
| Purchase history | Yes | With payment processors only | Billing, support | No |
| App interactions (gameplay events) | Yes | No | Game state, matchmaking | No |
| Crash logs | If Sentry enabled | With Sentry | Stability | Config-dependent |
| Device identifiers | Minimal | No | Session security | No |

### Security practices (declared)

- Data encrypted in transit (TLS)
- Users can request account deletion
- Data deletion process documented in Privacy Policy

### Data not collected

- Precise location
- Photos / videos (unless avatar upload added later — update form)
- Financial info beyond payment tokens handled by Google Play
- Health data
- Political or religious beliefs

### Third-party SDKs (verify before submission)

| SDK | Data | Purpose |
|-----|------|---------|
| Google Play Billing | Purchase tokens | IAP |
| RevenueCat | Purchase history, app user ID | Subscription management |
| Firebase / Analytics | _[TBD if enabled]_ | _[TBD]_ |
| Sentry | Crash data, device info | Error reporting |

**Privacy Policy URL:** https://duopoker.ru/legal/privacy  
**Data deletion request:** _[support email TBD — e.g. `privacy@duopoker.ru`]_

---

## Store listing content

### Short description (80 chars max) — draft

```
Premium play-money poker — Hold'em & Joker. Virtual chips, no real gambling.
```

### Full description — key points

- Social play-money poker: Texas Hold'em and Joker
- Virtual chips only — no cashout, no real-money prizes
- DP CLUB cosmetics and premium table themes
- Private clubs with organizer tools for friends and communities
- Cross-platform account (Web + Android + iOS)

### Category

- **Application type:** Game
- **Category:** Card
- **Tags:** Poker, Card, Multiplayer, Social

---

## Permissions justification

| Permission | Reason |
|------------|--------|
| `INTERNET` | API, gameplay sync, auth |
| `ACCESS_NETWORK_STATE` | Connectivity checks |
| `POST_NOTIFICATIONS` | Match invites, club alerts (if enabled) |
| `RECORD_AUDIO` | Voice at table (if feature shipped — otherwise omit) |
| `BILLING` | In-app purchases |

Remove any permission not used by the shipping build.

---

## Target audience and ads

| Setting | Value |
|---------|-------|
| Target age group | 18 and older |
| Designed for families / children | **No** |
| Contains ads | _[TBD — No if ad-free]_ |
| Ads policy | N/A if no ads; if ads added, must not promote real-money gambling |

---

## Geographic distribution

| Region | Status | Notes |
|--------|--------|-------|
| Russia (RU) | Primary launch | RUB pricing; YooKassa on web |
| CIS / nearby | _[TBD]_ | Legal review per country |
| EU / UK | _[TBD]_ | GDPR, data safety accuracy |
| US | _[TBD]_ | Simulated gambling generally permitted; confirm state nuances |

Exclude countries where simulated gambling or IAP model requires local counsel clearance.

---

## Policy declarations checklist (Play Console)

### App content

- [ ] Privacy policy URL live
- [ ] Ads declaration completed
- [ ] App access — provide test credentials (see below)
- [ ] Content ratings (IARC) — simulated gambling disclosed
- [ ] Target audience — not designed for children
- [ ] Data safety form completed and matches Privacy Policy
- [ ] Government apps — No
- [ ] Financial features — No (no banking, loans, crypto trading)
- [ ] Health — No
- [ ] **Gambling apps** — Simulated gambling only; not a licensed gambling app

### Monetization

- [ ] All digital goods use Google Play Billing on Android
- [ ] Subscription terms and cancellation info in-app
- [ ] No misleading claims about winning real money

---

## Тестовый доступ / Reviewer test access

> **Placeholder — fill before submission.**

| Field | Value |
|-------|-------|
| Email | `reviewer+android@duopoker.ru` |
| Password | `[SET BEFORE SUBMISSION]` |
| License testers | Add Google account emails in Play Console |

Instructions for reviewers: sign in → lobby → join public table → optional Shop/Clubs tour. No payment required for core gameplay.

---

## Legal cross-references

| Document | Location |
|----------|----------|
| Terms of Use | `/legal/terms` (in-app and web) |
| Privacy Policy | `/legal/privacy` |
| Community Rules | _[TBD — `/legal/community`]_ |
| Organizer Policy | Embedded in Terms; see `docs/legal/REVIEW_CHECKLIST.md` |

---

## Pre-launch verification

- [ ] Internal test track build uploaded and smoke-tested
- [ ] Closed test with Play Billing license testers
- [ ] Data safety form reviewed against actual telemetry
- [ ] Store listing screenshots include play-money disclaimer
- [ ] Simulated gambling declaration matches app behavior
- [ ] Account deletion flow tested end-to-end
- [ ] Open testing / production rollout plan approved

---

## Contact

**Play policy / compliance:** _[email TBD]_  
**Developer support:** _[email TBD]_
