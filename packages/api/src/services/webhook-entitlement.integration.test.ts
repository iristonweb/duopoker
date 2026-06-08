import { describe, expect, it } from 'vitest';
import { claimWebhookEvent, stripeEventClaimId } from './webhook-dedup.js';

describe('webhook entitlement pipeline', () => {
  it('exports dedup helpers', () => {
    expect(stripeEventClaimId('evt_1')).toBe('stripe:event:evt_1');
    expect(typeof claimWebhookEvent).toBe('function');
  });
});
