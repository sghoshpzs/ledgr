import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useTable } from '@/db/db'
import { PageHead, Stat } from '@/components/ui'
import { BankChart } from '@/components/BankChart'
import { monthNeedByBank } from '@/lib/banks'
import { txInMonth } from '@/lib/recurring'
import { contributesIn } from '@/lib/investments'
import { CHART_COLORS } from '@/lib/palette'
import { label, money, monthlyEquivalent, monthKey, today } from '@/lib/format'

export default function Monthly() {
  const [month, setMonth] = useState(monthKey(today()))
  const allTx = useTable('transactions')
  const liabs = useTable('liabilities')
  const invs = useTable('investments')
  const items = useTable('items')
  const data = useMemo(() => allTx && liabs && {
    tx: txInMonth(allTx, month), // one-time entries of the month + recurring debits active in it
    committed: liabs.reduce((s, l) => s + monthlyEquivalent(l.amount, l.frequency), 0),
  }, [allTx, liabs, month])

  const tx = data?.tx ?? []
  const totalOf = (kind: 'credit' | 'debit') => tx.filter((t) => t.kind === kind).reduce((s, t) => s + t.amount, 0)
  const credits = totalOf('credit')
  const debits = totalOf('debit')

  const byCategory = Object.entries(
    tx.filter((t) => t.kind === 'debit').reduce<Record<string, number>>((m, t) => ({ ...m, [t.category]: (m[t.category] ?? 0) + t.amount }), {}),
  ).map(([k, v]) => ({ name: label(k), value: v })).sort((a, b) => b.value - a.value)

  // Invested = running (not paused) mutual-fund SIPs of the month + debits logged in the Investment category.
  const sips = invs?.filter((i) => i.type === 'MUTUAL_FUND' && contributesIn(i, month)) ?? []
  const sipTotal = sips.reduce((s, i) => s + (i.monthlyContribution ?? 0), 0)
  const loggedInvest = tx.filter((t) => t.kind === 'debit' && t.category === 'INVESTMENT').reduce((s, t) => s + t.amount, 0)
  const invested = sipTotal + loggedInvest

  const banks = useMemo(
    () => (allTx && liabs && invs && items ? monthNeedByBank(month, liabs, invs, items, allTx) : undefined),
    [month, allTx, liabs, invs, items],
  )

  const recurring = tx.filter((t) => t.kind === 'debit' && t.recurring).reduce((s, t) => s + t.amount, 0)
  const saved = credits - debits
  const rate = credits ? (saved / credits) * 100 : 0

  return (
    <>
      <PageHead title="Monthly cost distribution">
        <input className="month-input" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" />
      </PageHead>

      <div className="stats">
        <Stat label="Credited" value={money(credits)} tone="ok" />
        <Stat label="Spent" value={money(debits)} />
        <Stat label="Invested" value={money(invested)}
          sub={[sips.length && `${money(sipTotal)} in ${sips.length} SIP${sips.length === 1 ? '' : 's'}`, loggedInvest && `${money(loggedInvest)} logged`].filter(Boolean).join(' + ') || 'no SIPs or investment debits'} />
        <Stat label="Saved" value={money(saved)} sub={credits ? `${rate.toFixed(0)}% of credits` : undefined} tone={saved >= 0 ? 'ok' : 'bad'} />
        <Stat label="Recurring expenses" value={money(recurring)} sub="debits marked Recurring" />
        <Stat label="Fixed commitments" value={money(data?.committed ?? 0)} sub="EMIs + premiums, per month" />
      </div>

      {byCategory.length === 0 ? (
        <p className="empty">No spending recorded for this month. Add debits under Cash flow.</p>
      ) : (
        <section className="panel split">
          <div className="chart">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2} stroke="none" isAnimationActive={false}>
                  {byCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => money(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="legend">
            {byCategory.map((c, i) => (
              <li key={c.name}>
                <i style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span>{c.name}</span>
                <b>{money(c.value)}</b>
                <em>{debits ? Math.round((c.value / debits) * 100) : 0}%</em>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel stack">
        <h2>Balance to keep per debit account</h2>
        <p className="muted">EMIs, premiums, SIPs, renewals and recurring expenses scheduled for this month, by the account they are debited from.</p>
        {banks && banks.length === 0 && <p className="empty">Nothing scheduled this month. Set “Debit from” on your liabilities, investments, renewals and recurring debits.</p>}
        {banks && banks.length > 0 && <BankChart banks={banks} />}
      </section>
    </>
  )
}
