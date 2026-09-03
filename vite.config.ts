import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Base path targets GitHub Pages at /<repo>/; override with BASE_PATH for other hosts.
const base = process.env.BASE_PATH ?? '/hockeywisselapp/'

// Voor de gehoste testversie wordt alles in één HTML-bestand gebundeld; daar
// hoort geen service worker bij.
const alleenEenBestand = process.env.SINGLE_FILE === '1'

export default defineConfig({
  base,
  plugins: [
    react(),
    ...(alleenEenBestand ? [] : [VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Hockey Wissel App',
        short_name: 'Wissels',
        description: 'Wisselschema voor hockeywedstrijden: eerlijke speeltijd op de juiste positie.',
        lang: 'nl',
        theme_color: '#0b1626',
        background_color: '#0b1626',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    })]),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
