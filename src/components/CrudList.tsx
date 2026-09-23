import { useState, type FormEvent, type ReactNode } from 'react'
import type { EntityTable } from 'dexie'
import { Icon } from '@/components/Icon'
import { Badge, type Tone } from '@/components/ui'

export interface Option { value: string; label: string }
type Draft = Record<string, string>

export interface Field {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea'
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

interface Props<T extends { id?: number }> {
  table: EntityTable<T, 'id'>
  rows: T[] | undefined
  fields: Field[]
  /** Initial values for the "add" form. */
  defaults: Draft
  view: (row: T) => RowView
  noun: string // "investment", "liability" … used in button and modal titles
  empty: string
  actions?: (row: T) => ReactNode
}

const optionsOf = (f: Field, d: Draft): Option[] =>
  typeof f.options === 'function' ? f.options(d) : f.options ?? []

/**
 * One generic list + add/edit sheet. Every module (investments, liabilities, items, transactions)
 * is just a field list and a row renderer on top of this — copy a page to add a new module.
 */
export function CrudList<T extends { id?: number }>({
  table, rows, fields, defaults, view, noun, empty, actions,
}: Props<T>) {
  const [editing, setEditing] = useState<T | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>({})

  const open = (row: T | 'new') => {
    if (row === 'new') setDraft({ ...defaults })
    else {
      const d: Draft = {}
      for (const f of fields) {
        const v = (row as Record<string, unknown>)[f.key]
        d[f.key] = v === undefined || v === null ? '' : String(v)
      }
      setDraft(d)
    }
    setEditing(row)
  }

  const setField = (key: string, value: string) => {
    const next = { ...draft, [key]: value }
    // keep dependent selects valid (e.g. changing Horizon changes which Types are offered)
    for (const f of fields) {
      if (f.type !== 'select') continue
      const opts = optionsOf(f, next)
      if (opts.length && !opts.some((o) => o.value === next[f.key])) next[f.key] = opts[0].value
    }
    setDraft(next)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const out: Record<string, unknown> = editing === 'new' || !editing ? {} : { ...editing }
    for (const f of fields) {
      if (f.show && !f.show(draft)) { delete out[f.key]; continue }
      const raw = (draft[f.key] ?? '').trim()
      if (raw === '') delete out[f.key]
      else out[f.key] = f.type === 'number' ? Number(raw) : raw
    }
    if (editing === 'new') await table.add(out as never)
    else await table.put(out as never)
    setEditing(null)
  }

  const remove = async (row: T) => {
    if (row.id !== undefined && confirm(`Delete this ${noun}?`)) await table.delete(row.id as never)
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
              {fields.filter((f) => !f.show || f.show(draft)).map((f) => (
                <label key={f.key} className="field">
                  <span>{f.label}</span>
                  {f.type === 'select' ? (
                    <select value={draft[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)} required={f.required}>
                      {optionsOf(f, draft).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
            </div>
            <div className="sheet-foot">
              {editing !== 'new' && (
                <button type="button" className="btn btn-danger" onClick={async () => { await remove(editing as T); setEditing(null) }}>
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
