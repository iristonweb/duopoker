import { describe, expect, it } from 'vitest';
import {
  isPhoneLandscapeViewport,
  isPhonePortraitViewport,
  isPhoneViewport
} from './table-viewport';

describe('isPhoneViewport', () => {
  it('covers common iOS and Android phone sizes', () => {
    // iPhone SE / small Android
    expect(isPhoneViewport(320, 568)).toBe(true);
    // iPhone 14/15
    expect(isPhoneViewport(390, 844)).toBe(true);
    // iPhone Pro Max portrait
    expect(isPhoneViewport(430, 932)).toBe(true);
    // Landscape phones
    expect(isPhoneViewport(844, 390)).toBe(true);
    expect(isPhoneViewport(932, 430)).toBe(true);
    // iPad / tablet
    expect(isPhoneViewport(768, 1024)).toBe(false);
    expect(isPhoneViewport(1024, 768)).toBe(false);
    // Desktop
    expect(isPhoneViewport(1280, 800)).toBe(false);
  });
});

describe('isPhonePortraitViewport', () => {
  it('detects portrait phones by aspect ratio', () => {
    expect(isPhonePortraitViewport(375, 667)).toBe(true);
    expect(isPhonePortraitViewport(390, 844)).toBe(true);
    expect(isPhonePortraitViewport(430, 932)).toBe(true);
    expect(isPhonePortraitViewport(844, 390)).toBe(false);
    expect(isPhonePortraitViewport(932, 430)).toBe(false);
    expect(isPhonePortraitViewport(768, 1024)).toBe(false);
  });
});

describe('isPhoneLandscapeViewport', () => {
  it('detects landscape phones', () => {
    expect(isPhoneLandscapeViewport(667, 375)).toBe(true);
    expect(isPhoneLandscapeViewport(844, 390)).toBe(true);
    expect(isPhoneLandscapeViewport(932, 430)).toBe(true);
    expect(isPhoneLandscapeViewport(375, 667)).toBe(false);
  });
});
