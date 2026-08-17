import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Em desenvolvimento, faz proxy de /api e /uploads para o backend (porta 4000),
// evitando CORS e mantendo o front consumindo caminhos relativos.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png', 'marca.svg'],
      manifest: {
        name: 'Airton Artus Digital',
        short_name: 'Artus Digital',
        description: 'Central de comando da pré-campanha — mobilização, dados, atendimento e território.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        theme_color: '#0B33C2',
        background_color: '#F6F7F9',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        // App shell offline; API e uploads sempre na rede (dados ao vivo).
        navigateFallbackDenylist: [/^\/api/, /^\/uploads/],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Fotos grandes da landing ficam fora do precache (carregam da rede).
        globIgnores: ['**/img/**', '**/candidato.jpg', '**/og-image.jpg'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
