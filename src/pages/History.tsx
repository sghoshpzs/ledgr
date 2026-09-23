import { useMemo, useState, type ReactNode } from 'react'
import { db, useHistory, useTable, type TableName } from '@/db/db'
import { Badge, Chips, PageHead, type Tone } from '@/components/ui'
import { label, niceDate } from '@/lib/format'
import type { HistoryAction, HistoryEntry } from '@/types'

const TABLE_LABEL: Record<TableName, string> = {
  investments: 'Investment', liabilities: 'Liability', transactions: 'Cash flow', items: 'Renewal',
}
const ACTION: Record<HistoryAction, { text: string; tone: Tone }> = {
  add: { text: 'Added', tone: 'ok' },
  update: { text: 'Edited', tone: 'info' },
  delete: { text: 'Deleted', tone: 'bad' },
  restore: { text: 'Restored', tone: 'warn' },
}
const HIDDEN = new Set(['liabilityId', 'investmentId']) // internal links, not meaningful to read

const KEY_LABEL: Record<string, string> = {
  pran: 'PRAN', fdNumber: 'FD number', rdNumber: 'RD number', ppfAccountNumber: 'PPF account number',
  debitBank: 'Debit from',
}
/** investedAmount -> "Invested amount" */
const keyLabel = (k: string) => { if (KEY_LABEL[k]) return KEY_LABEL[k]; const w = k.replace(/([A-Z])/g, ' $1').toLowerCase(); return w[0].toUpperCase() + w.slice(1) }

function show(v: unknown) {
  if (v === undefined || v === null || v === '') return '—'
  if (typeof v === 'number') return v.toLocaleString('en-IN')
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  const s = String(v)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return niceDate(s)
  if (/^[A-Z][A-Z_]+$/.test(s)) return label(s)
  return s
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

function changes(before: Record<string, unknown> = {}, after: Record<string, unknown> = {}) {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((k) => !HIDDEN.has(k))
  return keys.filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k])).map((k) => ({ key: k, from: before[k], to: after[k] }))
}

function Details({ e }: { e: HistoryEntry }) {
  if (e.action === 'update') {
    const c = changes(e.before, e.after)
    if (!c.length) return <p className="muted hist-note">Saved without changes.</p>
    return (
      <ul className="hist-changes">
        {c.map((x) => (
          <li key={x.key}><span>{keyLabel(x.key)}</span> <s>{show(x.from)}</s> → <b>{show(x.to)}</b></li>
        ))}
      </ul>
    )
  }
  const values = Object.entries((e.action === 'delete' ? e.before : e.after) ?? {}).filter(([k]) => !HIDDEN.has(k))
  return (
    <details className="hist-values">
      <summary>Values</summary>
      <ul className="hist-changes">
        {values.map(([k, v]) => <li key={k}><span>{keyLabel(k)}</span> <b>{show(v)}</b></li>)}
      </ul>
    </details>
  )
}

function Entry({ e, showTitle, action }: { e: HistoryEntry; showTitle?: boolean; action?: ReactNode }) {
  return (
    <li className="hist-item">
      <div className="hist-head">
        <Badge tone={ACTION[e.action].tone}>{ACTION[e.action].text}</Badge>
        {showTitle && <span className="row-title">{e.title}</span>}
        <span className="row-sub">{showTitle && `${TABLE_LABEL[e.table]} · `}{when(e.at)}</span>
        {action}
      </div>
      <Details e={e} />
    </li>
  )
}

/** Collapsible change log for one record, shown inside its edit sheet. */
export function RecordHistory({ rowId }: { rowId: string }) {
  const [open, setOpen] = useState(false)
  const entries = useHistory(open ? rowId : null)
  return (
    <details className="rec-history" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>History</summary>
      {!entries ? <p className="muted">Loading…</p>
        : entries.length === 0 ? <p className="muted">No changes recorded yet.</p>
        : <ol className="hist">{entries.map((e) => <Entry key={e.id} e={e} />)}</ol>}
    </details>
  )
}

type Filter = 'all' | TableName

export default function History() {
  const [filter, setFilter] = useState<Filter>('all')
  const entries = useHistory()
  const inv = useTable('investments'), liab = useTable('liabilities'), tx = useTable('transactions'), items = useTable('items')

  // A deleted row can be restored only if it is still gone, and only from its most recent entry.
  const restorable = useMemo(() => {
    const live = new Set([inv, liab, tx, items].flatMap((rows) => rows?.map((r) => r.id) ?? []))
    const seen = new Set<string>()
    const out = new Set<string>()
    for (const e of entries ?? []) {
      if (seen.has(e.rowId)) continue
      seen.add(e.rowId)
      if (e.action === 'delete' && e.before && !live.has(e.rowId)) out.add(e.id!)
    }
    return out
  }, [entries, inv, liab, tx, items])

  const rows = entries?.filter((e) => filter === 'all' || e.table === filter)

  return (
    <>
      <PageHead title="History" />
      <p className="muted">Every add, edit and delete, newest first. Deleted records can be restored.</p>
      <Chips value={filter} onChange={setFilter} options={[
        { value: 'all', label: 'All' }, { value: 'investments', label: 'Investments' }, { value: 'liabilities', label: 'Liabilities' },
        { value: 'transactions', label: 'Cash flow' }, { value: 'items', label: 'Renewals' },
      ]} />
      {rows && rows.length === 0 && <p className="empty">No changes recorded yet.</p>}
      <ol className="hist hist-page">
        {rows?.map((e) => (
          <Entry key={e.id} e={e} showTitle action={restorable.has(e.id!) && (
            <button className="btn btn-small" onClick={() => db[e.table].restore(e.rowId, e.before!)}>Restore</button>
          )} />
        ))}
      </ol>
    </>
  )
}
