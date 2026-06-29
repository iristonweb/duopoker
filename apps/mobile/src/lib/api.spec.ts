import { describe, expect, it, vi, beforeEach } from 'vitest';
import { apiFetch, loginRequest } from './api';

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('prefixes paths with API base', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await apiFetch('/auth/login', { method: 'POST', body: '{}' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('loginRequest', () => {
  it('throws on failed login', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await expect(loginRequest('a@b.c', 'password')).rejects.toThrow('login_failed');
  });
});
