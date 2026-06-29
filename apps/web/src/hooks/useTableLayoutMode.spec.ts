import { describe, expect, it } from 'vitest';
import { isPhoneLandscape, resolveTableLayoutKind } from './useTableLayoutMode';

describe('resolveTableLayoutKind', () => {
  it('picks desktop at 1280px and above', () => {
    expect(resolveTableLayoutKind(1280, 800)).toBe('desktop');
    expect(resolveTableLayoutKind(1440, 900)).toBe('desktop');
  });

  it('picks tablet between 768 and 1279 when short side is above phone range', () => {
    expect(resolveTableLayoutKind(768, 1024)).toBe('tablet');
    expect(resolveTableLayoutKind(1024, 768)).toBe('tablet');
    expect(resolveTableLayoutKind(1279, 800)).toBe('tablet');
  });

  it('always picks mobile-classic (horizontal ring table) on phones', () => {
    expect(resolveTableLayoutKind(767, 1024)).toBe('mobile-classic');
    expect(resolveTableLayoutKind(375, 667)).toBe('mobile-classic');
    expect(resolveTableLayoutKind(320, 568)).toBe('mobile-classic');
    expect(resolveTableLayoutKind(844, 390)).toBe('mobile-classic');
    expect(resolveTableLayoutKind(932, 430)).toBe('mobile-classic');
  });
});

describe('isPhoneLandscape', () => {
  it('detects phone landscape', () => {
    expect(isPhoneLandscape(844, 390)).toBe(true);
    expect(isPhoneLandscape(667, 375)).toBe(true);
    expect(isPhoneLandscape(375, 667)).toBe(false);
    expect(isPhoneLandscape(1280, 800)).toBe(false);
  });
});
