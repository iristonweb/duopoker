const splitOrigins = (raw?: string): string[] | true => {
  if (!raw?.trim()) return true;
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : true;
};

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-jwt-refresh-secret',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6380',
  mongoUrl: process.env.MONGO_URL ?? 'mongodb://localhost:27017',
  mongoDbName: process.env.MONGO_DB ?? 'duopoker',
  oauthGoogleEnabled: process.env.OAUTH_GOOGLE_ENABLED === 'true',
  oauthAppleEnabled: process.env.OAUTH_APPLE_ENABLED === 'true',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  /** Optional Stripe Price IDs for subscriptions (Dashboard → Products → Price ID) */
  stripePriceSilver: process.env.STRIPE_PRICE_SILVER ?? '',
  stripePriceGold: process.env.STRIPE_PRICE_GOLD ?? '',
  stripePricePlatinum: process.env.STRIPE_PRICE_PLATINUM ?? '',
  stripePriceRoyal: process.env.STRIPE_PRICE_ROYAL ?? '',
  publicWebUrl: process.env.PUBLIC_WEB_URL ?? 'http://localhost:5173',
  /** Comma-separated list, e.g. https://app.example.com,https://www.example.com */
  corsOrigin: splitOrigins(process.env.CORS_ORIGIN ?? process.env.PUBLIC_WEB_URL),
};
