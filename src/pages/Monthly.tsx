import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { db } from '@/db/db'
import { PageHead, Stat } from '@/components/ui'
import { CHART_COLORS } from '@/lib/palette'
import { label, money, monthlyEquivalent, monthKey, today } from '@/lib/format'

export default function Monthly() {
  const [month, setMonth] = useState(monthKey(today()))
  const data = useLiveQuery(async () => {
    const [tx, liabs] = await Promise.all([
      db.transactions.where('date').between(`${month}-01`, `${month}-32`, true, true).toArray(),
      db.liabilities.toArray(),
    ])
    return { tx, committed: liabs.reduce((s, l) => s + monthlyEquivalent(l.amount, l.frequency), 0) }
  }, [month])

  const tx = data?.tx ?? []
  const totalOf = (kind: 'credit' | 'debit') => tx.filter((t) => t.kind === kind).reduce((s, t) => s + t.amount, 0)
  const credits = totalOf('credit')
  const debits = totalOf('debit')

  const byCategory = Object.entries(
    tx.filter((t) => t.kind === 'debit').reduce<Record<string, number>>((m, t) => ({ ...m, [t.category]: (m[t.category] ?? 0) + t.amount }), {}),
  ).map(([k, v]) => ({ name: label(k), value: v })).sort((a, b) => b.value - a.value)

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
        <Stat label="Saved" value={money(saved)} sub={credits ? `${rate.toFixed(0)}% of credits` : undefined} tone={saved >= 0 ? 'ok' : 'bad'} />
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
    </>
  )
}
