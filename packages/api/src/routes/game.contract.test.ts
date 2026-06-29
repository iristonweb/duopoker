import { describe, expect, it } from 'vitest';
import { gameRoutes } from './game.js';

describe('game contract', () => {
  it('registers REST polling game routes', () => {
    const paths = gameRoutes.routes.map((r) => `${r.method} ${r.path}`);
    expect(paths).toContain('POST /queue');
    expect(paths).toContain('POST /join');
    expect(paths).toContain('POST /action');
    expect(paths).toContain('GET /session/:sessionId');
    expect(paths).toContain('GET /queue/status');
  });
});
