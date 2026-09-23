import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useTable } from '@/db/db'
import { Badge, PageHead, Stat } from '@/components/ui'
import { useUpcoming } from '@/lib/upcoming'
import { balanceByBank, NOT_SET } from '@/lib/banks'
import { txInMonth } from '@/lib/recurring'
import { CHART_COLORS } from '@/lib/palette'
import { label, money, moneyShort, monthKey, monthlyEquivalent, niceDate, pct, today } from '@/lib/format'

export default function Dashboard() {
  const upcoming = useUpcoming()
  const inv = useTable('investments')
  const liab = useTable('liabilities')
  const tx = useTable('transactions')
  const items = useTable('items')
  const banks = useMemo(() => (inv && liab && tx && items ? balanceByBank(liab, inv, items, tx) : []), [inv, liab, tx, items])
  const s = useMemo(() => {
    if (!inv || !liab || !tx) return undefined
    const invested = inv.reduce((a, i) => a + i.investedAmount, 0)
    const current = inv.reduce((a, i) => a + i.currentValue, 0)
    const byType = Object.entries(inv.reduce<Record<string, number>>((m, i) => ({ ...m, [i.type]: (m[i.type] ?? 0) + i.currentValue }), {}))
      .map(([k, v]) => ({ name: label(k), value: v })).sort((a, b) => b.value - a.value)
    const m = txInMonth(tx, monthKey(today()))
    return {
      invested, current, byType,
      owed: liab.reduce((a, l) => a + (l.outstanding ?? 0), 0),
      committed: liab.reduce((a, l) => a + monthlyEquivalent(l.amount, l.frequency), 0),
      credits: m.filter((t) => t.kind === 'credit').reduce((a, t) => a + t.amount, 0),
      debits: m.filter((t) => t.kind === 'debit').reduce((a, t) => a + t.amount, 0),
    }
  }, [inv, liab, tx])

  const gain = s && s.invested ? ((s.current - s.invested) / s.invested) * 100 : 0

  return (
    <>
      <PageHead title="Coming up" />
      {upcoming.length === 0 ? (
        <p className="empty">Nothing due soon. EMIs, premiums, maturities and renewals appear here as their dates approach. Add some, or load sample data in Settings.</p>
      ) : (
        <ol className="timeline">
          {upcoming.map((u) => (
            <li key={u.id}>
              <Link to={u.to} className="tl-item">
                <span className={`tl-date ${u.days < 0 ? 'late' : u.days <= 3 ? 'soon' : ''}`}>
                  <b>{new Date(u.date + 'T00:00:00').getDate()}</b>
                  {new Date(u.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}
                </span>
                <span className="row-text">
                  <span className="row-title">{u.title}</span>
                  <span className="row-sub">{u.detail} · {niceDate(u.date)}</span>
                </span>
                <span className="row-figure">
                  {u.amount !== undefined && <span className="row-value">{money(u.amount)}</span>}
                  <Badge tone={u.days < 0 ? 'bad' : u.days <= 7 ? 'warn' : 'info'}>
                    {u.days < 0 ? `${-u.days}d overdue` : u.days === 0 ? 'today' : `in ${u.days}d`}
                  </Badge>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {s && (
        <>
          <div className="stats">
            <Stat label="Investments" value={moneyShort(s.current)} sub={`${pct(gain)} on ${moneyShort(s.invested)} invested`} tone={gain >= 0 ? 'ok' : 'bad'} />
            <Stat label="Loans outstanding" value={moneyShort(s.owed)} sub={`${moneyShort(s.committed)} a month committed`} />
            <Stat label="This month" value={money(s.credits - s.debits)} sub={`${moneyShort(s.credits)} in · ${moneyShort(s.debits)} out`} tone={s.credits - s.debits >= 0 ? 'ok' : 'bad'} />
          </div>

          {banks.length > 0 && (
            <section className="panel stack">
              <h2>Balance to keep · next 30 days</h2>
              <p className="muted">EMIs, premiums, SIPs, renewals and recurring expenses to be debited from each account. Tap an account for details.</p>
              <ul className="bank-list">
                {banks.map((b) => (
                  <li key={b.bank}>
                    <details>
                      <summary>
                        <span className="row-text">
                          <span className={b.bank === NOT_SET ? 'row-title tone-warn' : 'row-title'}>{b.bank}</span>
                          <span className="row-sub">{b.lines.length} payment{b.lines.length === 1 ? '' : 's'}</span>
                        </span>
                        <span className="row-value">{money(b.total)}</span>
                      </summary>
                      <ul className="bank-lines">
                        {b.lines.map((o, i) => (
                          <li key={i}>
                            <span className="row-text"><span>{o.title}</span><span className="row-sub">{o.detail}</span></span>
                            <span>{money(o.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ))}
              </ul>
              {banks.some((b) => b.bank === NOT_SET) && <p className="muted">Pick a “Debit from” bank on those entries to place them under the right account.</p>}
            </section>
          )}

          {s.byType.length > 0 && (
            <section className="panel split">
              <div className="chart">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={s.byType} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2} stroke="none" isAnimationActive={false}>
                      {s.byType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => money(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="legend">
                {s.byType.map((c, i) => (
                  <li key={c.name}>
                    <i style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span>{c.name}</span>
                    <b>{moneyShort(c.value)}</b>
                    <em>{Math.round((c.value / s.current) * 100)}%</em>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  )
}
