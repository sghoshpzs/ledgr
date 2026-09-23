import { useEffect, useState } from 'react'
import {
  collection, doc, getDocs, limit, onSnapshot, orderBy, query, where, writeBatch,
  type DocumentData, type Query, type WriteBatch,
} from 'firebase/firestore'
import { auth, fs } from '@/lib/firebase'
import { useAuth } from '@/lib/auth'
import { label } from '@/lib/format'
import type { HistoryEntry, Investment, Liability, Transaction, TrackedItem } from '@/types'

// Data lives in Firestore under users/{uid}/{table}/{id}. firestore.rules only lets a signed-in
// user touch their own users/{uid} subtree, so each person's data is private to them.
// Every add / edit / delete also writes a users/{uid}/history entry in the same batch.

export const TABLES = ['investments', 'liabilities', 'transactions', 'items'] as const
export type TableName = (typeof TABLES)[number]
const ALL = [...TABLES, 'history'] as const
type AnyName = (typeof ALL)[number]

interface RowTypes { investments: Investment; liabilities: Liability; transactions: Transaction; items: TrackedItem; history: HistoryEntry }

function uid() {
  const u = auth.currentUser?.uid
  if (!u) throw new Error('Not signed in')
  return u
}

const colRef = (name: AnyName) => collection(fs, 'users', uid(), name)

/** Firestore rejects `undefined` values, and the id is the document key, not a field. */
function clean(row: object): DocumentData {
  const out: DocumentData = {}
  for (const [k, v] of Object.entries(row)) if (k !== 'id' && v !== undefined) out[k] = v
  return out
}

/** Short human name for a row, stored on its history entries. */
function titleOf(row: DocumentData) {
  return String(row.name || row.note || (row.category ? label(String(row.category)) : '') || 'Untitled')
}

/**
 * Commits in the background. With Firestore's offline cache the change is visible immediately and the
 * promise only settles once the server confirms — awaiting it would freeze the UI while offline.
 */
function commit(b: WriteBatch) {
  b.commit().catch((e) => {
    console.error(e)
    alert('Could not save your change. Please check your connection and try again.')
  })
}

function log(b: WriteBatch, entry: Omit<HistoryEntry, 'id' | 'at'>) {
  b.set(doc(colRef('history')), clean({ ...entry, at: new Date().toISOString() }))
}

export class Table<T extends { id?: string }> {
  constructor(readonly name: TableName) {}
  private ref(id: string) { return doc(colRef(this.name), id) }

  /** Queue an insert (+ history) on a batch; returns the new id so related rows can link to it. */
  addIn(b: WriteBatch, row: T) {
    const ref = doc(colRef(this.name))
    const data = clean(row)
    b.set(ref, data)
    log(b, { table: this.name, rowId: ref.id, action: 'add', title: titleOf(data), after: data })
    return ref.id
  }
  /** Queue a partial update (+ history). `current` is the row as it is now, for the "before" values. */
  updateIn(b: WriteBatch, current: T, patch: Partial<T>) {
    const before = clean(current)
    const after = clean({ ...current, ...patch })
    b.update(this.ref(current.id!), clean(patch))
    log(b, { table: this.name, rowId: current.id!, action: 'update', title: titleOf(after), before, after })
  }

  add(row: T) { const b = batch(); const id = this.addIn(b, row); commit(b); return id }
  /** Replace a row with its edited version. */
  put(row: T, before: T) {
    const b = batch()
    const data = clean(row)
    b.set(this.ref(row.id!), data)
    log(b, { table: this.name, rowId: row.id!, action: 'update', title: titleOf(data), before: clean(before), after: data })
    commit(b)
  }
  update(current: T, patch: Partial<T>) { const b = batch(); this.updateIn(b, current, patch); commit(b) }
  delete(row: T) {
    const b = batch()
    const data = clean(row)
    b.delete(this.ref(row.id!))
    log(b, { table: this.name, rowId: row.id!, action: 'delete', title: titleOf(data), before: data })
    commit(b)
  }
  /** Bring back a deleted row with its original id, so links from other rows still work. */
  restore(rowId: string, data: DocumentData) {
    const b = batch()
    b.set(this.ref(rowId), data)
    log(b, { table: this.name, rowId, action: 'restore', title: titleOf(data), after: data })
    commit(b)
  }
}

export const db = {
  investments: new Table<Investment>('investments'),
  liabilities: new Table<Liability>('liabilities'),
  transactions: new Table<Transaction>('transactions'),
  items: new Table<TrackedItem>('items'),
}

export const batch = () => writeBatch(fs)

/** Live rows of a Firestore query for the signed-in user; `undefined` until the first snapshot arrives. */
function useLive<R>(key: string | null, make: (uid: string) => Query<DocumentData>): R[] | undefined {
  const { user } = useAuth()
  const [rows, setRows] = useState<{ key: string; rows: R[] }>()
  const full = user && key !== null ? `${user.uid}/${key}` : null
  useEffect(() => {
    if (!user || full === null) return
    return onSnapshot(make(user.uid), (snap) =>
      setRows({ key: full, rows: snap.docs.map((d) => ({ ...d.data(), id: d.id }) as R) }))
    // `full` captures everything `make` depends on (user + query key).
  }, [full])
  return full !== null && rows?.key === full ? rows.rows : undefined
}

/** Live rows of one table. */
export function useTable<N extends TableName>(name: N): RowTypes[N][] | undefined {
  return useLive<RowTypes[N]>(name, (u) => collection(fs, 'users', u, name))
}

/** Latest history entries, newest first — all of them, or just one row's when `rowId` is given. */
export function useHistory(rowId?: string | null, max = 300): HistoryEntry[] | undefined {
  const key = rowId === null ? null : `history/${rowId ?? '*'}/${max}`
  const rows = useLive<HistoryEntry>(key, (u) => {
    const col = collection(fs, 'users', u, 'history')
    // Filter-only query for one row (no composite index needed); sorted below.
    return rowId ? query(col, where('rowId', '==', rowId)) : query(col, orderBy('at', 'desc'), limit(max))
  })
  return rowId && rows ? [...rows].sort((a, b) => b.at.localeCompare(a.at)) : rows
}

// ---------- backup / restore / wipe (bulk operations; not logged row by row) ----------

const BATCH_LIMIT = 450 // Firestore allows 500 writes per batch

async function chunked(ops: ((b: WriteBatch) => void)[]) {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const b = batch()
    ops.slice(i, i + BATCH_LIMIT).forEach((op) => op(b))
    await b.commit()
  }
}

export async function exportAll() {
  const out: Record<string, unknown[]> = {}
  for (const t of ALL) out[t] = (await getDocs(colRef(t))).docs.map((d) => ({ ...d.data(), id: d.id }))
  return out
}

/** Deletes every record and the change history. */
export async function wipeAll() {
  const ops: ((b: WriteBatch) => void)[] = []
  for (const t of ALL) for (const d of (await getDocs(colRef(t))).docs) ops.push((b) => b.delete(d.ref))
  await chunked(ops)
}

/** Replaces everything with a backup. Accepts old on-device backups (numeric ids) too — ids and links are kept as strings. */
export async function importAll(data: Record<string, unknown[]>) {
  if (!TABLES.some((t) => Array.isArray(data[t]))) throw new Error('Not a Ledger backup')
  await wipeAll()
  const str = (v: unknown) => (v === undefined || v === null ? undefined : String(v))
  const ops: ((b: WriteBatch) => void)[] = []
  for (const t of ALL) {
    for (const raw of (data[t] ?? []) as Record<string, unknown>[]) {
      const row = t === 'history' ? raw : { ...raw, liabilityId: str(raw.liabilityId), investmentId: str(raw.investmentId) }
      const id = str(raw.id)
      ops.push((b) => b.set(id ? doc(colRef(t), id) : doc(colRef(t)), clean(row)))
    }
  }
  await chunked(ops)
}
