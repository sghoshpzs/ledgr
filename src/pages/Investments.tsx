import { useMemo, useState } from 'react'
import { db, useTable } from '@/db/db'
import { CrudList, type Field } from '@/components/CrudList'
import { Chips, PageHead, Stat } from '@/components/ui'
import { label, money, niceDate, pct } from '@/lib/format'
import type { Investment } from '@/types'
import { BROKERS, FUND_HOUSES, PPF_BANKS, bankAccountOptions, toOptions } from '@/config/dropdowns'

const LONG = ['MUTUAL_FUND', 'PPF', 'NPS', 'GRATUITY', 'STOCK']
const SHORT = ['FD', 'RD', 'STOCK']
const opts = (xs: string[]) => xs.map((v) => ({ value: v, label: label(v) }))

const fields: Field[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'horizon', label: 'Horizon', type: 'select', required: true,
    options: [{ value: 'long', label: 'Long term' }, { value: 'short', label: 'Short term' }] },
  { key: 'type', label: 'Type', type: 'select', required: true, options: (d) => opts(d.horizon === 'short' ? SHORT : LONG) },
  { key: 'fundHouse', label: 'Fund house', type: 'select', required: true, options: toOptions(FUND_HOUSES), show: (d) => d.type === 'MUTUAL_FUND' },
  { key: 'bank', label: 'Bank', type: 'select', required: true, options: toOptions(PPF_BANKS), show: (d) => d.type === 'PPF' },
  { key: 'broker', label: 'Broker', type: 'select', required: true, options: toOptions(BROKERS), show: (d) => d.type === 'STOCK' },
  { key: 'folioNumber', label: 'Folio number', type: 'text', show: (d) => d.type === 'MUTUAL_FUND' },
  { key: 'ppfAccountNumber', label: 'PPF account number', type: 'text', show: (d) => d.type === 'PPF' },
  { key: 'pran', label: 'PRAN', type: 'text', hint: 'Permanent Retirement Account Number (12 digits).', show: (d) => d.type === 'NPS' },
  { key: 'dematAccountNumber', label: 'Demat account number', type: 'text', hint: 'DP ID + Client ID (16 characters).', show: (d) => d.type === 'STOCK' },
  { key: 'fdNumber', label: 'FD number', type: 'text', show: (d) => d.type === 'FD' },
  { key: 'rdNumber', label: 'RD number', type: 'text', show: (d) => d.type === 'RD' },
  { key: 'investedAmount', label: 'Amount invested (₹)', type: 'number', required: true },
  { key: 'currentValue', label: 'Current value (₹)', type: 'number', required: true, hint: 'Update this whenever you check your statement.' },
  { key: 'startDate', label: 'Start date', type: 'date', required: true },
  { key: 'debitBank', label: 'Debit from (your bank)', type: 'select', options: bankAccountOptions(), hint: 'Account the contributions are paid from.' },
  { key: 'monthlyContribution', label: 'Monthly contribution (₹)', type: 'number', show: (d) => ['RD', 'NPS', 'MUTUAL_FUND'].includes(d.type) },
  { key: 'interestRate', label: 'Interest rate (% a year)', type: 'number', show: (d) => ['FD', 'RD', 'PPF'].includes(d.type) },
  { key: 'maturityDate', label: 'Maturity date', type: 'date', show: (d) => ['FD', 'RD', 'PPF', 'NPS'].includes(d.type) },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]

export default function Investments() {
  const [tab, setTab] = useState<'long' | 'short'>('long')
  const all = useTable('investments')
  const rows = useMemo(() => all?.filter((r) => r.horizon === tab), [all, tab])

  const invested = rows?.reduce((s, r) => s + r.investedAmount, 0) ?? 0
  const current = rows?.reduce((s, r) => s + r.currentValue, 0) ?? 0
  const gain = invested ? ((current - invested) / invested) * 100 : 0

  return (
    <>
      <PageHead title="Investments" />
      <Chips value={tab} onChange={setTab} options={[{ value: 'long', label: 'Long term' }, { value: 'short', label: 'Short term' }]} />
      <div className="stats">
        <Stat label="Invested" value={money(invested)} />
        <Stat label="Current value" value={money(current)} />
        <Stat label="Return" value={pct(gain)} tone={gain >= 0 ? 'ok' : 'bad'} />
      </div>
      <CrudList<Investment>
        table={db.investments}
        rows={rows}
        fields={fields}
        defaults={{ horizon: tab, type: tab === 'short' ? 'FD' : 'MUTUAL_FUND' }}
        noun="investment"
        empty={tab === 'long' ? 'No long-term investments yet. Add a mutual fund, PPF, NPS, gratuity or stock.' : 'No short-term investments yet. Add an FD, RD or stock.'}
        view={(r) => ({
          title: r.name,
          sub: [label(r.type), r.fundHouse ?? r.bank ?? r.broker, r.maturityDate && `matures ${niceDate(r.maturityDate)}`].filter(Boolean).join(' · '),
          value: money(r.currentValue),
          valueSub: `invested ${money(r.investedAmount)}`,
        })}
      />
    </>
  )
}
