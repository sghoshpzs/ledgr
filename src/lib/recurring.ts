import { monthKey, toISO } from '@/lib/format'
import type { Payment, Transaction } from '@/types'

// A recurring debit is a standing monthly expense: it is saved once, with a debit day (1–31), and
// counts in every month from the month of its `date` (when it started) up to `endMonth` if set.
// One-time transactions simply count in the month of their `date`.

export const isRecurring = (t: Transaction) => t.kind === 'debit' && !!t.recurring

/** Older recurring entries have no debitDay — fall back to the day of their date. */
export const debitDayOf = (t: Transaction) => t.debitDay ?? Number(t.date.slice(8, 10))

/** The date in `month` (yyyy-mm) a debit on `day` falls on — the last day when the month is shorter. */
export function dayInMonth(month: string, day: number) {
  const last = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()
  return `${month}-${String(Math.min(day, last)).padStart(2, '0')}`
}

export const activeIn = (t: Transaction, month: string) =>
  monthKey(t.date) <= month && (!t.endMonth || month <= t.endMonth)

/** 1 -> "1st", 22 -> "22nd" */
export function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${s}`
}

/** Same expense logged more than once as recurring (older data) should count once — keep the latest. */
const expenseKey = (t: Transaction) => `${t.category}|${(t.note ?? '').trim().toLowerCase()}|${t.debitBank ?? ''}`

export const isEstimated = (t: Transaction) => !!t.estimated

/** yyyy-mm of the month after `month`. */
export const nextMonthOf = (month: string) => toISO(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).slice(0, 7)

/**
 * Credits marked "count for next month" (salary by default — it lands on the last working day and pays the
 * next month's expenses) count in the month after they arrive. Unset on a salary means on.
 */
export const forNextMonth = (t: Transaction) => t.kind === 'credit' && (t.nextMonth ?? t.category === 'SALARY')

/** The month whose totals money dated `date` on this entry counts in. */
export const countMonth = (t: Transaction, date: string) => (forNextMonth(t) ? nextMonthOf(monthKey(date)) : monthKey(date))

/** Actual payments recorded against an entry that count in `month`. */
export const paymentsIn = (t: Transaction, month: string) => (t.payments ?? []).filter((p) => countMonth(t, p.date) === month)

const actual = (t: Transaction, p: Payment): Transaction => ({ ...t, date: p.date, amount: p.amount, pending: false })

/**
 * Every transaction that counts in `month`, at the amount that counts:
 * - one-time entry: its actual payments in the month, if it has any; otherwise its own amount when dated
 *   in the month (flagged `pending` while it is still an estimate);
 * - recurring debit active in the month: that month's actual payments, else a copy on its debit day at the
 *   estimated / fixed amount.
 */
export function txInMonth(all: Transaction[], month: string): Transaction[] {
  const out: Transaction[] = []
  const recurring = new Map<string, Transaction>()
  for (const t of all) {
    if (!isRecurring(t)) {
      if (t.payments?.length) out.push(...paymentsIn(t, month).map((p) => actual(t, p)))
      else if (countMonth(t, t.date) === month) out.push(isEstimated(t) ? { ...t, pending: true } : t)
      continue
    }
    if (!activeIn(t, month) && !paymentsIn(t, month).length) continue
    const prev = recurring.get(expenseKey(t))
    if (!prev || t.date > prev.date) recurring.set(expenseKey(t), t)
  }
  for (const t of recurring.values()) {
    const paid = paymentsIn(t, month)
    if (paid.length) out.push(...paid.map((p) => actual(t, p)))
    else if (activeIn(t, month)) out.push({ ...t, date: dayInMonth(month, debitDayOf(t)), pending: isEstimated(t) })
  }
  return out
}

/** Recurring debits falling between `from` and `until` (inclusive), each dated on its debit day. */
export function recurringBetween(all: Transaction[], from: string, until: string): Transaction[] {
  const out: Transaction[] = []
  for (let m = monthKey(from); m <= monthKey(until); m = nextMonthOf(m))
    for (const t of txInMonth(all, m)) if (isRecurring(t) && t.date >= from && t.date <= until) out.push(t)
  return out
}
