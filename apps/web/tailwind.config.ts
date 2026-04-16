import type { Config } from 'tailwindcss';
import { colors } from '@duopoker/shared-types';

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui-kit/src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        background: colors.background,
        surface: colors.surface,
        surfaceElevated: colors.surfaceElevated,
        gold: colors.gold,
        'gold-muted': colors.goldMuted,
        emerald: colors.emerald,
        'emerald-muted': colors.emeraldMuted,
        muted: colors.textMuted,
        subtle: colors.textSubtle
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        'glow-gold': '0 0 24px rgba(255, 215, 0, 0.15)',
        'glow-emerald': '0 0 20px rgba(80, 200, 120, 0.12)',
        panel: '0 8px 32px rgba(0, 0, 0, 0.45)'
      },
      backdropBlur: {
        glass: '12px'
      },
      backgroundImage: {
        'radial-gold':
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255, 215, 0, 0.12), transparent)',
        'radial-emerald':
          'radial-gradient(ellipse 60% 40% at 100% 50%, rgba(80, 200, 120, 0.08), transparent)'
      }
    }
  },
  plugins: []
} satisfies Config;
