import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn()
}));

vi.mock('../notifications/register', () => ({
  registerMobilePushToken: vi.fn()
}));

vi.mock('../lib/purchases', () => ({
  loginPurchases: vi.fn()
}));

vi.mock('../lib/table-connection', () => ({
  cleanupTableConnection: vi.fn()
}));

describe('useMobileStore login', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('sets authError on failed login', async () => {
    vi.doMock('../lib/api', () => ({
      API_BASE: 'http://localhost:3001/api',
      loginRequest: vi.fn().mockRejectedValue(new Error('login_failed')),
      registerTokenRefresh: vi.fn()
    }));
    const { useMobileStore } = await import('./useMobileStore');
    const ok = await useMobileStore.getState().login('bad@example.com', 'wrong');
    expect(ok).toBe(false);
    expect(useMobileStore.getState().authError).toBe('login_failed');
  });
});
