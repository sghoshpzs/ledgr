import type { ReactNode } from 'react'

export type Tone = 'ok' | 'warn' | 'bad' | 'info'

export const Badge = ({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) => (
  <span className={`badge badge-${tone}`}>{children}</span>
)

export const Stat = ({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: Tone }) => (
  <div className="stat">
    <div className="stat-label">{label}</div>
    <div className={`stat-value ${tone ? 'tone-' + tone : ''}`}>{value}</div>
    {sub && <div className="stat-sub">{sub}</div>}
  </div>
)

export const PageHead = ({ title, children }: { title: string; children?: ReactNode }) => (
  <header className="page-head">
    <h1>{title}</h1>
    {children}
  </header>
)

export const Chips = <V extends string>({
  value, onChange, options,
}: { value: V; onChange: (v: V) => void; options: { value: V; label: string }[] }) => (
  <div className="chips" role="tablist">
    {options.map((o) => (
      <button key={o.value} role="tab" aria-selected={o.value === value}
        className={o.value === value ? 'chip on' : 'chip'} onClick={() => onChange(o.value)}>
        {o.label}
      </button>
    ))}
  </div>
)
