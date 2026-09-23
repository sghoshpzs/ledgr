import { useEffect, useState } from 'react'
import {
  addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, setDoc, updateDoc, writeBatch,
  type DocumentData, type WriteBatch,
} from 'firebase/firestore'
import { auth, fs } from '@/lib/firebase'
import { useAuth } from '@/lib/auth'
import type { Investment, Liability, Transaction, TrackedItem } from '@/types'

// Data lives in Firestore under users/{uid}/{table}/{id}. firestore.rules only lets a signed-in
// user touch their own users/{uid} subtree, so each person's data is private to them.

export const TABLES = ['investments', 'liabilities', 'transactions', 'items'] as const
export type TableName = (typeof TABLES)[number]

interface RowTypes { investments: Investment; liabilities: Liability; transactions: Transaction; items: TrackedItem }

function uid() {
  const u = auth.currentUser?.uid
  if (!u) throw new Error('Not signed in')
  return u
}

const colRef = (name: TableName) => collection(fs, 'users', uid(), name)

/** Firestore rejects `undefined` values, and the id is the document key, not a field. */
function clean(row: object): DocumentData {
  const out: DocumentData = {}
  for (const [k, v] of Object.entries(row)) if (k !== 'id' && v !== undefined) out[k] = v
  return out
}

export class Table<T extends { id?: string }> {
  constructor(readonly name: TableName) {}
  add(row: T) { return addDoc(colRef(this.name), clean(row)) }
  put(row: T) { return setDoc(doc(colRef(this.name), row.id!), clean(row)) }
  update(id: string, patch: Partial<T>) { return updateDoc(doc(colRef(this.name), id), clean(patch)) }
  delete(id: string) { return deleteDoc(doc(colRef(this.name), id)) }
  /** Queue an insert on a batch; returns the new id so related rows can link to it. */
  addIn(b: WriteBatch, row: T, id?: string) {
    const ref = id ? doc(colRef(this.name), id) : doc(colRef(this.name))
    b.set(ref, clean(row))
    return ref.id
  }
  updateIn(b: WriteBatch, id: string, patch: Partial<T>) { b.update(doc(colRef(this.name), id), clean(patch)) }
}

export const db = {
  investments: new Table<Investment>('investments'),
  liabilities: new Table<Liability>('liabilities'),
  transactions: new Table<Transaction>('transactions'),
  items: new Table<TrackedItem>('items'),
}

export const batch = () => writeBatch(fs)

/** Live rows of one table for the signed-in user; `undefined` until the first snapshot arrives. */
export function useTable<N extends TableName>(name: N): RowTypes[N][] | undefined {
  const { user } = useAuth()
  const [rows, setRows] = useState<{ key: string; rows: RowTypes[N][] }>()
  const key = `${user?.uid}/${name}`
  useEffect(() => {
    if (!user) return
    return onSnapshot(collection(fs, 'users', user.uid, name), (snap) =>
      setRows({ key, rows: snap.docs.map((d) => ({ ...d.data(), id: d.id }) as RowTypes[N]) }))
  }, [user, name, key])
  return rows?.key === key ? rows.rows : undefined
}

// ---------- backup / restore / wipe ----------

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
  for (const t of TABLES) out[t] = (await getDocs(colRef(t))).docs.map((d) => ({ ...d.data(), id: d.id }))
  return out
}

export async function wipeAll() {
  const ops: ((b: WriteBatch) => void)[] = []
  for (const t of TABLES) for (const d of (await getDocs(colRef(t))).docs) ops.push((b) => b.delete(d.ref))
  await chunked(ops)
}

/** Replaces everything with a backup. Accepts old on-device backups (numeric ids) too — ids and links are kept as strings. */
export async function importAll(data: Record<string, unknown[]>) {
  if (!TABLES.some((t) => Array.isArray(data[t]))) throw new Error('Not a Ledger backup')
  await wipeAll()
  const str = (v: unknown) => (v === undefined || v === null ? undefined : String(v))
  const ops: ((b: WriteBatch) => void)[] = []
  for (const t of TABLES) {
    for (const raw of (data[t] ?? []) as Record<string, unknown>[]) {
      const row = { ...raw, liabilityId: str(raw.liabilityId), investmentId: str(raw.investmentId) }
      const id = str(raw.id)
      ops.push((b) => b.set(id ? doc(colRef(t), id) : doc(colRef(t)), clean(row)))
    }
  }
  await chunked(ops)
}
