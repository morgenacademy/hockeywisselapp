import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Met een eigen domein serveert GitHub Pages de app op de root van dat domein,
// zonder eigen domein op /<repo>/. `public/CNAME` is precies het bestand waarin
// het eigen domein staat, dus dat bepaalt hier ook het basispad: één regel
// invullen en de paden kloppen, ook die in het manifest.
const cname = fileURLToPath(new URL('./public/CNAME', import.meta.url))
const eigenDomein = existsSync(cname) && readFileSync(cname, 'utf8').trim() !== ''
const base = process.env.BASE_PATH ?? (eigenDomein ? '/' : '/hockeywisselapp/')

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
