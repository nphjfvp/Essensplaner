import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Essensplaner',
        short_name: 'Essensplaner',
        description: 'Rezepte importieren, anpassen und Wochenpläne bauen.',
        lang: 'de',
        start_url: '/recipes',
        scope: '/',
        display: 'standalone',
        theme_color: '#7c3aed',
        background_color: '#faf9fc',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Erlaubt, Essensplaner im OS-Teilen-Menü als Ziel für geteilte Links
        // aus Instagram/TikTok/YouTube etc. auszuwählen. Nur nutzbar, wenn die
        // App installiert ist, und nur auf Plattformen mit Web-Share-Target-
        // Unterstützung (Android/Chrome — iOS/Safari unterstützt das nicht).
        share_target: {
          action: '/import',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
          },
        },
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
