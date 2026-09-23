import { useMemo } from 'react'
import { useTable } from '@/db/db'
import { daysUntil, label, today, toISO } from '@/lib/format'
import { recurringBetween } from '@/lib/recurring'
import { valueOf } from '@/lib/investments'
import type { Investment, Liability, TrackedItem, Transaction } from '@/types'

export interface Upcoming {
  id: string
  date: string
  days: number // negative = overdue
  title: string
  detail: string
  amount?: number
  kind: 'liability' | 'maturity' | 'renewal' | 'recurring'
  to: string // route to open
}

/** Everything that needs attention soon, soonest first. Pure function — easy to unit test. */
export function buildUpcoming(
  liabilities: Liability[],
  investments: Investment[],
  items: TrackedItem[],
  transactions: Transaction[] = [],
  liabilityWindow = 30,
  maturityWindow = 60,
  recurringWindow = 7,
): Upcoming[] {
  const out: Upcoming[] = []

  const t = today()
  const until = new Date(t + 'T00:00:00')
  until.setDate(until.getDate() + recurringWindow)
  for (const r of recurringBetween(transactions, t, toISO(until)))
    out.push({
      id: `r-${r.id}-${r.date}`, date: r.date, days: daysUntil(r.date), title: r.note || label(r.category),
      detail: `${label(r.category)} · recurring${r.debitBank ? ' · ' + r.debitBank : ''}`, amount: r.amount, kind: 'recurring', to: '/credits',
    })

  for (const l of liabilities) {
    const days = daysUntil(l.nextDueDate)
    if (days <= liabilityWindow)
      out.push({
        id: `l-${l.id}`, date: l.nextDueDate, days, title: l.name, detail: label(l.type),
        amount: l.amount, kind: 'liability', to: '/debts',
      })
  }
  for (const i of investments) {
    if (!i.maturityDate) continue
    const days = daysUntil(i.maturityDate)
    if (days >= 0 && days <= maturityWindow)
      out.push({
        id: `i-${i.id}`, date: i.maturityDate, days, title: `${i.name} matures`, detail: label(i.type),
        amount: valueOf(i), kind: 'maturity', to: '/invest',
      })
  }
  for (const t of items) {
    const days = daysUntil(t.expiryDate)
    if (days <= t.remindDaysBefore)
      out.push({
        id: `t-${t.id}`, date: t.expiryDate, days, title: t.name, detail: label(t.type),
        amount: t.cost, kind: 'renewal', to: '/items',
      })
  }
  return out.sort((a, b) => a.days - b.days)
}

export function useUpcoming() {
  const l = useTable('liabilities')
  const i = useTable('investments')
  const t = useTable('items')
  const tx = useTable('transactions')
  return useMemo(() => (l && i && t && tx ? buildUpcoming(l, i, t, tx) : []), [l, i, t, tx])
}
