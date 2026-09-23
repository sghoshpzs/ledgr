import { TABLES } from '@/db/db'

// Before sign-in existed, data lived only in this browser's IndexedDB ("personal-ledger").
// These helpers let Settings offer a one-time move of that data into the signed-in account.
const NAME = 'personal-ledger'

export async function hasLegacyData() {
  if (!indexedDB.databases) return false
  return (await indexedDB.databases()).some((d) => d.name === NAME)
}

export function readLegacyData(): Promise<Record<string, unknown[]>> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const idb = req.result
      const stores = TABLES.filter((t) => idb.objectStoreNames.contains(t))
      if (!stores.length) { idb.close(); return resolve({}) }
      const tx = idb.transaction(stores, 'readonly')
      const out: Record<string, unknown[]> = {}
      for (const s of stores) {
        const all = tx.objectStore(s).getAll()
        all.onsuccess = () => { out[s] = all.result }
      }
      tx.oncomplete = () => { idb.close(); resolve(out) }
      tx.onerror = () => { idb.close(); reject(tx.error) }
    }
  })
}

export function deleteLegacyData(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}
