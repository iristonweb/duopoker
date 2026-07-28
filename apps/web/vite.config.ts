import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Default :3001 = Vercel-style API (polling). Full backend: VITE_API_PROXY=http://localhost:4000
  const apiProxyTarget = env.VITE_API_PROXY || 'http://localhost:3001';
  const apiProxy = {
    target: apiProxyTarget,
    changeOrigin: true
  };

  return {
    resolve: {
      alias: {
        '@duopoker/shared-types/index': path.join(repoRoot, 'packages/shared-types/src/index.ts'),
        '@duopoker/shared-types': path.join(repoRoot, 'packages/shared-types/src/index.ts'),
        '@duopoker/game-engine': path.join(repoRoot, 'packages/game-engine/src/index.ts')
      }
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw-push.ts',
        injectRegister: 'auto',
        includeAssets: ['manifest.webmanifest', 'favicon.png', 'apple-touch-icon.png', 'assets/**/*'],
        // Single source of truth: apps/web/public/manifest.webmanifest
        manifest: false,
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,svg,webmanifest,png,webp,jpg,jpeg}'],
          globIgnores: [
            '**/assets/cosmetics/**',
            '**/assets/**/_sources/**',
            '**/assets/subscriptions/**',
            '**/assets/modes/**',
            '**/assets/banners/**',
            '**/assets/table-felt.png'
          ],
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
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three') || id.includes('@react-three')) return 'three';
            if (id.includes('livekit-client')) return 'livekit';
            if (id.includes('framer-motion')) return 'motion';
          }
        }
      }
    }
  };
});
