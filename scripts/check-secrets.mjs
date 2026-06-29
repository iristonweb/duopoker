#!/usr/bin/env node
/**
 * Pre-commit secret scan (cross-platform). Blocks obvious credentials in staged files.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ALLOW = /^(dist\/|node_modules\/|scripts\/check-secrets\.(sh|mjs)|\.env\.example|\.env\.vercel\.example|.*\/\.env\.example)/;

const PATTERNS = [
  { name: 'Stripe live/test secret', re: /sk_(live|test)_[0-9a-zA-Z]{16,}/ },
  { name: 'AWS access key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private key block', re: /BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY/ },
  { name: 'Neon DB password', re: /postgresql:\/\/[^\s:@]+:npg_[A-Za-z0-9]+@/ },
  { name: 'VAPID private key assignment', re: /VAPID_PRIVATE_KEY=[A-Za-z0-9_-]{20,}/ },
  { name: 'JWT secret assignment', re: /JWT_(REFRESH_)?SECRET=[0-9a-fA-F]{32,}/ },
  { name: 'Long hex secret assignment', re: /(NOTIFY_INTERNAL_SECRET|DATA_ENCRYPTION_KEY|FOUNDER_GRANT_SECRET)=[0-9a-fA-F]{32,}/ }
];

const staged = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' })
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean)
  .filter((f) => !ALLOW.test(f));

if (!staged.length) process.exit(0);

const hits = [];
for (const file of staged) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  for (const { name, re } of PATTERNS) {
    if (re.test(text)) hits.push({ file, name });
  }
}

if (hits.length) {
  console.error('Possible secret in staged files — remove before commit:\n');
  for (const h of hits) console.error(`  ${h.file}: ${h.name}`);
  process.exit(1);
}
