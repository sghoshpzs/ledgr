import { useRef, useState } from 'react'
import { PageHead } from '@/components/ui'
import { exportAll, importAll } from '@/db/db'
import { seedDemo, wipeAll } from '@/db/seed'
import { enableReminders, remindersSupported } from '@/lib/reminders'
import { today } from '@/lib/format'

export default function Settings() {
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [perm, setPerm] = useState(remindersSupported() ? Notification.permission : 'denied')

  const backup = async () => {
    const blob = new Blob([JSON.stringify(await exportAll(), null, 2)], { type: 'application/json' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `ledger-backup-${today()}.json` })
    a.click()
    URL.revokeObjectURL(a.href)
    setMsg('Backup downloaded.')
  }

  const restore = async (f: File) => {
    try {
      await importAll(JSON.parse(await f.text()))
      setMsg('Backup restored. Existing data was replaced.')
    } catch {
      setMsg('That file is not a valid Ledger backup.')
    }
  }

  return (
    <>
      <PageHead title="Settings" />
      <section className="panel stack">
        <h2>Reminders</h2>
        <p className="muted">Ledger shows a notification when you open the app and something is due within 3 days.</p>
        <button className="btn btn-primary" disabled={perm === 'granted' || !remindersSupported()} onClick={async () => setPerm(await enableReminders())}>
          {perm === 'granted' ? 'Reminders are on' : perm === 'denied' ? 'Blocked — allow notifications in browser settings' : 'Turn on reminders'}
        </button>
      </section>

      <section className="panel stack">
        <h2>Your data</h2>
        <p className="muted">Everything is stored only on this device. Download a backup before clearing browser data or switching phones.</p>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={backup}>Download backup</button>
          <button className="btn" onClick={() => file.current?.click()}>Restore from backup</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
        </div>
        <div className="btn-row">
          <button className="btn" onClick={async () => { await seedDemo(); setMsg('Sample data added.') }}>Load sample data</button>
          <button className="btn btn-danger" onClick={async () => { if (confirm('Delete all data on this device?')) { await wipeAll(); setMsg('All data deleted.') } }}>Delete all data</button>
        </div>
        {msg && <p role="status" className="muted">{msg}</p>}
      </section>
    </>
  )
}
