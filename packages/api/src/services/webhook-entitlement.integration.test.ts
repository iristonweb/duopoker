import { describe, expect, it } from 'vitest';
import { claimWebhookEvent, stripeEventClaimId } from './webhook-dedup.js';
import { handleRevenueCatWebhook, type RevenueCatWebhookPayload } from './revenuecat-webhook.js';

describe('webhook entitlement pipeline', () => {
  it('exports dedup helpers', () => {
    expect(stripeEventClaimId('evt_1')).toBe('stripe:event:evt_1');
    expect(typeof claimWebhookEvent).toBe('function');
  });
});

describe('revenuecat webhook pipeline', () => {
  it('exports handler for entitlement sync', () => {
    expect(typeof handleRevenueCatWebhook).toBe('function');
    const sample: RevenueCatWebhookPayload = {
      event: {
        id: 'evt_test',
        type: 'TEST',
        app_user_id: 'user_1'
      }
    };
    expect(sample.event.id).toBe('evt_test');
  });
});
