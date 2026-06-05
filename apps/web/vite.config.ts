import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const apiProxy = {
  target: 'http://localhost:4000',
  changeOrigin: true
};

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['manifest.webmanifest', 'icons/icon.svg', 'assets/**/*'],
      manifest: {
        name: 'DuoPoker',
        short_name: 'DuoPoker',
        theme_color: '#0A0A0A',
        background_color: '#0A0A0A',
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
        globPatterns: ['**/*.{js,css,html,ico,svg,webmanifest}']
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
      '/health': { ...apiProxy, rewrite: (p) => `/api${p}` },
      '/api': apiProxy
    }
  }
});
