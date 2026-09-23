import { useState, type FormEvent, type ReactNode } from 'react'
import type { Table } from '@/db/db'
import { Icon } from '@/components/Icon'
import { Badge, type Tone } from '@/components/ui'
import { RecordHistory } from '@/pages/History'

export interface Option { value: string; label: string }
type Draft = Record<string, string>

export interface Field {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'month' | 'select' | 'textarea' | 'checkbox'
  options?: Option[] | ((draft: Draft) => Option[])
  required?: boolean
  hint?: string
  /** Hide the field unless this returns true (e.g. interest rate only for FD/RD/PPF). */
  show?: (draft: Draft) => boolean
}

export interface RowView {
  title: string
  sub?: string
  value?: string
  valueSub?: string
  badge?: { text: string; tone: Tone }
}

interface Props<T extends { id?: string }> {
  table: Table<T>
  rows: T[] | undefined
  fields: Field[]
  /** Initial values for the "add" form. */
  defaults: Draft
  view: (row: T) => RowView
  noun: string // "investment", "liability" … used in button and modal titles
  empty: string
  actions?: (row: T) => ReactNode
  /** Last chance to adjust a row before it is saved (e.g. fill a hidden field). `before` is the row being edited. */
  prepare?: (row: Record<string, unknown>, before: T | null) => Record<string, unknown>
}

const baseOptions = (f: Field, d: Draft): Option[] =>
  typeof f.options === 'function' ? f.options(d) : f.options ?? []

/**
 * Options for a select. A saved value that is no longer in the configured list (e.g. a fund house
 * renamed in config/dropdowns.ts) is kept as an extra option so editing a row never silently changes it.
 */
function optionsOf(f: Field, d: Draft, original: Draft | null): Option[] {
  const opts = [...baseOptions(f, d)]
  const saved = original?.[f.key]
  if (original && saved && !baseOptions(f, original).some((o) => o.value === saved) && !opts.some((o) => o.value === saved))
    opts.push({ value: saved, label: saved })
  return sortOptions(opts)
}

/** Every dropdown is A–Z (numbers in numeric order: 1st, 2nd … 10th), with "not set" first and "Other" last. */
const rank = (o: Option) => (o.value === '' ? 0 : /^other$/i.test(o.value) ? 2 : 1)
const sortOptions = (opts: Option[]) =>
  opts.sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label, 'en', { numeric: true, sensitivity: 'base' }))

/** Keep dependent selects valid (e.g. changing Horizon changes which Types are offered). */
function normalize(fields: Field[], d: Draft, original: Draft | null) {
  const next = { ...d }
  for (const f of fields) {
    if (f.type !== 'select') continue
    const opts = optionsOf(f, next, original)
    if (opts.length && !opts.some((o) => o.value === next[f.key])) next[f.key] = opts[0].value
  }
  return next
}

/**
 * One generic list + add/edit sheet. Every module (investments, liabilities, items, transactions)
 * is just a field list and a row renderer on top of this — copy a page to add a new module.
 */
export function CrudList<T extends { id?: string }>({
  table, rows, fields, defaults, view, noun, empty, actions, prepare,
}: Props<T>) {
  const [editing, setEditing] = useState<T | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>({})
  const [original, setOriginal] = useState<Draft | null>(null) // saved values of the row being edited

  const open = (row: T | 'new') => {
    if (row === 'new') {
      setOriginal(null)
      setDraft(normalize(fields, { ...defaults }, null))
    } else {
      const d: Draft = {}
      for (const f of fields) {
        const v = (row as Record<string, unknown>)[f.key]
        d[f.key] = v === undefined || v === null ? '' : String(v)
      }
      setOriginal(d)
      setDraft(normalize(fields, d, d))
    }
    setEditing(row)
  }

  const setField = (key: string, value: string) => setDraft(normalize(fields, { ...draft, [key]: value }, original))

  const save = (e: FormEvent) => {
    e.preventDefault()
    let out: Record<string, unknown> = editing === 'new' || !editing ? {} : { ...editing }
    for (const f of fields) {
      if (f.show && !f.show(draft)) { delete out[f.key]; continue }
      const raw = (draft[f.key] ?? '').trim()
      if (raw === '') delete out[f.key]
      else out[f.key] = f.type === 'number' ? Number(raw) : f.type === 'checkbox' ? true : raw
    }
    if (prepare) out = prepare(out, editing === 'new' ? null : editing)
    if (editing === 'new') table.add(out as T)
    else if (editing) table.put(out as T, editing)
    setEditing(null)
  }

  /** Returns true when the row was deleted. */
  const remove = (row: T) => {
    if (row.id === undefined || !confirm(`Delete this ${noun}? You can restore it later from History.`)) return false
    table.delete(row)
    return true
  }

  return (
    <>
      {rows && rows.length === 0 && <p className="empty">{empty}</p>}
      <ul className="rows">
        {rows?.map((row) => {
          const v = view(row)
          return (
            <li key={row.id} className="row">
              <button className="row-main" onClick={() => open(row)} aria-label={`Edit ${v.title}`}>
                <span className="row-text">
                  <span className="row-title">{v.title}</span>
                  {v.sub && <span className="row-sub">{v.sub}</span>}
                </span>
                <span className="row-figure">
                  {v.value && <span className="row-value">{v.value}</span>}
                  {v.badge ? <Badge tone={v.badge.tone}>{v.badge.text}</Badge> : v.valueSub && <span className="row-sub">{v.valueSub}</span>}
                </span>
              </button>
              {actions && <div className="row-actions">{actions(row)}</div>}
            </li>
          )
        })}
      </ul>

      <button className="fab" onClick={() => open('new')}>
        <Icon name="plus" size={20} /> Add {noun}
      </button>

      {editing && (
        <div className="sheet-backdrop" onClick={() => setEditing(null)}>
          <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <div className="sheet-head">
              <h2>{editing === 'new' ? `Add ${noun}` : `Edit ${noun}`}</h2>
              <button type="button" className="icon-btn" onClick={() => setEditing(null)} aria-label="Close">
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="sheet-body">
              {fields.filter((f) => !f.show || f.show(draft)).map((f) => f.type === 'checkbox' ? (
                <label key={f.key} className="field-check">
                  <input type="checkbox" checked={draft[f.key] === 'true'} onChange={(e) => setField(f.key, e.target.checked ? 'true' : '')} />
                  <span>{f.label}{f.hint && <small>{f.hint}</small>}</span>
                </label>
              ) : (
                <label key={f.key} className="field">
                  <span>{f.label}</span>
                  {f.type === 'select' ? (
                    <select value={draft[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)} required={f.required}>
                      {optionsOf(f, draft, original).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea rows={2} value={draft[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)} />
                  ) : (
                    <input
                      type={f.type} value={draft[f.key] ?? ''} required={f.required}
                      inputMode={f.type === 'number' ? 'decimal' : undefined}
                      step={f.type === 'number' ? 'any' : undefined}
                      onChange={(e) => setField(f.key, e.target.value)}
                    />
                  )}
                  {f.hint && <small>{f.hint}</small>}
                </label>
              ))}
              {editing !== 'new' && editing.id && <RecordHistory rowId={editing.id} />}
            </div>
            <div className="sheet-foot">
              {editing !== 'new' && (
                <button type="button" className="btn btn-danger" onClick={() => { if (remove(editing as T)) setEditing(null) }}>
                  Delete
                </button>
              )}
              <button type="submit" className="btn btn-primary">Save {noun}</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
