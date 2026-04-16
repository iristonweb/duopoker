export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-jwt-refresh-secret',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  mongoUrl: process.env.MONGO_URL ?? 'mongodb://localhost:27017',
  mongoDbName: process.env.MONGO_DB ?? 'duopoker',
  oauthGoogleEnabled: process.env.OAUTH_GOOGLE_ENABLED === 'true',
  oauthAppleEnabled: process.env.OAUTH_APPLE_ENABLED === 'true'
};
