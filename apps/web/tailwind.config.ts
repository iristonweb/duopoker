import type { Config } from 'tailwindcss';
import { colors, zIndex } from '@duopoker/shared-types';

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui-kit/src/**/*.{ts,tsx}'
  ],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      'mobile-max': { max: '767px' },
      'small-mobile': { max: '480px' },
      tablet: { min: '768px', max: '1279px' },
      desktop: { min: '1280px' },
      'table-compact': { raw: '(max-width: 639px), (max-height: 520px)' },
      'max-table-compact': { raw: '(min-width: 640px) and (min-height: 521px)' }
    },
    extend: {
      colors: {
        background: colors.background,
        surface: colors.surface,
        surfaceElevated: colors.surfaceElevated,
        gold: colors.gold,
        'gold-light': colors.goldLight,
        'gold-muted': colors.goldMuted,
        ivory: colors.ivory,
        emerald: colors.emerald,
        'emerald-muted': colors.emeraldMuted,
        muted: colors.textMuted,
        subtle: colors.textSubtle
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        'glow-gold': '0 0 40px rgba(232, 197, 71, 0.18)',
        'glow-emerald': '0 0 32px rgba(74, 222, 128, 0.14)',
        panel: '0 24px 64px rgba(0, 0, 0, 0.55)',
        inner: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'inner-gold': 'inset 0 1px 0 rgba(232, 197, 71, 0.25)'
      },
      backdropBlur: {
        glass: '16px',
        xl: '24px'
      },
      backgroundImage: {
        'radial-gold':
          'radial-gradient(ellipse 90% 60% at 50% -30%, rgba(232, 197, 71, 0.14), transparent 70%)',
        'radial-emerald':
          'radial-gradient(ellipse 70% 50% at 100% 80%, rgba(74, 222, 128, 0.1), transparent 65%)',
        'radial-violet':
          'radial-gradient(ellipse 50% 40% at 0% 50%, rgba(139, 92, 246, 0.06), transparent 60%)',
        'mesh-premium':
          'linear-gradient(135deg, rgba(232,197,71,0.03) 0%, transparent 40%, rgba(74,222,128,0.04) 100%)'
      },
      animation: {
        'float-slow': 'float 12s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' }
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.7' }
        }
      },
      borderRadius: {
        '4xl': '2rem'
      },
      zIndex: {
        felt: String(zIndex.felt),
        hud: String(zIndex.hud),
        chipFlight: String(zIndex.chipFlight),
        banner: String(zIndex.banner),
        pwa: String(zIndex.pwa),
        panel: String(zIndex.panel),
        orientation: String(zIndex.orientation),
        modal: String(zIndex.modal),
        sheet: String(zIndex.sheet),
        fullscreen: String(zIndex.fullscreen)
      }
    }
  },
  plugins: []
} satisfies Config;
