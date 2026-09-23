import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { CrudList, type Field } from '@/components/CrudList'
import { PageHead } from '@/components/ui'
import { addMonths, daysUntil, label, money, niceDate, today } from '@/lib/format'
import type { TrackedItem } from '@/types'

const fields: Field[] = [
  { key: 'name', label: 'Name', type: 'text', required: true, hint: 'e.g. "Swift – insurance" or "Fridge warranty"' },
  { key: 'type', label: 'Type', type: 'select', required: true,
    options: [{ value: 'VEHICLE_INSURANCE', label: 'Vehicle insurance' }, { value: 'VEHICLE_PUC', label: 'Vehicle pollution (PUC)' }, { value: 'WARRANTY', label: 'Warranty' }] },
  { key: 'expiryDate', label: 'Expires on', type: 'date', required: true },
  { key: 'remindDaysBefore', label: 'Remind me (days before)', type: 'number', required: true },
  { key: 'reference', label: 'Policy / vehicle / serial no.', type: 'text' },
  { key: 'cost', label: 'Renewal cost (₹)', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]

export default function Items() {
  const rows = useLiveQuery(() => db.items.orderBy('expiryDate').toArray(), [])

  return (
    <>
      <PageHead title="Renewals" />
      <CrudList<TrackedItem>
        table={db.items}
        rows={rows}
        fields={fields}
        defaults={{ type: 'VEHICLE_INSURANCE', remindDaysBefore: '30' }}
        noun="item"
        empty="Nothing tracked yet. Add a vehicle insurance, pollution certificate or warranty."
        view={(t) => {
          const d = daysUntil(t.expiryDate)
          return {
            title: t.name,
            sub: `${label(t.type)} · ${t.expiryDate ? niceDate(t.expiryDate) : ''}${t.reference ? ' · ' + t.reference : ''}`,
            value: t.cost ? money(t.cost) : undefined,
            badge: d < 0 ? { text: `expired ${-d}d ago`, tone: 'bad' } : d <= t.remindDaysBefore ? { text: `${d}d left`, tone: 'warn' } : { text: `${d}d left`, tone: 'ok' },
          }
        }}
        actions={(t) => t.type === 'WARRANTY' ? null : (
          <button className="btn btn-small" onClick={() => db.items.update(t.id!, { expiryDate: addMonths(t.expiryDate < today() ? today() : t.expiryDate, 12) })}>
            Renewed +1 year
          </button>
        )}
      />
    </>
  )
}
