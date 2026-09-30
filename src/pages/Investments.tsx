import { useMemo, useState } from 'react'
import { db, useTable } from '@/db/db'
import { CrudList, type Field } from '@/components/CrudList'
import { Chips, PageHead, Stat } from '@/components/ui'
import { label, money, niceDate, pct } from '@/lib/format'
import type { Investment } from '@/types'
import { isFixedDeposit, isOpen, isRedeemable, isSip, marketReturn } from '@/lib/investments'
import { ordinal } from '@/lib/recurring'
import { RedeemSheet } from '@/components/RedeemSheet'
import { BROKERS, FUND_HOUSES, PPF_BANKS, bankAccountOptions, toOptions } from '@/config/dropdowns'

const LONG = ['MUTUAL_FUND', 'PPF', 'NPS', 'GRATUITY', 'STOCK']
const SHORT = ['FD', 'RD', 'STOCK']
const opts = (xs: string[]) => xs.map((v) => ({ value: v, label: label(v) }))

const DAYS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: ordinal(i + 1) }))
const sipOn = (d: Record<string, string>) => d.type === 'MUTUAL_FUND' && d.recurring === 'true'

/** Selects save text; the SIP day is a number. */
function prepare(row: Record<string, unknown>) {
  if (row.sipDay !== undefined) row.sipDay = Number(row.sipDay)
  return row
}

/** Stocks, and mutual funds held in demat, sit with a broker in a demat account. */
const inDemat = (d: Record<string, string>) => d.type === 'STOCK' || (d.type === 'MUTUAL_FUND' && d.dematHolding === 'true')

const fields: Field[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'horizon', label: 'Horizon', type: 'select', required: true,
    options: [{ value: 'long', label: 'Long term' }, { value: 'short', label: 'Short term' }] },
  { key: 'type', label: 'Type', type: 'select', required: true, options: (d) => opts(d.horizon === 'short' ? SHORT : LONG) },
  { key: 'fundHouse', label: 'Fund house', type: 'select', required: true, options: toOptions(FUND_HOUSES), show: (d) => d.type === 'MUTUAL_FUND' },
  { key: 'bank', label: 'Bank', type: 'select', required: true, options: toOptions(PPF_BANKS), show: (d) => d.type === 'PPF' },
  { key: 'dematHolding', label: 'Demat holding', type: 'checkbox', show: (d) => d.type === 'MUTUAL_FUND',
    hint: 'Units are held in your demat account (through a broker) instead of a folio.' },
  { key: 'broker', label: 'Broker', type: 'select', required: true, options: toOptions(BROKERS), show: inDemat },
  { key: 'folioNumber', label: 'Folio number', type: 'text', show: (d) => d.type === 'MUTUAL_FUND' && d.dematHolding !== 'true' },
  { key: 'ppfAccountNumber', label: 'PPF account number', type: 'text', show: (d) => d.type === 'PPF' },
  { key: 'pran', label: 'PRAN', type: 'text', hint: 'Permanent Retirement Account Number (12 digits).', show: (d) => d.type === 'NPS' },
  { key: 'dematAccountNumber', label: 'Demat account number', type: 'text', hint: 'DP ID + Client ID (16 characters).', show: inDemat },
  { key: 'fdNumber', label: 'FD number', type: 'text', show: (d) => d.type === 'FD' },
  { key: 'rdNumber', label: 'RD number', type: 'text', show: (d) => d.type === 'RD' },
  { key: 'investedAmount', label: 'Amount invested (₹)', type: 'number', required: true, show: (d) => !isFixedDeposit(d) },
  { key: 'currentValue', label: 'Current value (₹)', type: 'number', required: true, hint: 'Update this whenever you check your statement.', show: (d) => !isFixedDeposit(d) },
  { key: 'maturityAmount', label: 'Maturity amount (₹)', type: 'number', required: true, hint: 'What the bank pays out at maturity.', show: (d) => isFixedDeposit(d) },
  { key: 'startDate', label: 'Start date', type: 'date', required: true },
  { key: 'debitBank', label: 'Debit from (your bank)', type: 'select', options: bankAccountOptions(), hint: 'Account the contributions are paid from.' },
  { key: 'recurring', label: 'Recurring (SIP)', type: 'checkbox', defaultChecked: true, show: (d) => d.type === 'MUTUAL_FUND',
    hint: 'A monthly SIP, debited on a fixed date. Untick for a one-time lump-sum investment.' },
  { key: 'monthlyContribution', label: 'Monthly contribution (₹)', type: 'number', show: (d) => ['RD', 'NPS'].includes(d.type) || sipOn(d) },
  { key: 'sipDay', label: 'SIP date of the month', type: 'select', required: true, options: DAYS, show: sipOn,
    hint: 'In shorter months it is debited on the last day.' },
  { key: 'sipPaused', label: 'Paused', type: 'checkbox', show: sipOn,
    hint: 'SIP stopped — it no longer counts in the month’s invested amount or bank balance.' },
  { key: 'lastTxnDate', label: 'Last transaction date', type: 'date', show: (d) => sipOn(d) && d.sipPaused === 'true' },
  { key: 'interestRate', label: 'Interest rate (% a year)', type: 'number', show: (d) => ['FD', 'RD', 'PPF'].includes(d.type) },
  { key: 'maturityDate', label: 'Maturity date', type: 'date', show: (d) => ['FD', 'RD', 'PPF', 'NPS'].includes(d.type) },
  { key: 'closed', label: 'Closed', type: 'checkbox', show: (d) => isRedeemable(d),
    hint: 'Fully redeemed — kept for the record but left out of all totals. Untick to reopen.' },
  { key: 'closedDate', label: 'Closed on', type: 'date', show: (d) => d.closed === 'true' && isRedeemable(d) },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]

export default function Investments() {
  const [tab, setTab] = useState<'long' | 'short'>('long')
  const stored = useTable('investments')
  // SIPs saved before the SIP date existed: assume the day they started, so the form shows (and keeps) that.
  const all = useMemo(() => stored?.map((i) => (isSip(i) && !i.sipDay ? { ...i, sipDay: Number(i.startDate.slice(8, 10)) } : i)), [stored])
  const [showClosed, setShowClosed] = useState(false)
  const inTab = useMemo(() => all?.filter((r) => r.horizon === tab), [all, tab])
  const open = useMemo(() => inTab?.filter(isOpen), [inTab])
  const closedCount = (inTab?.length ?? 0) - (open?.length ?? 0)
  // Closed ones (when shown) go last.
  const rows = showClosed ? inTab && [...inTab].sort((a, b) => Number(!!a.closed) - Number(!!b.closed)) : open
  const [redeeming, setRedeeming] = useState<Investment | null>(null)

  const market = marketReturn(open ?? [])
  const fixed = open?.filter(isFixedDeposit) ?? []
  const atMaturity = fixed.reduce((s, r) => s + (r.maturityAmount ?? r.currentValue ?? 0), 0)

  return (
    <>
      <PageHead title="Investments" />
      <Chips value={tab} onChange={setTab} options={[{ value: 'long', label: 'Long term' }, { value: 'short', label: 'Short term' }]} />
      <div className="stats">
        {/* Return % covers market-linked investments only; FD / RD have a fixed rate shown on each row. */}
        {(market.count > 0 || fixed.length === 0) && <>
          <Stat label="Invested" value={money(market.invested)} />
          <Stat label="Current value" value={money(market.current)} />
          <Stat label="Return" value={pct(market.pct)} tone={market.pct >= 0 ? 'ok' : 'bad'} />
        </>}
        {fixed.length > 0 && <Stat label="FD & RD at maturity" value={money(atMaturity)} sub={`${fixed.length} deposit${fixed.length === 1 ? '' : 's'}`} />}
      </div>
      {closedCount > 0 && (
        <button className="btn btn-small closed-toggle" onClick={() => setShowClosed((v) => !v)}>
          {showClosed ? 'Hide' : 'Show'} closed ({closedCount})
        </button>
      )}
      <CrudList<Investment>
        table={db.investments}
        rows={rows}
        fields={fields}
        defaults={{ sipDay: String(new Date().getDate()), horizon: tab, type: tab === 'short' ? 'FD' : 'MUTUAL_FUND' }}
        noun="investment"
        prepare={prepare}
        empty={tab === 'long' ? 'No long-term investments yet. Add a mutual fund, PPF, NPS, gratuity or stock.' : 'No short-term investments yet. Add an FD, RD or stock.'}
        view={(r) => ({
          title: r.name,
          sub: [
            label(r.type), r.fundHouse ?? r.bank ?? r.broker, r.type === 'MUTUAL_FUND' && r.dematHolding && `demat${r.broker ? ' · ' + r.broker : ''}`, r.maturityDate && `matures ${niceDate(r.maturityDate)}`,
            r.type === 'MUTUAL_FUND' && !r.closed && (!isSip(r) ? 'lump sum'
              : r.sipPaused ? (r.lastTxnDate ? `SIP paused · last ${niceDate(r.lastTxnDate)}` : 'SIP paused')
              : r.monthlyContribution ? `SIP ${money(r.monthlyContribution)}${r.sipDay ? ` on the ${ordinal(r.sipDay)}` : ''}` : 'SIP'),
            r.closed && `closed${r.closedDate ? ' ' + niceDate(r.closedDate) : ''}`,
          ].filter(Boolean).join(' · '),
          ...(isFixedDeposit(r)
            ? { value: money(r.maturityAmount ?? r.currentValue ?? 0), valueSub: r.interestRate !== undefined ? `${r.interestRate}% p.a.` : 'at maturity' }
            : { value: money(r.currentValue ?? 0), valueSub: `invested ${money(r.investedAmount ?? 0)}` }),
          ...(r.closed && { badge: { text: 'closed', tone: 'info' as const } }),
        })}
        actions={(r) => isRedeemable(r) && !r.closed && <button className="btn btn-small" onClick={() => setRedeeming(r)}>Redeem</button>}
      />
      {redeeming && <RedeemSheet fund={redeeming} onClose={() => setRedeeming(null)} />}
    </>
  )
}
