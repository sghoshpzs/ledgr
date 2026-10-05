import { useState, type FormEvent } from 'react'
import { Icon } from '@/components/Icon'
import { db } from '@/db/db'
import { label, money, monthKey, today } from '@/lib/format'
import { countMonth, dateMonthFor } from '@/lib/recurring'
import type { Payment, Transaction } from '@/types'

interface Draft { key: number; date: string; amount: string; note: string }

const monthName = (m: string) => new Date(m + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
const lastDay = (m: string) => `${m}-${new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate()}`

/**
 * The actual amounts paid / received against an estimated Cash flow entry in `month`: lists the ones
 * already recorded so they can be edited or removed, and adds new ones. They are saved on the entry
 * itself (`payments`); entries of other months are kept untouched.
 */
export function PaySheet({ entry, month, onClose }: { entry: Transaction; month: string; onClose: () => void }) {
  const credit = entry.kind === 'credit'
  // Money counting in `month` is dated in this calendar month (the month before, for next-month credits).
  const dm = dateMonthFor(entry, month)
  const defaultDate = monthKey(today()) === dm ? today() : `${dm}-01`
  const inMonth = (p: Payment) => countMonth(entry, p.date) === month

  const [rows, setRows] = useState<Draft[]>(() => {
    const existing = (entry.payments ?? []).filter(inMonth).map((p, i) => ({ key: i, date: p.date, amount: String(p.amount), note: p.note ?? '' }))
    // First entry of the month starts at the estimate, which is often the actual for bills.
    return existing.length ? existing : [{ key: 0, date: defaultDate, amount: String(entry.amount), note: '' }]
  })
  const [seq, setSeq] = useState(rows.length)

  const set = (key: number, patch: Partial<Draft>) => setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const add = () => { setRows([...rows, { key: seq, date: defaultDate, amount: '', note: '' }]); setSeq(seq + 1) }
  const remove = (key: number) => setRows(rows.filter((r) => r.key !== key))

  const total = rows.reduce((s, r) => s + (Number(r.amount) > 0 ? Number(r.amount) : 0), 0)
  const diff = total - entry.amount

  const save = (e: FormEvent) => {
    e.preventDefault()
    const mine: Payment[] = rows
      .filter((r) => Number(r.amount) > 0 && r.date)
      .map((r) => ({ date: r.date, amount: Number(r.amount), ...(r.note.trim() && { note: r.note.trim() }) }))
    const others = (entry.payments ?? []).filter((p) => !inMonth(p))
    const payments = [...others, ...mine].sort((a, b) => a.date.localeCompare(b.date))
    db.transactions.update(entry, { payments })
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="sheet-head">
          <h2>{entry.note || label(entry.category)} – {monthName(month)}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={20} /></button>
        </div>
        <div className="sheet-body">
          {rows.length === 0 && <p className="muted">No {credit ? 'amounts received' : 'expenses'} recorded for this month. Saving now puts the estimate back in the totals.</p>}
          <ul className="pay-rows">
            {rows.map((r, i) => (
              <li key={r.key} className="pay-row">
                <input type="date" value={r.date} required min={`${dm}-01`} max={lastDay(dm)} aria-label={`Date ${i + 1}`}
                  onChange={(e) => set(r.key, { date: e.target.value })} />
                <input type="number" inputMode="decimal" step="any" min="0.01" value={r.amount} required placeholder="₹" aria-label={`Amount ${i + 1}`}
                  autoFocus={i === rows.length - 1} onChange={(e) => set(r.key, { amount: e.target.value })} />
                <button type="button" className="icon-btn" onClick={() => remove(r.key)} aria-label={`Remove entry ${i + 1}`}><Icon name="close" size={18} /></button>
                <input className="pay-note" type="text" value={r.note} placeholder="Note (optional)" aria-label={`Note ${i + 1}`}
                  onChange={(e) => set(r.key, { note: e.target.value })} />
              </li>
            ))}
          </ul>
          <div><button type="button" className="btn btn-small" onClick={add}><Icon name="plus" size={14} /> Add another</button></div>
          <p className="pay-total">
            <span>Total {credit ? 'received' : 'spent'}</span> <b>{money(total)}</b>
            <small>Estimated {money(entry.amount)}{rows.length > 0 && diff !== 0 && <> · <b>{money(Math.abs(diff))} {diff > 0 ? 'more' : 'less'}</b></>}</small>
          </p>
          <p className="muted">These amounts replace the estimate in {monthName(month)}’s totals.</p>
        </div>
        <div className="sheet-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  )
}
