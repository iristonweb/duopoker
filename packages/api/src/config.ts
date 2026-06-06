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

const splitOrigins = (raw?: string): string[] => {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
};

const defaultPublicWebUrl = (
  process.env.PUBLIC_WEB_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173')
).replace(/\/$/, '');

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
  stripePriceBronze: process.env.STRIPE_PRICE_BRONZE ?? '',
  stripePriceSilver: process.env.STRIPE_PRICE_SILVER ?? '',
  stripePriceGold: process.env.STRIPE_PRICE_GOLD ?? '',
  stripePricePlatinum: process.env.STRIPE_PRICE_PLATINUM ?? '',
  stripePriceDiamond: process.env.STRIPE_PRICE_DIAMOND ?? '',
  stripePriceBlack: process.env.STRIPE_PRICE_BLACK ?? '',
  yookassaShopId: process.env.YOOKASSA_SHOP_ID ?? '',
  yookassaSecretKey: process.env.YOOKASSA_SECRET_KEY ?? '',
  publicWebUrl: defaultPublicWebUrl,
  corsOrigins: (() => {
    const fromEnv = splitOrigins(process.env.CORS_ORIGIN?.trim());
    const primary = defaultPublicWebUrl;
    const merged = new Set([primary, ...fromEnv]);
    merged.add('http://localhost:5180');
    merged.add('http://localhost:5173');
    if (process.env.VERCEL_URL) {
      merged.add(`https://${process.env.VERCEL_URL}`.replace(/\/$/, ''));
    }
    return [...merged];
  })(),
  livekitApiKey: process.env.LIVEKIT_API_KEY ?? '',
  livekitApiSecret: process.env.LIVEKIT_API_SECRET ?? '',
  livekitUrl: process.env.LIVEKIT_URL ?? '',
  dataEncryptionKey: process.env.DATA_ENCRYPTION_KEY?.trim() ?? '',
  dailyBonusChips: 500,
  founderGrantSecret: process.env.FOUNDER_GRANT_SECRET?.trim() ?? '',
  founderEmail: (process.env.FOUNDER_EMAIL?.trim() || 'iristonweb@gmail.com').toLowerCase(),
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY?.trim() ?? '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY?.trim() ?? '',
  vapidSubject: process.env.VAPID_SUBJECT?.trim() || 'mailto:support@duopoker.app',
  backendInternalUrl: process.env.BACKEND_INTERNAL_URL?.trim() ?? (isProduction ? '' : 'http://localhost:4000'),
  notifyInternalSecret: process.env.NOTIFY_INTERNAL_SECRET?.trim() ?? (isProduction ? '' : 'dev-notify-secret')
};

export const allowDevMockCheckout = (): boolean =>
  !config.isProduction && (config.mockCheckout || !config.stripeSecretKey);
