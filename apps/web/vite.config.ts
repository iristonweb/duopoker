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
        includeAssets: ['manifest.webmanifest', 'icons/icon.svg', 'assets/**/*'],
        manifest: {
          name: 'DuoPoker',
          short_name: 'DuoPoker',
          theme_color: '#050508',
          background_color: '#050508',
          display: 'standalone',
          start_url: '/lobby',
          icons: [
            {
              src: '/icons/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: '/icons/icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
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
        '/auth': { ...apiProxy, rewrite: (p) => `/api${p}` },
        '/profile': { ...apiProxy, rewrite: (p) => `/api${p}` },
        '/game': { ...apiProxy, rewrite: (p) => `/api${p}` },
        '/monetization': { ...apiProxy, rewrite: (p) => `/api${p}` },
        '/clubs': { ...apiProxy, rewrite: (p) => `/api${p}` },
        '/voice': { ...apiProxy, rewrite: (p) => `/api${p}` },
        '/admin': { ...apiProxy, rewrite: (p) => `/api${p}` },
        '/health': { ...apiProxy, rewrite: (p) => `/api${p}` },
        '/api': apiProxy
      }
    }
  };
});
