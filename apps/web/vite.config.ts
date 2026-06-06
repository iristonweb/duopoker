import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Default :3001 = Vercel-style API (polling). Full backend: VITE_API_PROXY=http://localhost:4000
  const apiProxyTarget = env.VITE_API_PROXY || 'http://localhost:3001';
  const apiProxy = {
    target: apiProxyTarget,
    changeOrigin: true
  };

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['manifest.webmanifest', 'favicon.png', 'apple-touch-icon.png', 'assets/**/*'],
        manifest: {
          name: 'DP CLUB — Duo Poker Club',
          short_name: 'DP CLUB',
          description: 'Premium play-money poker — Texas Hold\'em & Raspisnoy.',
          theme_color: '#050508',
          background_color: '#050508',
          display: 'standalone',
          start_url: '/lobby',
          icons: [
            {
              src: '/favicon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/favicon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,svg,webmanifest,png,webp,jpg,jpeg}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
        }
      })
    ],
    server: {
      port: 5180,
      strictPort: true,
      proxy: {
        '/api': apiProxy,
        '/health': { ...apiProxy, rewrite: () => '/api/health' }
      }
    }
  };
});
