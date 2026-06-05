/** Parse API `{ error: string | object }` into user-facing text. */
export const readApiError = (payload: unknown, fallback: string): string => {
  if (!payload || typeof payload !== 'object') return fallback;
  const err = (payload as { error?: unknown }).error;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const fieldErrors = (err as { fieldErrors?: Record<string, string[]> }).fieldErrors;
    if (fieldErrors) {
      for (const messages of Object.values(fieldErrors)) {
        if (messages?.[0]) return messages[0];
      }
    }
    return JSON.stringify(err);
  }
  return fallback;
};
