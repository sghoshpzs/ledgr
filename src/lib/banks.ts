import { addMonths, label, niceDate, toISO, today } from '@/lib/format'
import type { Investment, Liability, TrackedItem, Transaction } from '@/types'

export const NOT_SET = 'Bank not set'
const STEP = { monthly: 1, quarterly: 3, yearly: 12 } as const

/** What kind of payment an outflow is — the segments of the per-bank chart. */
export type OutflowKind = 'liability' | 'investment' | 'renewal' | 'recurring'
export const KIND_LABEL: Record<OutflowKind, string> = {
  liability: 'EMIs & premiums', investment: 'Investments', renewal: 'Renewals', recurring: 'Recurring expenses',
}
export const KINDS = Object.keys(KIND_LABEL) as OutflowKind[]

export interface Outflow { title: string; detail: string; amount: number; kind: OutflowKind }
export interface BankNeed { bank: string; total: number; lines: Outflow[]; byKind: Record<OutflowKind, number> }

function group(outflows: { bank?: string; o: Outflow }[]): BankNeed[] {
  const byBank = new Map<string, Outflow[]>()
  for (const { bank, o } of outflows) byBank.set(bank || NOT_SET, [...(byBank.get(bank || NOT_SET) ?? []), o])
  return [...byBank]
    .map(([bank, lines]) => {
      const byKind = { liability: 0, investment: 0, renewal: 0, recurring: 0 }
      for (const o of lines) byKind[o.kind] += o.amount
      return { bank, byKind, lines: lines.sort((a, b) => b.amount - a.amount), total: lines.reduce((s, o) => s + o.amount, 0) }
    })
    .sort((a, b) => (a.bank === NOT_SET ? 1 : b.bank === NOT_SET ? -1 : b.total - a.total))
}

/**
 * Recurring debits repeat monthly: take the latest entry (up to `until`) of each distinct expense.
 * EMIs logged via "Mark paid" are skipped — they are already counted from Liabilities.
 */
function recurringDebits(transactions: Transaction[], until: string) {
  const latest = new Map<string, Transaction>()
  for (const tx of transactions) {
    if (tx.kind !== 'debit' || !tx.recurring || tx.liabilityId || tx.date > until) continue
    const key = `${tx.category}|${(tx.note ?? '').trim().toLowerCase()}|${tx.debitBank ?? ''}`
    const prev = latest.get(key)
    if (!prev || tx.date > prev.date) latest.set(key, tx)
  }
  return [...latest.values()].map((tx) => ({
    bank: tx.debitBank,
    o: { title: tx.note || label(tx.category), detail: `${label(tx.category)} · recurring monthly`, amount: tx.amount, kind: 'recurring' as const },
  }))
}

/**
 * What each of your bank accounts has to cover in the next `days` days — the balance to keep there.
 * Counts: EMIs / premiums falling due (overdue ones too, since they are still unpaid), monthly
 * SIP / RD / NPS contributions, renewals due, and recurring cash-flow debits. Pure function.
 */
export function balanceByBank(
  liabilities: Liability[], investments: Investment[], items: TrackedItem[], transactions: Transaction[], days = 30,
): BankNeed[] {
  const t = today()
  const end = new Date(t + 'T00:00:00')
  end.setDate(end.getDate() + days)
  const until = toISO(end)
  const out: { bank?: string; o: Outflow }[] = []

  for (const l of liabilities) {
    if (l.endDate && l.endDate < t) continue
    for (let d = l.nextDueDate, n = 0; d <= until && n < 24; d = addMonths(d, STEP[l.frequency]), n++)
      out.push({ bank: l.debitBank, o: { title: l.name, detail: `${label(l.type)} · ${d < t ? 'overdue since' : 'due'} ${niceDate(d)}`, amount: l.amount, kind: 'liability' } })
  }
  for (const i of investments) {
    if (!i.monthlyContribution || (i.maturityDate && i.maturityDate < t)) continue
    out.push({ bank: i.debitBank, o: { title: i.name, detail: `${label(i.type)} · monthly contribution`, amount: i.monthlyContribution, kind: 'investment' } })
  }
  for (const it of items) {
    if (!it.cost || it.expiryDate > until) continue
    out.push({ bank: it.debitBank, o: { title: it.name, detail: `${label(it.type)} · renews ${niceDate(it.expiryDate)}`, amount: it.cost, kind: 'renewal' } })
  }
  return group([...out, ...recurringDebits(transactions, t)])
}

const monthIndex = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1

/**
 * Planned debits for one calendar month (`yyyy-mm`), per bank: EMIs / premiums whose schedule falls in
 * that month, active SIP / RD / NPS contributions, renewals expiring that month, and recurring debits.
 */
export function monthNeedByBank(
  month: string, liabilities: Liability[], investments: Investment[], items: TrackedItem[], transactions: Transaction[],
): BankNeed[] {
  const start = `${month}-01`
  const last = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0) // day 0 of next month
  const end = toISO(last)
  const out: { bank?: string; o: Outflow }[] = []

  for (const l of liabilities) {
    if (l.endDate && l.endDate < start) continue
    const step = STEP[l.frequency]
    const diff = monthIndex(start) - monthIndex(l.nextDueDate)
    if (((diff % step) + step) % step !== 0) continue
    const due = addMonths(l.nextDueDate, diff)
    out.push({ bank: l.debitBank, o: { title: l.name, detail: `${label(l.type)} · due ${niceDate(due)}`, amount: l.amount, kind: 'liability' } })
  }
  for (const i of investments) {
    if (!i.monthlyContribution || i.startDate > end || (i.maturityDate && i.maturityDate < start)) continue
    out.push({ bank: i.debitBank, o: { title: i.name, detail: `${label(i.type)} · monthly contribution`, amount: i.monthlyContribution, kind: 'investment' } })
  }
  for (const it of items) {
    if (!it.cost || it.expiryDate < start || it.expiryDate > end) continue
    out.push({ bank: it.debitBank, o: { title: it.name, detail: `${label(it.type)} · renews ${niceDate(it.expiryDate)}`, amount: it.cost, kind: 'renewal' } })
  }
  return group([...out, ...recurringDebits(transactions, end)])
}
