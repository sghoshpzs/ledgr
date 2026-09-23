import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from 'firebase/auth'
import { clearIndexedDbPersistence, collection, getDocs, limit, query, terminate, waitForPendingWrites } from 'firebase/firestore'
import { auth, fs } from '@/lib/firebase'

/** `denied` holds the email of an account that signed in but is not allowed to use the app. */
interface AuthState { user: User | null; loading: boolean; denied?: string }
const AuthContext = createContext<AuthState>({ user: null, loading: true })

/**
 * Access is decided by firestore.rules (only the owner's account). After sign-in we make one tiny
 * read: if the server refuses it, the account isn't allowed, so it is signed straight back out.
 * This keeps the owner's email out of the app code — the rules are the single source of truth.
 */
async function isAllowed(user: User) {
  try {
    await getDocs(query(collection(fs, 'users', user.uid, 'history'), limit(1)))
    return true
  } catch (e) {
    return (e as { code?: string }).code !== 'permission-denied' // offline etc. — let the cache work
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: auth.currentUser, loading: true })
  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) return setState((s) => ({ user: null, loading: false, denied: s.denied }))
    setState({ user: null, loading: true })
    if (await isAllowed(user)) return setState({ user, loading: false })
    await signOut(auth)
    setState({ user: null, loading: false, denied: user.email ?? 'This account' })
  }), [])
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
