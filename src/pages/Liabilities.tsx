import { useMemo } from 'react'
import { batch, db, useTable } from '@/db/db'
import { CrudList, type Field } from '@/components/CrudList'
import { PageHead, Stat } from '@/components/ui'
import { addMonths, daysUntil, label, money, monthlyEquivalent, niceDate, today } from '@/lib/format'
import type { Liability } from '@/types'

const TYPES = ['HOME_LOAN_EMI', 'CAR_LOAN_EMI', 'CREDIT_CARD_EMI', 'HEALTH_INSURANCE', 'CAR_INSURANCE']
const STEP = { monthly: 1, quarterly: 3, yearly: 12 } as const

const fields: Field[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'type', label: 'Type', type: 'select', required: true, options: TYPES.map((v) => ({ value: v, label: label(v) })) },
  { key: 'amount', label: 'Amount per payment (₹)', type: 'number', required: true },
  { key: 'frequency', label: 'How often', type: 'select', required: true,
    options: [{ value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'yearly', label: 'Yearly' }] },
  { key: 'nextDueDate', label: 'Next due date', type: 'date', required: true },
  { key: 'outstanding', label: 'Outstanding balance (₹)', type: 'number', show: (d) => d.type.endsWith('_EMI') },
  { key: 'endDate', label: 'Last payment date', type: 'date', show: (d) => d.type.endsWith('_EMI') },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]

/** Records a debit and moves the due date forward by one period. */
async function markPaid(l: Liability) {
  const b = batch()
  db.transactions.addIn(b, {
    kind: 'debit',
    category: l.type.includes('INSURANCE') ? 'INSURANCE' : 'EMI',
    amount: l.amount, date: today(), note: l.name, liabilityId: l.id,
  })
  db.liabilities.updateIn(b, l.id!, { nextDueDate: addMonths(l.nextDueDate, STEP[l.frequency]) })
  // TODO: for loans, reduce `outstanding` using your lender's amortisation schedule.
  await b.commit()
}

export default function Liabilities() {
  const all = useTable('liabilities')
  const rows = useMemo(() => all && [...all].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)), [all])
  const monthly = rows?.reduce((s, r) => s + monthlyEquivalent(r.amount, r.frequency), 0) ?? 0
  const owed = rows?.reduce((s, r) => s + (r.outstanding ?? 0), 0) ?? 0

  return (
    <>
      <PageHead title="Liabilities" />
      <div className="stats">
        <Stat label="Monthly commitment" value={money(monthly)} sub="premiums averaged per month" />
        <Stat label="Outstanding loans" value={money(owed)} />
      </div>
      <CrudList<Liability>
        table={db.liabilities}
        rows={rows}
        fields={fields}
        defaults={{ type: 'HOME_LOAN_EMI', frequency: 'monthly' }}
        noun="liability"
        empty="No EMIs or premiums yet. Add your loans, credit card EMIs and insurance premiums."
        view={(r) => {
          const d = daysUntil(r.nextDueDate)
          return {
            title: r.name,
            sub: `${label(r.type)} · due ${niceDate(r.nextDueDate)}`,
            value: money(r.amount),
            badge: d < 0 ? { text: `${-d}d overdue`, tone: 'bad' } : d <= 7 ? { text: d === 0 ? 'due today' : `in ${d}d`, tone: 'warn' } : { text: r.frequency, tone: 'info' },
          }
        }}
        actions={(r) => <button className="btn btn-small" onClick={() => markPaid(r)}>Mark paid</button>}
      />
    </>
  )
}
