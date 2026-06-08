# App Store Review Notes — DuoPoker

**App name:** DuoPoker (DP CLUB · Duo Poker Club)  
**Bundle ID:** _[TBD — e.g. `ru.duopoker.app`]_  
**Primary website:** https://duopoker.ru  
**Last updated:** 2026-06-08  
**Document owner:** Product / Compliance

---

## Summary for reviewers

DuoPoker is a **social play-money poker entertainment app**. Users play Texas Hold'em and Joker poker using **virtual chips only**. The app does **not** offer real-money gambling, wagering, cash prizes, or any mechanism to withdraw or exchange virtual currency for fiat currency.

Monetization is limited to:

- **In-app purchases** of virtual chip packs (entertainment currency with no cash value)
- **Cosmetic subscriptions** (DP CLUB tiers: table themes, avatars, visual perks)
- **Organizer subscriptions** (club administration tools: member limits, moderation, private table hosting — SaaS-style features, not game outcomes)

There is **no rake**, **no cashout**, and **no peer-to-peer money transfer** functionality in the product.

---

## Классификация приложения / App classification

| Field | Value |
|-------|-------|
| Primary category | Games |
| Subcategory | Card / Casino-style (simulated) |
| Gambling | **No** — simulated play-money only |
| Age rating | **18+** (recommended: Mature 17+ minimum; confirm with counsel for target markets) |
| Unrestricted web access | Yes (PWA companion at duopoker.ru) |
| Made for Kids | No |

Apple Guideline **5.3.4** (real-money gaming) does **not** apply: no real currency is wagered and no real prizes are awarded. The app should be reviewed as a **simulated casino / card game** with consumable and subscription IAP, not as a gambling product.

---

## Play-money model (non-gambling)

### Virtual chips

- All table stakes use in-app **virtual chips** (`chips` balance on the user account).
- Chips are granted free on registration and may be purchased as optional packs.
- Chips **cannot** be:
  - Withdrawn or cashed out
  - Exchanged for fiat currency
  - Transferred between users for monetary value
  - Redeemed for physical goods or gift cards

### Game outcomes

- Winning or losing chips affects only the user's virtual balance for entertainment purposes.
- No paid feature alters odds, hand outcomes, or RNG fairness.

### Organizer (club) subscriptions

Paid club plans (`BASIC`, `PRO`, `NETWORK`) unlock **organizer tooling only**:

- Higher member and active-table limits
- Invite and moderation controls
- Club branding and scheduling utilities

These subscriptions do **not** purchase better odds, guaranteed wins, or any form of prize payout.

---

## In-app purchases

| SKU type | Examples | Purpose |
|----------|----------|---------|
| Consumable | Chip packs | Replenish virtual play-money balance |
| Auto-renewable subscription | DP CLUB Silver / Gold / Platinum / Royal | Cosmetic perks and table visuals |
| Auto-renewable subscription | Club organizer plans | Private club administration features |

All IAP is processed through **Apple In-App Purchase** (via RevenueCat integration on mobile). Web billing (Stripe / YooKassa) is separate and not required to complete App Review.

Restore Purchases is available in account/settings.

---

## Sign in and account

- **Sign in with Apple** — supported (required if other third-party login is offered)
- **Sign in with Google** — supported
- Email + password registration — supported

Accounts sync across Web (PWA), iOS, and Android under a single user profile.

---

## Тестовый аккаунт / Demo account for review

> **Placeholder — fill before submission.**

| Field | Value |
|-------|-------|
| Email | `reviewer+ios@duopoker.ru` |
| Password | `[SET BEFORE SUBMISSION]` |
| Notes | Account is pre-loaded with virtual chips. No payment required to play public tables. |

### Review walkthrough

1. Launch the app and sign in with the credentials above (or use Sign in with Apple on a sandbox tester).
2. From the lobby, join a **public play-money table** (Texas Hold'em or Joker).
3. Play a few hands — all actions use virtual chips only.
4. Open **Shop / DP CLUB** to view cosmetic subscriptions (sandbox IAP).
5. Open **Clubs** to view organizer features (a demo club may be pre-provisioned).
6. Visit **Settings → Legal** for in-app Terms of Use and Privacy Policy links.

No real payment is required to evaluate core gameplay.

---

## Age restriction (18+)

DuoPoker is intended for users **18 years of age or older**.

Rationale:

- Poker-themed gameplay and simulated casino presentation
- In-app purchases and subscriptions
- User-generated display names and club chat (where enabled)
- Compliance with Russian Federation and general international age-gating practice for simulated gambling-style content

Age gate / date-of-birth confirmation should be shown at registration. App Store age rating metadata must reflect 18+ or the highest applicable tier after legal review.

---

## Content and moderation

- **User-generated content:** display names, club names, optional chat
- **Moderation:** club-level moderator roles; platform admin tools for abuse reports
- **Prohibited use:** real-money side betting, arranging off-platform payouts, harassment (see Community Rules)

Report a concern: _[support email TBD — e.g. `support@duopoker.ru`]_

---

## Privacy and data

- Privacy Policy URL: https://duopoker.ru/legal/privacy _(or in-app equivalent)_
- Data collected: account identifiers, gameplay events, payment metadata (via Apple IAP / RevenueCat)
- Account deletion: available on request (see Privacy Policy — deletion flow)
- No sale of personal data

---

## Regional notes

- **Primary jurisdiction:** Russian Federation (RU)
- Play-money positioning is consistent across regions
- Real-money gambling licenses are **not** held and **not** required for this product category

---

## Reviewer FAQ

**Q: Is this real gambling?**  
A: No. All poker is play-money. Virtual chips have no cash value and cannot be withdrawn.

**Q: Can users win real money?**  
A: No. There are no cash prizes, gift cards, or convertible rewards.

**Q: What do subscriptions pay for?**  
A: Cosmetics (visual themes) and club organizer tools (hosting limits, moderation). Not game outcomes.

**Q: Does the app facilitate betting between users?**  
A: No. The platform prohibits real-money side arrangements and provides no P2P transfer or cashout APIs.

**Q: Why 18+?**  
A: Poker-themed simulated gaming with IAP; age gate enforced at registration.

---

## Pre-submission checklist

- [ ] Demo account credentials inserted above
- [ ] Bundle ID and version confirmed in App Store Connect
- [ ] Age rating questionnaire completed (gambling = simulated / none)
- [ ] IAP products created and approved in App Store Connect (sandbox tested)
- [ ] Sign in with Apple enabled and tested
- [ ] Privacy Policy and Terms URLs live and linked in-app
- [ ] App Review notes pasted into App Store Connect "Notes" field
- [ ] Screenshots show play-money disclaimers where applicable

---

## Contact

**App Review support:** _[name / email TBD]_  
**Response SLA:** Within 24 hours during business days (MSK)
