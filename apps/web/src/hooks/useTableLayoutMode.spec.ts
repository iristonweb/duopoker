import { describe, expect, it } from 'vitest';
import { resolveTableLayoutKind } from './useTableLayoutMode';

describe('resolveTableLayoutKind', () => {
  it('picks desktop at 1280px and above', () => {
    expect(resolveTableLayoutKind(1280, 800, true)).toBe('desktop');
    expect(resolveTableLayoutKind(1440, 900, false)).toBe('desktop');
  });

  it('picks tablet between 768 and 1279 when short side is above phone range', () => {
    expect(resolveTableLayoutKind(768, 1024, true)).toBe('tablet');
    expect(resolveTableLayoutKind(1024, 768, false)).toBe('tablet');
    expect(resolveTableLayoutKind(1279, 800, true)).toBe('tablet');
  });

  it('picks mobile immersive or classic when short side is 767 and below', () => {
    expect(resolveTableLayoutKind(767, 1024, true)).toBe('mobile-immersive');
    expect(resolveTableLayoutKind(375, 667, true)).toBe('mobile-immersive');
    expect(resolveTableLayoutKind(767, 1024, false)).toBe('mobile-classic');
    expect(resolveTableLayoutKind(320, 568, false)).toBe('mobile-classic');
  });

  it('uses classic horizontal table on phone landscape even when immersive is on', () => {
    expect(resolveTableLayoutKind(844, 390, true)).toBe('mobile-classic');
    expect(resolveTableLayoutKind(844, 390, false)).toBe('mobile-classic');
    expect(resolveTableLayoutKind(667, 375, true)).toBe('mobile-classic');
    expect(resolveTableLayoutKind(667, 375, false)).toBe('mobile-classic');
  });
});
