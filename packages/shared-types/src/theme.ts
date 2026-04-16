/** Brand tokens — mirror values in apps/web/src/index.css :root when updating. */
export const colors = {
  background: '#0A0A0A',
  surface: '#12121a',
  surfaceElevated: '#1A1A2E',
  gold: '#FFD700',
  goldMuted: '#c9a227',
  emerald: '#50C878',
  emeraldMuted: '#3d9a5c',
  text: '#f4f4f5',
  textMuted: '#a1a1aa',
  textSubtle: '#71717a',
  border: 'rgba(255, 255, 255, 0.12)',
  borderStrong: 'rgba(255, 215, 0, 0.35)',
  glass: 'rgba(255, 255, 255, 0.06)',
  danger: '#f87171'
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24
} as const;

/** Shadow strings for web (Tailwind arbitrary) or RN elevation mapping. */
export const shadows = {
  glowGold: '0 0 24px rgba(255, 215, 0, 0.15)',
  glowEmerald: '0 0 20px rgba(80, 200, 120, 0.12)',
  panel: '0 8px 32px rgba(0, 0, 0, 0.45)'
} as const;

export const motion = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  spring: { type: 'spring' as const, stiffness: 380, damping: 28 },
  easeOut: [0.22, 1, 0.36, 1] as const
} as const;

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280
} as const;

export type BrandColors = typeof colors;
