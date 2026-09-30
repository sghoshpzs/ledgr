import { money } from '@/lib/format'
import type { Investment, Transaction } from '@/types'

/** FD and RD are tracked by their maturity amount only (fixed rate — no invested / current / return). */
export const isFixedDeposit = (i: { type?: string }) => i.type === 'FD' || i.type === 'RD'

/** MF, FD and RD can be redeemed (and closed) from their row. */
export const isRedeemable = (i: { type?: string }) => i.type === 'MUTUAL_FUND' || isFixedDeposit(i)

export const isOpen = (i: Investment) => !i.closed

/** The value an investment counts for in totals: maturity amount for FD / RD, current value otherwise. */
export const valueOf = (i: Investment) =>
  isFixedDeposit(i) ? i.maturityAmount ?? i.currentValue ?? 0 : i.currentValue ?? 0

/** Invested vs current value of the market-linked investments only — the basis for Return %. */
export function marketReturn(list: Investment[]) {
  const market = list.filter((i) => !isFixedDeposit(i))
  const invested = market.reduce((s, i) => s + (i.investedAmount ?? 0), 0)
  const current = market.reduce((s, i) => s + (i.currentValue ?? 0), 0)
  return { count: market.length, invested, current, pct: invested ? ((current - invested) / invested) * 100 : 0 }
}

/**
 * Whether an investment's monthly contribution (SIP / RD / NPS) is debited in `month` (yyyy-mm):
 * started by then, not matured, and — for a paused mutual fund — only up to its last instalment's month.
 */
export function contributesIn(i: Investment, month: string) {
  if (!i.monthlyContribution || i.startDate.slice(0, 7) > month) return false
  if (i.maturityDate && i.maturityDate.slice(0, 7) < month) return false
  if (i.closed && (!i.closedDate || i.closedDate.slice(0, 7) < month)) return false
  if (i.sipPaused) return !!i.lastTxnDate && month <= i.lastTxnDate.slice(0, 7)
  return true
}

/**
 * Invested in a month: running (not paused, not closed) mutual-fund SIPs, plus debits logged in the
 * Investment category. `monthTx` is the month's transactions as counted (txInMonth + autopay).
 */
export function investedIn(month: string, investments: Investment[], monthTx: Transaction[]) {
  const sips = investments.filter((i) => i.type === 'MUTUAL_FUND' && contributesIn(i, month))
  const sipTotal = sips.reduce((s, i) => s + (i.monthlyContribution ?? 0), 0)
  const logged = monthTx.filter((t) => t.kind === 'debit' && t.category === 'INVESTMENT').reduce((s, t) => s + t.amount, 0)
  const summary = [
    sips.length > 0 && `${money(sipTotal)} in ${sips.length} SIP${sips.length === 1 ? '' : 's'}`,
    logged > 0 && `${money(logged)} logged`,
  ].filter(Boolean).join(' + ') || 'no SIPs or investment debits'
  return { total: sipTotal + logged, summary }
}
