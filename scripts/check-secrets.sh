#!/usr/bin/env bash
# Pre-commit: block obvious secrets in staged files
set -euo pipefail
if command -v node >/dev/null 2>&1; then
  node scripts/check-secrets.mjs
  exit $?
fi
STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep -vE '^(dist/|node_modules/|scripts/check-secrets\.(sh|mjs)|\.env\.example|\.env\.vercel\.example|.*/\.env\.example)' || true)
if [ -z "$STAGED" ]; then exit 0; fi
if echo "$STAGED" | xargs grep -lE '(sk_live_|sk_test_|AKIA[0-9A-Z]{16}|BEGIN (RSA |OPENSSH )?PRIVATE KEY|postgresql://[^:@]+:npg_|VAPID_PRIVATE_KEY=[A-Za-z0-9_-]{20,}|JWT_(REFRESH_)?SECRET=[0-9a-fA-F]{32,})' 2>/dev/null; then
  echo "Possible secret in staged files — remove before commit"
  exit 1
fi
