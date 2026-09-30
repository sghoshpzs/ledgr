import { useMemo, useState } from 'react'
import { db, useTable } from '@/db/db'
import { CrudList, type Field } from '@/components/CrudList'
import { Chips, PageHead, Stat } from '@/components/ui'
import { label, money, monthKey, niceDate, today } from '@/lib/format'
import type { Transaction } from '@/types'
import { CATEGORY_GROUPS, CREDIT_SOURCES, DEBIT_CATEGORIES, bankAccountOptions, groupOf } from '@/config/dropdowns'
import { autopayDebits } from '@/lib/liabilities'
import { countMonth, dayInMonth, debitDayOf, forNextMonth, isEstimated, isRecurring, ordinal, paymentsIn, txInMonth } from '@/lib/recurring'
import { PaySheet } from '@/components/PaySheet'
import { investedIn } from '@/lib/investments'

const opts = (xs: readonly string[]) => xs.map((v) => ({ value: v, label: label(v) }))

const DAYS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: ordinal(i + 1) }))
const recurringOn = (d: Record<string, string>) => d.kind === 'debit' && d.recurring === 'true'

/** A recurring debit has no calendar date in the form; its `date` records the month it started. */
function prepare(row: Record<string, unknown>, before: Transaction | null) {
  // Unticking Estimated means the amount itself is the actual — drop recorded payments.
  // Store next-month explicitly on credits (unset means "on" for salary), and never on debits.
  if (row.kind === 'credit') row.nextMonth = !!row.nextMonth
  else delete row.nextMonth
  if (!row.estimated) delete row.payments
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
  { key: 'nextMonth', label: 'Count for next month', type: 'checkbox', show: (d) => d.kind === 'credit',
    hint: 'Arrives at the end of a month to pay the next month’s expenses (like salary on the last working day) — it counts in the next month’s totals.' },
  { key: 'estimated', label: 'Estimated', type: 'checkbox',
    hint: 'A planned amount. Record what was actually paid / received with Mark paid — it replaces the estimate in totals.' },
  { key: 'recurring', label: 'Recurring', type: 'checkbox', hint: 'A fixed expense debited every month (rent, fees, bills, subscriptions).', show: (d) => d.kind === 'debit' },
  { key: 'debitDay', label: 'Debit date of the month', type: 'select', required: true, options: DAYS, show: recurringOn,
    hint: 'In shorter months it is taken on the last day.' },
  { key: 'endMonth', label: 'Last month (optional)', type: 'month', show: recurringOn, hint: 'Leave empty if it continues.' },
  { key: 'date', label: 'Date', type: 'date', required: true, show: (d) => !recurringOn(d) },
  { key: 'debitBank', label: 'Debit from (your bank)', type: 'select', options: bankAccountOptions(), show: (d) => d.kind === 'debit' },
  { key: 'note', label: 'Note', type: 'text' },
]

type Filter = 'all' | 'credit' | 'debit'

const GROUP_NAMES = Object.keys(CATEGORY_GROUPS)
/** Groups in config order, "Other" (anything not listed) last. */
function groupOrder(a: string, b: string) {
  const i = (n: string) => (GROUP_NAMES.includes(n) ? GROUP_NAMES.indexOf(n) : GROUP_NAMES.length)
  return i(a) - i(b) || a.localeCompare(b)
}

export default function Credits() {
  const [filter, setFilter] = useState<Filter>('all')
  const [paying, setPaying] = useState<Transaction | null>(null)
  const [grouped, setGrouped] = useState(true)
  const tx = useTable('transactions')
  const liabs = useTable('liabilities')
  const invs = useTable('investments')
  // Recurring expenses first (by debit day), then one-time entries newest first.
  // Fill values older entries don't have yet, so the edit form shows (and keeps) how they already behave:
  // recurring debits get their debit day, salary credits get "count for next month" on.
  const all = useMemo(() => tx && tx.map((t) => ({
    ...t,
    ...(isRecurring(t) && !t.debitDay && { debitDay: debitDayOf(t) }),
    ...(t.kind === 'credit' && t.nextMonth === undefined && { nextMonth: forNextMonth(t) }),
  })).sort((a, b) =>
    Number(isRecurring(b)) - Number(isRecurring(a)) ||
    (isRecurring(a) ? debitDayOf(a) - debitDayOf(b) : b.date.localeCompare(a.date))), [tx])
  const rows = all?.filter((t) => filter === 'all' || t.kind === filter)

  const month = monthKey(today())
  const inThisMonth = all ? [...txInMonth(all, month), ...autopayDebits(liabs ?? [], all, month)] : []
  const invested = investedIn(month, invs ?? [], inThisMonth) // same figure as the Monthly page
  const credits = inThisMonth.filter((t) => t.kind === 'credit').reduce((s, t) => s + t.amount, 0)
  const debits = inThisMonth.filter((t) => t.kind === 'debit').reduce((s, t) => s + t.amount, 0)
  const pendingOf = (kind: 'credit' | 'debit') => inThisMonth.filter((t) => t.kind === kind && t.pending).reduce((s, t) => s + t.amount, 0)
  const estSub = (n: number) => (n ? `incl. ${money(n)} estimated` : undefined)

  return (
    <>
      <PageHead title="Cash flow" />
      <div className="stats">
        <Stat label="Credited this month" value={money(credits)} tone="ok" sub={estSub(pendingOf('credit'))} />
        <Stat label="Spent this month" value={money(debits)} sub={estSub(pendingOf('debit'))} />
        <Stat label="Invested this month" value={money(invested.total)} sub={invested.summary} />
        <Stat label="Left over" value={money(credits - debits)} tone={credits - debits >= 0 ? 'ok' : 'bad'} />
      </div>
      <div className="toolbar">
        <Chips value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'credit', label: 'Credits' }, { value: 'debit', label: 'Debits' }]} />
        <Chips value={grouped ? 'grouped' : 'list'} onChange={(v) => setGrouped(v === 'grouped')}
          options={[{ value: 'grouped', label: 'Grouped' }, { value: 'list', label: 'List' }]} />
      </div>
      <CrudList<Transaction>
        table={db.transactions}
        rows={rows}
        fields={fields}
        defaults={{ kind: filter === 'debit' ? 'debit' : 'credit', category: filter === 'debit' ? 'GROCERIES' : 'SALARY', date: today(), debitDay: String(new Date().getDate()), estimated: 'true', nextMonth: filter === 'debit' ? '' : 'true' }}
        prepare={prepare}
        // Grouped view: category group → entries.
        groupBy={grouped ? (t) => [groupOf(t.category)] : undefined}
        groupOrder={groupOrder}
        groupSummary={(list) => {
          const net = txInMonth(list, month).reduce((s, t) => s + (t.kind === 'credit' ? t.amount : -t.amount), 0)
          return <><span className="row-value">{net > 0 ? '+' : net < 0 ? '−' : ''}{money(Math.abs(net))}</span><span className="row-sub">this month</span></>
        }}
        noun={filter === 'debit' ? 'debit' : 'credit'}
        empty="Nothing here yet. Add your salary credit first, then investment credits and spending."
        view={(t) => {
          const sign = t.kind === 'credit' ? '+' : '−'
          // What's been actually paid: this month's payments for a recurring entry, all of them for a one-time one.
          const paid = isRecurring(t) ? paymentsIn(t, month) : t.payments ?? []
          const actual = paid.reduce((s, p) => s + p.amount, 0)
          const done = t.kind === 'credit' ? 'received' : 'paid'
          return {
            title: t.note || label(t.category),
            sub: [
              label(t.category),
              isRecurring(t) ? `every month on the ${ordinal(debitDayOf(t))}${t.endMonth ? ` until ${monthName(t.endMonth)}` : ''}` : niceDate(t.date),
              t.debitBank,
              isRecurring(t) && 'monthly',
              isEstimated(t) && paid.length > 0 && `est. ${money(t.amount)}`,
              forNextMonth(t) && `for ${monthName(countMonth(t, paid[0]?.date ?? t.date)).split(' ')[0]}`,
            ].filter(Boolean).join(' · '),
            value: `${sign}${money(paid.length ? actual : t.amount)}`,
            badge: !isEstimated(t) ? { text: t.kind, tone: t.kind === 'credit' ? 'ok' : 'info' }
              : paid.length ? { text: isRecurring(t) ? `${done} ${monthName(month).split(' ')[0]}` : done, tone: 'ok' }
              : { text: 'estimated', tone: 'warn' },
          }
        }}
        actions={(t) => {
          if (!isEstimated(t)) return null
          const paid = isRecurring(t) ? paymentsIn(t, month) : t.payments ?? []
          const undo = () => {
            const last = paid[paid.length - 1]
            if (last && confirm(`Remove the ${money(last.amount)} recorded on ${niceDate(last.date)}?`))
              db.transactions.update(t, { payments: (t.payments ?? []).filter((p) => p !== last) })
          }
          return (
            <>
              {paid.length > 0 && <button className="btn btn-small" onClick={undo}>Undo</button>}
              {paid.length === 0 && (
                <button className="btn btn-small" onClick={() => setPaying(t)}>{t.kind === 'credit' ? 'Mark received' : 'Mark paid'}</button>
              )}
            </>
          )
        }}
      />
      {paying && <PaySheet entry={paying} onClose={() => setPaying(null)} />}
    </>
  )
}
