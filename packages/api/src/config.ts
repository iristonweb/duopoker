export const config = {
  allowSoloQueue: process.env.ALLOW_SOLO_QUEUE === 'true',
  mockCheckout: process.env.MOCK_CHECKOUT === 'true',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-jwt-refresh-secret',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  stripePriceSilver: process.env.STRIPE_PRICE_SILVER ?? '',
  stripePriceGold: process.env.STRIPE_PRICE_GOLD ?? '',
  stripePricePlatinum: process.env.STRIPE_PRICE_PLATINUM ?? '',
  stripePriceRoyal: process.env.STRIPE_PRICE_ROYAL ?? '',
  publicWebUrl:
    process.env.PUBLIC_WEB_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'),
  livekitApiKey: process.env.LIVEKIT_API_KEY ?? '',
  livekitApiSecret: process.env.LIVEKIT_API_SECRET ?? '',
  livekitUrl: process.env.LIVEKIT_URL ?? ''
};
