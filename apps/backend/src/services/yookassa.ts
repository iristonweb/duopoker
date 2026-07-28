import { config, allowDevMockCheckout } from '../config.js';
import { ORGANIZER_PLAN_PRICES_RUB } from './club-plans.js';
import { prisma } from './prisma.js';

type OrganizerTier = 'PRO' | 'NETWORK';

export type YooKassaPaymentResult = {
  paymentId: string;
  confirmationUrl: string;
};

const yookassaAuth = () => {
  const shopId = config.yookassaShopId;
  const secret = config.yookassaSecretKey;
  if (!shopId || !secret) return null;
  return `Basic ${Buffer.from(`${shopId}:${secret}`).toString('base64')}`;
};

export const createOrganizerPayment = async (opts: {
  clubId: string;
  ownerId: string;
  tier: OrganizerTier;
  returnUrl: string;
}): Promise<YooKassaPaymentResult> => {
  const amountRub = ORGANIZER_PLAN_PRICES_RUB[opts.tier];
  const idempotenceKey = `${opts.clubId}-${opts.tier}-${Date.now()}`;

  if (allowDevMockCheckout()) {
    const paymentId = `mock_yk_${idempotenceKey}`;
    await activateOrganizerPlan({
      clubId: opts.clubId,
      ownerId: opts.ownerId,
      tier: opts.tier,
      paymentId,
      amountRub
    });
    return {
      paymentId,
      confirmationUrl: `${opts.returnUrl}${opts.returnUrl.includes('?') ? '&' : '?'}checkout=mock&clubId=${opts.clubId}&tier=${opts.tier}`
    };
  }

  const auth = yookassaAuth();
  if (!auth) {
    throw new Error('YOOKASSA_NOT_CONFIGURED');
  }

  const res = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      'Idempotence-Key': idempotenceKey
    },
    body: JSON.stringify({
      amount: { value: amountRub.toFixed(2), currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: opts.returnUrl },
      description: `DuoPoker Club ${opts.tier} plan`,
      metadata: {
        clubId: opts.clubId,
        ownerId: opts.ownerId,
        tier: opts.tier,
        product: 'organizer_plan'
      }
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YooKassa error: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    id: string;
    confirmation?: { confirmation_url?: string };
  };

  return {
    paymentId: data.id,
    confirmationUrl: data.confirmation?.confirmation_url ?? opts.returnUrl
  };
};

export const activateOrganizerPlan = async (opts: {
  clubId: string;
  ownerId: string;
  tier: OrganizerTier;
  paymentId: string;
  amountRub: number;
}) => {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 32);

  await prisma.$transaction(async (tx) => {
    await tx.paymentEvent.upsert({
      where: { providerEventId: opts.paymentId },
      create: {
        userId: opts.ownerId,
        provider: 'YOOKASSA',
        providerEventId: opts.paymentId,
        status: 'SUCCEEDED',
        amount: opts.amountRub,
        currency: 'RUB',
        metadata: { clubId: opts.clubId, tier: opts.tier, product: 'organizer_plan' }
      },
      update: { status: 'SUCCEEDED' }
    });

    await tx.organizerSubscription.upsert({
      where: { clubId: opts.clubId },
      create: {
        clubId: opts.clubId,
        ownerId: opts.ownerId,
        tier: opts.tier,
        status: 'ACTIVE',
        billingProvider: 'YOOKASSA',
        providerPaymentId: opts.paymentId,
        expiresAt
      },
      update: {
        tier: opts.tier,
        status: 'ACTIVE',
        billingProvider: 'YOOKASSA',
        providerPaymentId: opts.paymentId,
        expiresAt
      }
    });

    await tx.complianceEvent.create({
      data: {
        clubId: opts.clubId,
        actorUserId: opts.ownerId,
        type: 'organizer.plan.activated',
        details: { tier: opts.tier, paymentId: opts.paymentId, amountRub: opts.amountRub }
      }
    });
  });
};

const fetchPaymentFromYooKassa = async (paymentId: string) => {
  const auth = yookassaAuth();
  if (!auth) return null;
  const res = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
    headers: { Authorization: auth }
  });
  if (!res.ok) return null;
  return (await res.json()) as {
    id: string;
    status: string;
    amount?: { value?: string; currency?: string };
    metadata?: Record<string, string>;
  };
};

export const handleYooKassaWebhook = async (payload: {
  event: string;
  object: {
    id: string;
    status: string;
    amount?: { value?: string; currency?: string };
    metadata?: Record<string, string>;
  };
}) => {
  if (payload.event !== 'payment.succeeded') return { handled: false as const };

  const paymentId = payload.object.id;
  const claimUserId =
    payload.object.metadata?.userId ??
    payload.object.metadata?.ownerId ??
    'yookassa-webhook';

  try {
    await prisma.paymentEvent.create({
      data: {
        userId: claimUserId,
        provider: 'YOOKASSA',
        providerEventId: paymentId,
        amount: 0,
        status: 'SUCCEEDED',
        metadata: { type: 'webhook_claim' }
      }
    });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'P2002') return { handled: true as const, duplicate: true };
    throw err;
  }

  const verified = await fetchPaymentFromYooKassa(paymentId);
  if (!verified || verified.status !== 'succeeded') {
    return { handled: false as const, reason: 'PAYMENT_NOT_VERIFIED' };
  }

  const payment = verified;
  const meta = payment.metadata ?? {};
  if (meta.product !== 'organizer_plan') return { handled: false as const };

  const clubId = meta.clubId;
  const ownerId = meta.ownerId;
  const tier = meta.tier as OrganizerTier | undefined;
  if (!clubId || !ownerId || !tier || (tier !== 'PRO' && tier !== 'NETWORK')) {
    return { handled: false as const, reason: 'INVALID_METADATA' };
  }

  const amountRub = Math.round(Number(payment.amount?.value ?? ORGANIZER_PLAN_PRICES_RUB[tier]));

  await activateOrganizerPlan({
    clubId,
    ownerId,
    tier,
    paymentId: payment.id,
    amountRub
  });

  return { handled: true as const };
};
