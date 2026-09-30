import { addMonths, monthKey, today } from '@/lib/format'
import type { Liability, Transaction } from '@/types'

export const STEP = { monthly: 1, quarterly: 3, yearly: 12 } as const

/** Autopay is on unless explicitly turned off (older records have no flag). */
export const isAutopay = (l: Liability) => l.autopay !== false

const monthIndex = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1

/** The k-th instalment from the recorded due date (computed from the original date so 31st stays month-end). */
const nth = (l: Liability, k: number) => addMonths(l.nextDueDate, k * STEP[l.frequency])

/**
 * The due date that matters now. With autopay, instalments whose date has passed were debited
 * automatically, so it rolls forward to the next one on or after `from`. Manual-pay liabilities keep
 * their recorded date (it can be overdue). Undefined once the last payment date has passed.
 */
export function effectiveDue(l: Liability, from = today()): string | undefined {
  let d = l.nextDueDate
  if (isAutopay(l)) for (let k = 1; d < from && k < 1200; k++) d = nth(l, k)
  return l.endDate && d > l.endDate ? undefined : d
}

/** The instalment date falling in `month` (yyyy-mm) on this liability's schedule, if any. */
export function dueInMonth(l: Liability, month: string): string | undefined {
  const step = STEP[l.frequency]
  const diff = monthIndex(`${month}-01`) - monthIndex(l.nextDueDate)
  if (((diff % step) + step) % step !== 0) return undefined
  const d = addMonths(l.nextDueDate, diff)
  return l.endDate && d > l.endDate ? undefined : d
}

/**
 * Autopay instalments debited in `month`, as debit transactions for the month's totals. Only instalments
 * from the recorded due date up to today count (nothing before you added it, nothing in the future), and a
 * month already paid via "Mark paid" (a linked transaction) isn't counted twice.
 */
export function autopayDebits(liabilities: Liability[], transactions: Transaction[], month: string, upTo = today()): Transaction[] {
  const out: Transaction[] = []
  for (const l of liabilities) {
    if (!isAutopay(l)) continue
    const due = dueInMonth(l, month)
    if (!due || due < l.nextDueDate || due > upTo) continue
    if (transactions.some((t) => t.liabilityId === l.id && monthKey(t.date) === month)) continue
    out.push({
      id: `autopay-${l.id}-${due}`, kind: 'debit', category: l.type.includes('INSURANCE') ? 'INSURANCE' : 'EMI',
      amount: l.amount, date: due, note: l.name, liabilityId: l.id, debitBank: l.debitBank,
    })
  }
  return out
}
