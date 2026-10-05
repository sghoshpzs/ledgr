import { useState, type FormEvent } from 'react'
import { Icon } from '@/components/Icon'
import { batch, commit, db } from '@/db/db'
import { money, niceDate, today } from '@/lib/format'
import type { Investment } from '@/types'
import { MY_BANK_ACCOUNTS } from '@/config/dropdowns'

/**
 * Records an ad-hoc lump-sum top-up in one batch: the amount is added to the investment's invested amount
 * and current value, and a Cash flow debit (Investment category, linked to it) is added so the month's
 * Invested and Spent figures include it. Everything lands in History.
 */
export function topUp(inv: Investment, date: string, amount: number, debitBank?: string) {
  const b = batch()
  db.transactions.addIn(b, {
    kind: 'debit', category: 'INVESTMENT', amount, date, investmentId: inv.id, debitBank,
    note: `${inv.name} – lump sum`,
  })
  db.investments.updateIn(b, inv, {
    investedAmount: (inv.investedAmount ?? 0) + amount,
    currentValue: (inv.currentValue ?? 0) + amount,
  })
  commit(b)
}

export function TopUpSheet({ fund, onClose }: { fund: Investment; onClose: () => void }) {
  const [date, setDate] = useState(today())
  const [amount, setAmount] = useState('')
  const [bank, setBank] = useState(fund.debitBank ?? '')
  const value = Number(amount)
  const add = value > 0 ? value : 0

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!(value > 0)) return
    topUp(fund, date, value, bank || undefined)
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="sheet-head">
          <h2>Add lump sum – {fund.name}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={20} /></button>
        </div>
        <div className="sheet-body">
          <label className="field">
            <span>Date invested</span>
            <input type="date" value={date} max={today()} required onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span>Amount (₹)</span>
            <input type="number" inputMode="decimal" step="any" min="0.01" value={amount} required autoFocus onChange={(e) => setAmount(e.target.value)} />
            <small>
              Invested {money(fund.investedAmount ?? 0)} → <b>{money((fund.investedAmount ?? 0) + add)}</b>
              {' · '}current value {money(fund.currentValue ?? 0)} → <b>{money((fund.currentValue ?? 0) + add)}</b>
            </small>
          </label>
          <label className="field">
            <span>Debit from (your bank)</span>
            <select value={bank} onChange={(e) => setBank(e.target.value)}>
              <option value="">— Not set —</option>
              {[...new Set([...MY_BANK_ACCOUNTS, ...(fund.debitBank ? [fund.debitBank] : [])])].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <p className="muted">Also adds an “Investment” debit on {niceDate(date)} to Cash flow, so it counts in that month’s Invested and Spent.</p>
        </div>
        <div className="sheet-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Add lump sum</button>
        </div>
      </form>
    </div>
  )
}
