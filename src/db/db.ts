import Dexie, { type EntityTable } from 'dexie'
import type { Investment, Liability, Transaction, TrackedItem } from '@/types'

// Everything is stored on-device in IndexedDB — works offline, no server needed.
// To add sync later, put an API behind the same table shapes (see README).
class LedgerDB extends Dexie {
  investments!: EntityTable<Investment, 'id'>
  liabilities!: EntityTable<Liability, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  items!: EntityTable<TrackedItem, 'id'>

  constructor() {
    super('personal-ledger')
    this.version(1).stores({
      investments: '++id, type, horizon, maturityDate',
      liabilities: '++id, type, nextDueDate',
      transactions: '++id, kind, category, date',
      items: '++id, type, expiryDate',
    })
  }
}

export const db = new LedgerDB()

const TABLES = ['investments', 'liabilities', 'transactions', 'items'] as const

export async function exportAll() {
  const out: Record<string, unknown[]> = {}
  for (const t of TABLES) out[t] = await db[t].toArray()
  return out
}

export async function importAll(data: Record<string, unknown[]>) {
  await db.transaction('rw', db.investments, db.liabilities, db.transactions, db.items, async () => {
    for (const t of TABLES) {
      await db[t].clear()
      if (Array.isArray(data[t])) await (db[t] as unknown as { bulkAdd(rows: unknown[]): Promise<unknown> }).bulkAdd(data[t])
    }
  })
}
