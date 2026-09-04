import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// De app draait op de root van zijn domein. Wie hem onder een submap zet --
// GitHub Pages serveert een project op /<repo>/ -- geeft dat mee met BASE_PATH.
const base = process.env.BASE_PATH ?? '/'

// Voor de gehoste testversie wordt alles in één HTML-bestand gebundeld; daar
// hoort geen service worker bij.
const alleenEenBestand = process.env.SINGLE_FILE === '1'

export default defineConfig({
  base,
  // Alles in één HTML-bestand betekent: geen losse CSS-chunks en geen preloads
  // naar bestanden die er dan niet zijn. Voor de gewone build blijft dit uit,
  // zodat de stijlen van de oefenmodus in hun eigen chunk kunnen blijven en
  // dus buiten de productiebuild vallen.
  build: alleenEenBestand ? { cssCodeSplit: false, modulePreload: false } : {},
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
        theme_color: '#08152c',
        background_color: '#08152c',
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
