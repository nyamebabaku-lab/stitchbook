import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Web: live app → dist/, demo → dist/demo/ (VITE_DEMO=1).
// Android: VITE_ROLE = designer | staff, OUT_DIR=build/<role>, no service worker.
const DEMO = !!process.env.VITE_DEMO;
const ROLE = process.env.VITE_ROLE || '';

export default defineConfig({
  base: './',
  define: { 'import.meta.env.VITE_DEMO': JSON.stringify(DEMO ? '1' : ''), 'import.meta.env.VITE_ROLE': JSON.stringify(ROLE) },
  plugins: [
    react(),
    VitePWA({
      disable: !!ROLE,
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: DEMO ? 'stitchbook-demo' : 'stitchbook',
        name: DEMO ? 'StitchBook Pro — Demo' : 'StitchBook Pro',
        short_name: DEMO ? 'SB Demo' : 'StitchBook',
        description: 'The fashion designer’s shop in one phone: measurements, orders, fabric tags, payments and customer tracking',
        theme_color: '#0b0b0b',
        background_color: '#0b0b0b',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2}'],
        globIgnores: DEMO ? [] : ['demo/**', 'samples/**'],
        navigateFallbackDenylist: DEMO ? [] : [/\/demo\//],
        runtimeCaching: [{ urlPattern: /supabase\.co\//, handler: 'NetworkOnly' }],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: { outDir: process.env.OUT_DIR || (DEMO ? 'dist/demo' : 'dist'), emptyOutDir: !DEMO, chunkSizeWarningLimit: 1500 },
});
