const DEV_JWT_SECRET = 'dev-jwt-secret';
const DEV_JWT_REFRESH_SECRET = 'dev-jwt-refresh-secret';

const isProduction = process.env.NODE_ENV === 'production';

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

const splitOrigins = (raw?: string): string[] | true => {
  if (!raw?.trim()) return true;
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : true;
};

export const config = {
  isProduction,
  /**
   * When true, a single player in matchmaking is paired with a server bot (duopoker-bot-*) for local practice.
   * Set to false in production if you only want human-vs-human queues.
   */
  allowSoloQueue: process.env.ALLOW_SOLO_QUEUE === 'true',
  /**
   * When true, POST /monetization/checkout-session returns a redirect URL without Stripe (local dev).
   */
  mockCheckout: process.env.MOCK_CHECKOUT === 'true',
  requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  emailFrom: process.env.EMAIL_FROM ?? 'DuoPoker <onboarding@resend.dev>',
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: requireSecret('JWT_SECRET', process.env.JWT_SECRET, DEV_JWT_SECRET),
  jwtRefreshSecret: requireSecret(
    'JWT_REFRESH_SECRET',
    process.env.JWT_REFRESH_SECRET,
    DEV_JWT_REFRESH_SECRET
  ),
  redisUrl: process.env.REDIS_URL ?? '',
  mongoUrl: process.env.MONGO_URL ?? 'mongodb://localhost:27017',
  mongoDbName: process.env.MONGO_DB ?? 'duopoker',
  oauthGoogleEnabled: process.env.OAUTH_GOOGLE_ENABLED === 'true',
  oauthAppleEnabled: process.env.OAUTH_APPLE_ENABLED === 'true',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  appleClientId: process.env.APPLE_CLIENT_ID ?? '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  /** Optional Stripe Price IDs for subscriptions (Dashboard → Products → Price ID) */
  stripePriceBronze: process.env.STRIPE_PRICE_BRONZE ?? '',
  stripePriceSilver: process.env.STRIPE_PRICE_SILVER ?? '',
  stripePriceGold: process.env.STRIPE_PRICE_GOLD ?? '',
  stripePricePlatinum: process.env.STRIPE_PRICE_PLATINUM ?? '',
  stripePriceDiamond: process.env.STRIPE_PRICE_DIAMOND ?? '',
  stripePriceBlack: process.env.STRIPE_PRICE_BLACK ?? '',
  yookassaShopId: process.env.YOOKASSA_SHOP_ID ?? '',
  yookassaSecretKey: process.env.YOOKASSA_SECRET_KEY ?? '',
  publicWebUrl: process.env.PUBLIC_WEB_URL ?? 'http://localhost:5173',
  /** Comma-separated list, e.g. https://app.example.com,https://www.example.com */
  corsOrigin: splitOrigins(process.env.CORS_ORIGIN ?? process.env.PUBLIC_WEB_URL),
  livekitApiKey: process.env.LIVEKIT_API_KEY ?? '',
  livekitApiSecret: process.env.LIVEKIT_API_SECRET ?? '',
  livekitUrl: process.env.LIVEKIT_URL ?? '',
  notifyInternalSecret: requireSecret(
    'NOTIFY_INTERNAL_SECRET',
    process.env.NOTIFY_INTERNAL_SECRET?.trim(),
    'dev-notify-secret'
  )
};
