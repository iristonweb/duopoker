import { describe, expect, it } from 'vitest';
import { resolveTableLayoutKind } from './useTableLayoutMode';

describe('resolveTableLayoutKind', () => {
  it('picks desktop at 1280px and above', () => {
    expect(resolveTableLayoutKind(1280, true)).toBe('desktop');
    expect(resolveTableLayoutKind(1440, false)).toBe('desktop');
  });

  it('picks tablet between 768 and 1279', () => {
    expect(resolveTableLayoutKind(768, true)).toBe('tablet');
    expect(resolveTableLayoutKind(1024, false)).toBe('tablet');
    expect(resolveTableLayoutKind(1279, true)).toBe('tablet');
  });

  it('picks mobile immersive or classic at 767 and below', () => {
    expect(resolveTableLayoutKind(767, true)).toBe('mobile-immersive');
    expect(resolveTableLayoutKind(375, true)).toBe('mobile-immersive');
    expect(resolveTableLayoutKind(767, false)).toBe('mobile-classic');
    expect(resolveTableLayoutKind(320, false)).toBe('mobile-classic');
  });
});
