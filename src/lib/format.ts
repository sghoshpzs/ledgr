const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const money = (n: number) => inr.format(Math.round(n))

/** ₹1.2Cr / ₹18.4L / ₹12.5K — the way amounts are usually written in India. */
export function moneyShort(n: number) {
  const a = Math.abs(n)
  const f = (v: number, u: string) => `${n < 0 ? '−' : ''}₹${parseFloat(v.toFixed(1))}${u}`
  if (a >= 1e7) return f(a / 1e7, 'Cr')
  if (a >= 1e5) return f(a / 1e5, 'L')
  if (a >= 1e3) return f(a / 1e3, 'K')
  return f(a, '')
}

export const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`

const pad = (n: number) => String(n).padStart(2, '0')
/** Local-time yyyy-mm-dd (toISOString would shift the date across timezones). */
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = () => toISO(new Date())

export function addMonths(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00')
  const day = d.getDate()
  d.setMonth(d.getMonth() + n)
  if (d.getDate() !== day) d.setDate(0) // 31 Jan + 1 month -> 28/29 Feb
  return toISO(d)
}
export const monthKey = (iso: string) => iso.slice(0, 7) // yyyy-mm

export function daysUntil(iso: string) {
  const ms = new Date(iso + 'T00:00:00').getTime() - new Date(today() + 'T00:00:00').getTime()
  return Math.round(ms / 86_400_000)
}

export function niceDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const ACRONYMS = new Set(['EMI', 'PPF', 'NPS', 'FD', 'RD', 'PUC', 'MF'])
/** HOME_LOAN_EMI -> "Home Loan EMI" */
export const label = (k: string) =>
  k.split('_').map((w) => (ACRONYMS.has(w) ? w : w[0] + w.slice(1).toLowerCase())).join(' ')

/** Convert any liability instalment to its monthly-equivalent cost. */
export const monthlyEquivalent = (amount: number, f: 'monthly' | 'quarterly' | 'yearly') =>
  f === 'monthly' ? amount : f === 'quarterly' ? amount / 3 : amount / 12
