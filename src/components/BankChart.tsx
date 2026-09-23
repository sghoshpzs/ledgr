import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis, type BarShapeProps } from 'recharts'
import { KINDS, KIND_LABEL, NOT_SET, type BankNeed, type OutflowKind } from '@/lib/banks'
import { money, moneyShort } from '@/lib/format'

// Categorical slots 1–4, validated for colour-blind separation on this app's light and dark surfaces.
// Recharts writes SVG attributes, which can't read CSS variables — so pick per colour scheme here.
const THEME = {
  light: { series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'], surface: '#ffffff', grid: '#e6ecef', ink: '#5d7079' },
  dark: { series: ['#3987e5', '#d95926', '#199e70', '#c98500'], surface: '#15262e', grid: '#26404a', ink: '#93a6ae' },
}

function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const q = window.matchMedia(query)
    const on = (e: MediaQueryListEvent) => setMatch(e.matches)
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [query])
  return match
}

type Row = { bank: string; total: number } & Record<OutflowKind, number>

function Tip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  return (
    <div className="chart-tip">
      <b>{r.bank}</b>
      {KINDS.filter((k) => r[k] > 0).map((k) => <div key={k}><span>{KIND_LABEL[k]}</span><span>{money(r[k])}</span></div>)}
      <div className="chart-tip-total"><span>Total</span><span>{money(r.total)}</span></div>
    </div>
  )
}

/** Horizontal stacked bars: how much each debit account must cover, split by payment kind. */
export function BankChart({ banks }: { banks: BankNeed[] }) {
  const t = useMedia('(prefers-color-scheme: dark)') ? THEME.dark : THEME.light
  const narrow = useMedia('(max-width: 480px)') // phones: give the bars more room than the names
  const nameMax = narrow ? 14 : 20
  const rows: Row[] = banks.map((b) => ({ bank: b.bank, total: b.total, ...b.byKind }))
  const used = KINDS.filter((k) => banks.some((b) => b.byKind[k] > 0))
  // The outermost non-empty segment of each bar gets the rounded end and the total label.
  const isEnd = (r: Row, k: OutflowKind) => [...used].reverse().find((x) => r[x] > 0) === k

  return (
    <>
      <ul className="chart-legend" aria-label="Legend">
        {used.map((k) => (
          <li key={k}><i style={{ background: t.series[KINDS.indexOf(k)] }} />{KIND_LABEL[k]}</li>
        ))}
      </ul>
      <ResponsiveContainer width="100%" height={rows.length * 40 + 36}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: narrow ? 48 : 64, bottom: 4, left: 0 }} barCategoryGap={10}>
          <CartesianGrid horizontal={false} stroke={t.grid} />
          <XAxis type="number" tickFormatter={moneyShort} tick={{ fill: t.ink, fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="bank" width={narrow ? 96 : 132} tick={{ fill: t.ink, fontSize: 12 }} axisLine={false} tickLine={false}
            tickFormatter={(v: string) => (v.length > nameMax ? v.slice(0, nameMax - 1) + '…' : v)} />
          <Tooltip content={<Tip />} cursor={{ fill: t.grid, opacity: 0.5 }} />
          {used.map((k) => (
            <Bar key={k} dataKey={k} name={KIND_LABEL[k]} stackId="bank" barSize={20} isAnimationActive={false}
              fill={t.series[KINDS.indexOf(k)]} stroke={t.surface} strokeWidth={2}
              shape={(p: BarShapeProps) => <Rectangle {...p} radius={isEnd(p.payload as Row, k) ? [0, 4, 4, 0] : 0} />}>
              <LabelList dataKey="total" content={(p) => {
                const r = rows[Number(p.index)]
                if (!r || !isEnd(r, k)) return null
                const x = Number(p.x) + Number(p.width) + 6, y = Number(p.y) + Number(p.height) / 2
                return <text x={x} y={y} dy="0.35em" fill={t.ink} fontSize={12}>{moneyShort(r.total)}</text>
              }} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>

      <div className="table-wrap">
        <table className="bank-table">
          <thead>
            <tr><th scope="col">Account</th>{used.map((k) => <th key={k} scope="col">{KIND_LABEL[k]}</th>)}<th scope="col">Total</th></tr>
          </thead>
          <tbody>
            {banks.map((b) => (
              <tr key={b.bank}>
                <th scope="row" className={b.bank === NOT_SET ? 'tone-warn' : undefined}>{b.bank}</th>
                {used.map((k) => <td key={k}>{b.byKind[k] ? money(b.byKind[k]) : '—'}</td>)}
                <td><b>{money(b.total)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
