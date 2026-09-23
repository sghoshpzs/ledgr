import { useState, type FormEvent } from 'react'
import { Icon } from '@/components/Icon'
import { batch, commit, db } from '@/db/db'
import { money, niceDate, today } from '@/lib/format'
import type { Investment } from '@/types'
import { isFixedDeposit } from '@/lib/investments'

const CREDIT = { MUTUAL_FUND: 'MF_REDEMPTION', FD: 'FD_MATURITY', RD: 'RD_MATURITY' } as const

/** The amount a redemption is taken from: maturity amount for FD / RD, principal for a mutual fund. */
const baseOf = (i: Investment) => (isFixedDeposit(i) ? i.maturityAmount ?? i.currentValue ?? 0 : i.investedAmount ?? 0)

/**
 * Records a redemption in one batch: a Cash flow credit (MF redemption / FD maturity / RD maturity, linked
 * to the investment), the same amount deducted from its principal (MF) or maturity amount (FD / RD), and —
 * when `close` is set — the investment marked closed. Everything lands in History.
 */
export function redeem(inv: Investment, date: string, amount: number, close: boolean) {
  const b = batch()
  const type = inv.type as keyof typeof CREDIT
  db.transactions.addIn(b, {
    kind: 'credit', category: CREDIT[type], amount, date, investmentId: inv.id,
    note: `${inv.name} – ${close ? 'closed' : 'redemption'}`,
  })
  const patch: Partial<Investment> = isFixedDeposit(inv)
    ? { maturityAmount: Math.max(0, baseOf(inv) - amount) }
    : {
        investedAmount: Math.max(0, (inv.investedAmount ?? 0) - amount),
        // The holding is worth less by what was taken out, so Return % isn't skewed by the smaller principal.
        currentValue: Math.max(0, (inv.currentValue ?? 0) - amount),
      }
  if (close) Object.assign(patch, { closed: true, closedDate: date })
  db.investments.updateIn(b, inv, patch)
  commit(b)
}

export function RedeemSheet({ fund, onClose }: { fund: Investment; onClose: () => void }) {
  const fixed = isFixedDeposit(fund)
  const principal = baseOf(fund)
  const [date, setDate] = useState(today())
  // FD / RD are usually withdrawn whole — start from the maturity amount.
  const [amount, setAmount] = useState(fixed && principal ? String(principal) : '')
  const [close, setClose] = useState(false)
  const value = Number(amount)
  const after = Math.max(0, principal - (value > 0 ? value : 0))
  const baseLabel = fixed ? 'Maturity amount' : 'Principal'

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!(value > 0)) return
    redeem(fund, date, value, close)
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
            <span>{fixed ? 'Amount received (₹)' : 'Amount redeemed (₹)'}</span>
            <input type="number" inputMode="decimal" step="any" min="0.01" value={amount} required autoFocus onChange={(e) => setAmount(e.target.value)} />
            <small>
              {baseLabel} {money(principal)} → <b>{money(after)}</b>
              {value > principal && ` · more than the ${baseLabel.toLowerCase()}, so it becomes ₹0`}
            </small>
          </label>
          <label className="field-check">
            <input type="checkbox" checked={close} onChange={(e) => setClose(e.target.checked)} />
            <span>Mark as closed<small>Fully redeemed. It moves to “Closed” and no longer counts in totals, SIPs or bank balances.</small></span>
          </label>
          <p className="muted">Also adds a credit “{fund.type === 'MUTUAL_FUND' ? 'MF Redemption' : fund.type === 'FD' ? 'FD Maturity' : 'RD Maturity'}” on {niceDate(date)} to Cash flow.</p>
        </div>
        <div className="sheet-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">{close ? 'Redeem & close' : 'Redeem'}</button>
        </div>
      </form>
    </div>
  )
}
