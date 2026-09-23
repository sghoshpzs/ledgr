import { useState, type FormEvent } from 'react'
import { Icon } from '@/components/Icon'
import { batch, commit, db } from '@/db/db'
import { money, niceDate, today } from '@/lib/format'
import type { Investment } from '@/types'

/**
 * Records a mutual-fund redemption in one batch: a Cash flow credit (MF redemption, linked to the fund)
 * and the fund's principal reduced by the same amount. Both land in History.
 */
export function redeem(fund: Investment, date: string, amount: number) {
  const b = batch()
  db.transactions.addIn(b, {
    kind: 'credit', category: 'MF_REDEMPTION', amount, date, note: `${fund.name} – redemption`, investmentId: fund.id,
  })
  db.investments.updateIn(b, fund, {
    investedAmount: Math.max(0, (fund.investedAmount ?? 0) - amount),
    // The holding is worth less by what was taken out, so Return % isn't skewed by the smaller principal.
    currentValue: Math.max(0, (fund.currentValue ?? 0) - amount),
  })
  commit(b)
}

export function RedeemSheet({ fund, onClose }: { fund: Investment; onClose: () => void }) {
  const [date, setDate] = useState(today())
  const [amount, setAmount] = useState('')
  const value = Number(amount)
  const principal = fund.investedAmount ?? 0
  const after = Math.max(0, principal - (value > 0 ? value : 0))

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!(value > 0)) return
    redeem(fund, date, value)
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="sheet-head">
          <h2>Redeem – {fund.name}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={20} /></button>
        </div>
        <div className="sheet-body">
          <label className="field">
            <span>Redemption date</span>
            <input type="date" value={date} max={today()} required onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span>Amount redeemed (₹)</span>
            <input type="number" inputMode="decimal" step="any" min="0.01" value={amount} required autoFocus onChange={(e) => setAmount(e.target.value)} />
            <small>
              Principal {money(principal)} → <b>{money(after)}</b>
              {value > principal && ' · more than the principal, so it becomes ₹0'}
            </small>
          </label>
          <p className="muted">Also adds a credit “MF redemption” on {niceDate(date)} to Cash flow.</p>
        </div>
        <div className="sheet-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Redeem</button>
        </div>
      </form>
    </div>
  )
}
