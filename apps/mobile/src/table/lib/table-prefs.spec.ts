import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as SecureStore from 'expo-secure-store';
import { loadTableMusicPref, loadTableSfxPref } from './table-prefs';

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn()
}));

describe('table-prefs', () => {
  beforeEach(() => {
    vi.mocked(SecureStore.getItemAsync).mockReset();
  });

  it('defaults sfx on when unset', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
    await expect(loadTableSfxPref()).resolves.toBe(true);
  });

  it('defaults music off when unset', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
    await expect(loadTableMusicPref()).resolves.toBe(false);
  });
});
