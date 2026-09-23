import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from '@/App'
import { AuthProvider } from '@/lib/auth'
import '@/index.css'

registerSW({ immediate: true }) // registers the service worker → offline + installable

// Refuse to run inside another site's frame (clickjacking). A <meta> CSP can't set frame-ancestors,
// and a site-wide header would also block Firebase's own sign-in frame — so guard here.
if (window.top !== window.self) throw new Error('Ledger cannot be embedded in another page.')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
