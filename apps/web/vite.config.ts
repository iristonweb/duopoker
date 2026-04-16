import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['manifest.webmanifest'],
      manifest: {
        name: 'DuoPoker',
        short_name: 'DuoPoker',
        theme_color: '#0A0A0A',
        background_color: '#0A0A0A',
        display: 'standalone',
        start_url: '/lobby'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/localhost:4000\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache' }
          }
        ]
      }
    })
  ]
});
