#!/usr/bin/env bash
# Pre-commit: block obvious secrets in staged files
set -euo pipefail
STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep -vE '^(dist/|node_modules/|scripts/check-secrets\.sh)' || true)
if [ -z "$STAGED" ]; then exit 0; fi
if echo "$STAGED" | xargs grep -lE '(sk_live_|sk_test_|AKIA[0-9A-Z]{16}|BEGIN (RSA |OPENSSH )?PRIVATE KEY)' 2>/dev/null; then
  echo "Possible secret in staged files — remove before commit"
  exit 1
fi
