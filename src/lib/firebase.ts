import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

// Web config is public (it identifies the project; access is enforced by firestore.rules).
// Values come from .env.local locally (see .env.example) and from GitHub secrets in CI.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const missing = Object.entries(config).filter(([, v]) => !v).map(([k]) => k)
if (missing.length) throw new Error(`Firebase config missing (set in .env.local or CI secrets): ${missing.join(', ')}`)

export const app = initializeApp(config)
export const auth = getAuth(app)
// Offline cache keeps the app usable without a connection; writes sync when back online.
export const fs = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
