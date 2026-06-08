# Monthly KPI cadence

| Metric | Source | Owner |
|--------|--------|-------|
| MRR (organizer + player subs) | `PaymentEvent`, Stripe/YooKassa | Finance |
| Active clubs | `Club` where `isArchived=false` | Product |
| Churn | cancelled `OrganizerSubscription` / month | Product |
| Referral signups | `Referral` table | Growth |

Template: fill first business day each month; review in ops standup.
