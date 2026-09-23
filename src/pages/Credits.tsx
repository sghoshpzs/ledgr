import { useMemo, useState } from 'react'
import { db, useTable } from '@/db/db'
import { CrudList, type Field } from '@/components/CrudList'
import { Chips, PageHead, Stat } from '@/components/ui'
import { label, money, monthKey, niceDate, today } from '@/lib/format'
import type { Transaction } from '@/types'
import { CREDIT_SOURCES, DEBIT_CATEGORIES, bankAccountOptions } from '@/config/dropdowns'
import { dayInMonth, debitDayOf, isRecurring, ordinal, txInMonth } from '@/lib/recurring'

const opts = (xs: readonly string[]) => xs.map((v) => ({ value: v, label: label(v) }))

const DAYS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: ordinal(i + 1) }))
const recurringOn = (d: Record<string, string>) => d.kind === 'debit' && d.recurring === 'true'

/** A recurring debit has no calendar date in the form; its `date` records the month it started. */
function prepare(row: Record<string, unknown>, before: Transaction | null) {
  if (row.kind === 'debit' && row.recurring) {
    row.debitDay = Number(row.debitDay)
    row.date = before?.recurring ? before.date : dayInMonth(monthKey(today()), row.debitDay as number)
  }
  return row
}

const monthName = (m: string) => new Date(m + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })

const fields: Field[] = [
  { key: 'kind', label: 'Type', type: 'select', required: true, options: [{ value: 'credit', label: 'Credit (money in)' }, { value: 'debit', label: 'Debit (money out)' }] },
  { key: 'category', label: 'Category', type: 'select', required: true, options: (d) => opts(d.kind === 'debit' ? DEBIT_CATEGORIES : CREDIT_SOURCES) },
  { key: 'amount', label: 'Amount (₹)', type: 'number', required: true },
  { key: 'recurring', label: 'Recurring', type: 'checkbox', hint: 'A fixed expense debited every month (rent, fees, bills, subscriptions).', show: (d) => d.kind === 'debit' },
  { key: 'debitDay', label: 'Debit date of the month', type: 'select', required: true, options: DAYS, show: recurringOn,
    hint: 'In shorter months it is taken on the last day.' },
  { key: 'endMonth', label: 'Last month (optional)', type: 'month', show: recurringOn, hint: 'Leave empty if it continues.' },
  { key: 'date', label: 'Date', type: 'date', required: true, show: (d) => !recurringOn(d) },
  { key: 'debitBank', label: 'Debit from (your bank)', type: 'select', options: bankAccountOptions(), show: (d) => d.kind === 'debit' },
  { key: 'note', label: 'Note', type: 'text' },
]

type Filter = 'all' | 'credit' | 'debit'

export default function Credits() {
  const [filter, setFilter] = useState<Filter>('all')
  const tx = useTable('transactions')
  // Recurring expenses first (by debit day), then one-time entries newest first.
  // Older recurring entries have no debitDay yet — show the day they were logged on, so editing keeps it.
  const all = useMemo(() => tx && tx.map((t) => (isRecurring(t) && !t.debitDay ? { ...t, debitDay: debitDayOf(t) } : t)).sort((a, b) =>
    Number(isRecurring(b)) - Number(isRecurring(a)) ||
    (isRecurring(a) ? debitDayOf(a) - debitDayOf(b) : b.date.localeCompare(a.date))), [tx])
  const rows = all?.filter((t) => filter === 'all' || t.kind === filter)

  const month = monthKey(today())
  const inThisMonth = all ? txInMonth(all, month) : []
  const credits = inThisMonth.filter((t) => t.kind === 'credit').reduce((s, t) => s + t.amount, 0)
  const debits = inThisMonth.filter((t) => t.kind === 'debit').reduce((s, t) => s + t.amount, 0)

  return (
    <>
      <PageHead title="Cash flow" />
      <div className="stats">
        <Stat label="Credited this month" value={money(credits)} tone="ok" />
        <Stat label="Spent this month" value={money(debits)} />
        <Stat label="Left over" value={money(credits - debits)} tone={credits - debits >= 0 ? 'ok' : 'bad'} />
      </div>
      <Chips value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'credit', label: 'Credits' }, { value: 'debit', label: 'Debits' }]} />
      <CrudList<Transaction>
        table={db.transactions}
        rows={rows}
        fields={fields}
        defaults={{ kind: filter === 'debit' ? 'debit' : 'credit', category: filter === 'debit' ? 'GROCERIES' : 'SALARY', date: today(), debitDay: String(new Date().getDate()) }}
        prepare={prepare}
        noun={filter === 'debit' ? 'debit' : 'credit'}
        empty="Nothing here yet. Add your salary credit first, then investment credits and spending."
        view={(t) => ({
          title: t.note || label(t.category),
          sub: [
            label(t.category),
            isRecurring(t) ? `every month on the ${ordinal(debitDayOf(t))}${t.endMonth ? ` until ${monthName(t.endMonth)}` : ''}` : niceDate(t.date),
            t.debitBank,
          ].filter(Boolean).join(' · '),
          value: `${t.kind === 'credit' ? '+' : '−'}${money(t.amount)}`,
          badge: isRecurring(t) ? { text: 'monthly', tone: 'warn' } : { text: t.kind, tone: t.kind === 'credit' ? 'ok' : 'info' },
        })}
      />
    </>
  )
}
