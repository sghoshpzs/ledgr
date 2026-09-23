import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from 'firebase/auth'
import { clearIndexedDbPersistence, terminate, waitForPendingWrites } from 'firebase/firestore'
import { auth, fs } from '@/lib/firebase'

interface AuthState { user: User | null; loading: boolean }
const AuthContext = createContext<AuthState>({ user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: auth.currentUser, loading: true })
  useEffect(() => onAuthStateChanged(auth, (user) => setState({ user, loading: false })), [])
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    await signInWithPopup(auth, provider)
  } catch (e) {
    // Installed PWAs and some mobile browsers block popups — fall back to a full-page redirect.
    if ((e as { code?: string }).code === 'auth/popup-blocked') await signInWithRedirect(auth, provider)
    else throw e
  }
}

/** Signs out and wipes the on-device Firestore cache so the next person on this device sees nothing. */
export async function logOut() {
  // Give unsynced edits a moment to upload; don't hang forever when offline.
  await Promise.race([waitForPendingWrites(fs), new Promise((r) => setTimeout(r, 3000))])
  await signOut(auth)
  await terminate(fs)
  await clearIndexedDbPersistence(fs).catch(() => {})
  location.replace('/')
}
