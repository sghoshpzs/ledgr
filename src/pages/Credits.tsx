import { useMemo, useState } from 'react'
import { db, useTable } from '@/db/db'
import { CrudList, type Field } from '@/components/CrudList'
import { Chips, PageHead, Stat } from '@/components/ui'
import { label, money, monthKey, niceDate, today } from '@/lib/format'
import type { Transaction } from '@/types'
import { CREDIT_SOURCES, DEBIT_CATEGORIES, bankAccountOptions } from '@/config/dropdowns'

const opts = (xs: readonly string[]) => xs.map((v) => ({ value: v, label: label(v) }))

const fields: Field[] = [
  { key: 'kind', label: 'Type', type: 'select', required: true, options: [{ value: 'credit', label: 'Credit (money in)' }, { value: 'debit', label: 'Debit (money out)' }] },
  { key: 'category', label: 'Category', type: 'select', required: true, options: (d) => opts(d.kind === 'debit' ? DEBIT_CATEGORIES : CREDIT_SOURCES) },
  { key: 'amount', label: 'Amount (₹)', type: 'number', required: true },
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'debitBank', label: 'Debit from (your bank)', type: 'select', options: bankAccountOptions(), show: (d) => d.kind === 'debit' },
  { key: 'recurring', label: 'Recurring', type: 'checkbox', hint: 'A fixed expense that repeats every month (rent, fees, bills, subscriptions).', show: (d) => d.kind === 'debit' },
  { key: 'note', label: 'Note', type: 'text' },
]

type Filter = 'all' | 'credit' | 'debit'

export default function Credits() {
  const [filter, setFilter] = useState<Filter>('all')
  const tx = useTable('transactions')
  const all = useMemo(() => tx && [...tx].sort((a, b) => b.date.localeCompare(a.date)), [tx])
  const rows = all?.filter((t) => filter === 'all' || t.kind === filter)

  const month = monthKey(today())
  const inThisMonth = all?.filter((t) => monthKey(t.date) === month) ?? []
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
        defaults={{ kind: filter === 'debit' ? 'debit' : 'credit', category: filter === 'debit' ? 'GROCERIES' : 'SALARY', date: today() }}
        noun={filter === 'debit' ? 'debit' : 'credit'}
        empty="Nothing here yet. Add your salary credit first, then investment credits and spending."
        view={(t) => ({
          title: t.note || label(t.category),
          sub: [label(t.category), niceDate(t.date), t.debitBank, t.recurring && 'recurring'].filter(Boolean).join(' · '),
          value: `${t.kind === 'credit' ? '+' : '−'}${money(t.amount)}`,
          badge: { text: t.kind, tone: t.kind === 'credit' ? 'ok' : 'info' },
        })}
      />
    </>
  )
}
