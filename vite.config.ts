import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// Content-Security-Policy for the built app only (the dev server needs inline scripts and websockets).
// It lives in the page, not in firebase.json, so it never applies to Firebase's own /__/auth pages.
// Allows only this site plus the Google / Firebase endpoints that sign-in and Firestore use.
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://apis.google.com https://www.gstatic.com",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com https://apis.google.com",
  "frame-src https://*.firebaseapp.com https://*.web.app https://accounts.google.com https://apis.google.com",
  "img-src 'self' data: blob: https://*.googleusercontent.com",
  "style-src 'self' 'unsafe-inline'", // charts set inline style attributes
  "font-src 'self' data:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ')

const cspPlugin: Plugin = {
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<head>', `<head>
    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
}

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    cspPlugin,
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Personal Ledger',
        short_name: 'Ledger',
        description: 'Track investments, liabilities, monthly spending and renewal dates.',
        theme_color: '#0f4c5c',
        background_color: '#f2f5f7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          // Maskable: full-bleed background with the mark inside the safe zone, so Android can crop it to any shape.
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Precache the whole shell so the app opens offline; Firestore keeps its own offline cache.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallbackDenylist: [/^\/__\//], // Firebase auth handler
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
})
