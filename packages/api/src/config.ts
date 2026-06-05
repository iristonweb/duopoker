const DEV_JWT_SECRET = 'dev-jwt-secret';
const DEV_JWT_REFRESH_SECRET = 'dev-jwt-refresh-secret';

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

function requireSecret(name: string, value: string | undefined, devFallback: string): string {
  if (!value) {
    if (isProduction) {
      throw new Error(`${name} is required in production`);
    }
    return devFallback;
  }
  if (isProduction && value === devFallback) {
    throw new Error(`${name} must not use the development default in production`);
  }
  return value;
}

export const config = {
  isProduction,
  allowSoloQueue: process.env.ALLOW_SOLO_QUEUE === 'true',
  mockCheckout: process.env.MOCK_CHECKOUT === 'true',
  requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  emailFrom: process.env.EMAIL_FROM ?? 'DuoPoker <onboarding@resend.dev>',
  jwtSecret: requireSecret('JWT_SECRET', process.env.JWT_SECRET, DEV_JWT_SECRET),
  jwtRefreshSecret: requireSecret(
    'JWT_REFRESH_SECRET',
    process.env.JWT_REFRESH_SECRET,
    DEV_JWT_REFRESH_SECRET
  ),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  stripePriceSilver: process.env.STRIPE_PRICE_SILVER ?? '',
  stripePriceGold: process.env.STRIPE_PRICE_GOLD ?? '',
  stripePricePlatinum: process.env.STRIPE_PRICE_PLATINUM ?? '',
  stripePriceRoyal: process.env.STRIPE_PRICE_ROYAL ?? '',
  yookassaShopId: process.env.YOOKASSA_SHOP_ID ?? '',
  yookassaSecretKey: process.env.YOOKASSA_SECRET_KEY ?? '',
  publicWebUrl:
    process.env.PUBLIC_WEB_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'),
  livekitApiKey: process.env.LIVEKIT_API_KEY ?? '',
  livekitApiSecret: process.env.LIVEKIT_API_SECRET ?? '',
  livekitUrl: process.env.LIVEKIT_URL ?? ''
};
