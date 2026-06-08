/** Brand tokens — mirror values in apps/web/src/index.css :root when updating. */
export const colors = {
  background: '#050508',
  surface: '#0c0c12',
  surfaceElevated: '#14141f',
  gold: '#e8c547',
  goldLight: '#f5e6a8',
  goldMuted: '#b8942e',
  emerald: '#4ade80',
  emeraldMuted: '#22c55e',
  ivory: '#faf8f2',
  text: '#f4f4f5',
  textMuted: '#a1a1aa',
  textSubtle: '#71717a',
  border: 'rgba(255, 255, 255, 0.1)',
  borderStrong: 'rgba(232, 197, 71, 0.35)',
  glass: 'rgba(255, 255, 255, 0.05)',
  danger: '#f87171'
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28
} as const;

/** Shadow strings for web (Tailwind arbitrary) or RN elevation mapping. */
export const shadows = {
  glowGold: '0 0 40px rgba(232, 197, 71, 0.18)',
  glowEmerald: '0 0 32px rgba(74, 222, 128, 0.14)',
  panel: '0 24px 64px rgba(0, 0, 0, 0.55)',
  inner: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)'
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
  xl: 1280,
  smallMobile: 480,
  tabletMax: 1279
} as const;

export type BrandColors = typeof colors;
