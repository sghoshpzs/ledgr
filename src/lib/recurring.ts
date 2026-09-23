import { monthKey, toISO } from '@/lib/format'
import type { Transaction } from '@/types'

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

/**
 * Every transaction that counts in `month`: one-time entries dated in it, plus each active recurring
 * debit as a copy dated on its debit day in that month.
 */
export function txInMonth(all: Transaction[], month: string): Transaction[] {
  const out: Transaction[] = []
  const recurring = new Map<string, Transaction>()
  for (const t of all) {
    if (!isRecurring(t)) { if (monthKey(t.date) === month) out.push(t); continue }
    if (!activeIn(t, month)) continue
    const prev = recurring.get(expenseKey(t))
    if (!prev || t.date > prev.date) recurring.set(expenseKey(t), t)
  }
  for (const t of recurring.values()) out.push({ ...t, date: dayInMonth(month, debitDayOf(t)) })
  return out
}

/** Recurring debits falling between `from` and `until` (inclusive), each dated on its debit day. */
export function recurringBetween(all: Transaction[], from: string, until: string): Transaction[] {
  const out: Transaction[] = []
  for (let m = monthKey(from); m <= monthKey(until); m = toISO(new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 1)).slice(0, 7))
    for (const t of txInMonth(all, m)) if (isRecurring(t) && t.date >= from && t.date <= until) out.push(t)
  return out
}
