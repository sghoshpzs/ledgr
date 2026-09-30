import { useState, type FormEvent } from 'react'
import { Icon } from '@/components/Icon'
import { db } from '@/db/db'
import { label, money, today } from '@/lib/format'
import type { Transaction } from '@/types'

/** Adds an actual payment (date + amount) to an estimated Cash flow entry. It is saved on the entry itself. */
export function PaySheet({ entry, onClose }: { entry: Transaction; onClose: () => void }) {
  const credit = entry.kind === 'credit'
  const [date, setDate] = useState(today())
  const [amount, setAmount] = useState(String(entry.amount))
  const value = Number(amount)
  const diff = value - entry.amount

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!(value > 0)) return
    db.transactions.update(entry, { payments: [...(entry.payments ?? []), { date, amount: value }] })
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="sheet-head">
          <h2>{credit ? 'Mark received' : 'Mark paid'} – {entry.note || label(entry.category)}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={20} /></button>
        </div>
        <div className="sheet-body">
          <label className="field">
            <span>{credit ? 'Date received' : 'Date paid'}</span>
            <input type="date" value={date} required onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span>Actual amount (₹)</span>
            <input type="number" inputMode="decimal" step="any" min="0.01" value={amount} required autoFocus onChange={(e) => setAmount(e.target.value)} />
            <small>
              Estimated {money(entry.amount)}
              {value > 0 && diff !== 0 && <> · actual is <b>{money(Math.abs(diff))} {diff > 0 ? 'more' : 'less'}</b></>}
            </small>
          </label>
          <p className="muted">The actual amount replaces the estimate in that month’s totals.</p>
        </div>
        <div className="sheet-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  )
}
