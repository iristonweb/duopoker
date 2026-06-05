import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export const formatApiError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: string }).code);
    if (code === 'P2002') return 'Email already registered';
    if (code === 'P2021' || code === 'P2022') {
      return 'Database schema is out of date. Run pnpm db:push against Neon.';
    }
  }
  if (error instanceof Error) {
    if (error.message.includes('JWT_SECRET')) {
      return 'Server misconfigured (missing JWT secrets).';
    }
  }
  return 'Something went wrong. Please try again.';
};

export const jsonError = (c: Context, error: unknown, status: ContentfulStatusCode = 500) => {
  console.error(error);
  return c.json({ error: formatApiError(error) }, status);
};
