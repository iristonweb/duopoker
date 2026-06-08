# Service level objectives

| Surface | Target | Measurement |
|---------|--------|-------------|
| API p95 latency | < 500 ms | Vercel/server logs, `x-correlation-id` |
| Table chat delivery | < 1 s | long-poll wait endpoint p95 |
| Socket uptime | 99.5% | external backend only |
| Billing webhook success | 99% | `PaymentEvent` SUCCEEDED vs FAILED |

Error budget: 0.5% monthly for API availability.
