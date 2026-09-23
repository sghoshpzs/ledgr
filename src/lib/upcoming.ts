import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { daysUntil, label } from '@/lib/format'
import type { Investment, Liability, TrackedItem } from '@/types'

export interface Upcoming {
  id: string
  date: string
  days: number // negative = overdue
  title: string
  detail: string
  amount?: number
  kind: 'liability' | 'maturity' | 'renewal'
  to: string // route to open
}

/** Everything that needs attention soon, soonest first. Pure function — easy to unit test. */
export function buildUpcoming(
  liabilities: Liability[],
  investments: Investment[],
  items: TrackedItem[],
  liabilityWindow = 30,
  maturityWindow = 60,
): Upcoming[] {
  const out: Upcoming[] = []

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
        amount: i.currentValue, kind: 'maturity', to: '/invest',
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
  return useLiveQuery(async () => {
    const [l, i, t] = await Promise.all([db.liabilities.toArray(), db.investments.toArray(), db.items.toArray()])
    return buildUpcoming(l, i, t)
  }, [], [] as Upcoming[])
}
