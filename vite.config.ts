import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'disable-hmr-websocket',
        apply: 'serve',
        transform(code: string, id: string) {
          if (
            process.env.DISABLE_HMR === 'true' &&
            id.split('?')[0].endsWith('/vite/dist/client/client.mjs')
          ) {
            return code
              .replace(
                'else throw new SendBeforeConnectError("send was called before connect");',
                'else return;'
              )
              .replace(
                'else throw new SendBeforeConnectError("invoke was called before connect");',
                'else return;'
              )
              .replace(
                'transport.connect(createHMRHandler(handleMessage));',
                '/* HMR WebSocket disabled */'
              );
          }
        },
      },
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon.png'],
        manifest: {
          id: '/',
          name: 'Vanguard Vector',
          short_name: 'Vanguard3D',
          description:
            '30-level 3D cyber-trench space shooter with 8 jets, futuristic liveries, offline solo play, and 2P co-op.',
          theme_color: '#02060d',
          background_color: '#02060d',
          display: 'fullscreen',
          display_override: ['fullscreen', 'standalone'],
          orientation: 'landscape',
          categories: ['games', 'arcade', 'action'],
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallbackDenylist: [/^\/api\//, /^\/ws/],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(import.meta.dirname, 'dist');
          const srcAssets = path.resolve(import.meta.dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      ws: process.env.DISABLE_HMR === 'true' ? (false as const) : undefined,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
