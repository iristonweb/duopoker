import { prisma } from '../lib/prisma.js';

type PaymentProvider = 'STRIPE' | 'APPLE_IAP' | 'GOOGLE_PLAY';

const isUniqueViolation = (err: unknown): boolean => {
  const code = (err as { code?: string })?.code;
  return code === 'P2002';
};

/** Returns true when this webhook event is new and claimed for processing. */
export const claimWebhookEvent = async (
  provider: PaymentProvider,
  providerEventId: string,
  userId: string,
  metadata?: Record<string, unknown>
): Promise<boolean> => {
  try {
    await prisma.paymentEvent.create({
      data: {
        userId,
        provider,
        providerEventId,
        amount: 0,
        status: 'SUCCEEDED',
        metadata: { type: 'webhook_claim', ...(metadata ?? {}) }
      }
    });
    return true;
  } catch (err) {
    if (isUniqueViolation(err)) return false;
    throw err;
  }
};

export const stripeEventClaimId = (eventId: string): string => `stripe:event:${eventId}`;
