import { describe, expect, it } from 'vitest';
import { requireClubRole } from './club-rbac.js';

describe('club-rbac', () => {
  it('exports requireClubRole', () => {
    expect(typeof requireClubRole).toBe('function');
  });
});
