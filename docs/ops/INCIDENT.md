# Incident response

## Severity

- **SEV1**: payments broken, auth down, data loss risk
- **SEV2**: clubs/tables degraded, chat down
- **SEV3**: cosmetic/admin issues

## Steps

1. Acknowledge in team channel (< 15 min SEV1)
2. Capture `x-correlation-id` from failing requests
3. Check Vercel deploy status, Neon health, webhook `PaymentEvent` failures
4. Mitigate: rollback deploy (`RELEASE.md`) or disable feature flag
5. Postmortem within 48h for SEV1/SEV2

## Owners

- API: backend on-call
- Billing: monetization owner
- Legal/compliance: product lead
