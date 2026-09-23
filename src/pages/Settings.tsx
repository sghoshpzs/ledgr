import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHead } from '@/components/ui'
import { exportAll, importAll, wipeAll } from '@/db/db'
import { seedDemo } from '@/db/seed'
import { deleteLegacyData, hasLegacyData, readLegacyData } from '@/db/legacy'
import { useAuth } from '@/lib/auth'
import { enableReminders, remindersSupported } from '@/lib/reminders'
import { today } from '@/lib/format'

export default function Settings() {
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [perm, setPerm] = useState(remindersSupported() ? Notification.permission : 'denied')
  const { user } = useAuth()
  const [legacy, setLegacy] = useState(false)
  useEffect(() => { hasLegacyData().then(setLegacy, () => {}) }, [])

  const moveLegacy = async () => {
    if (!confirm('Move the data saved in this browser into your account? This replaces anything already in your account.')) return
    try {
      await importAll(await readLegacyData())
      await deleteLegacyData()
      setLegacy(false)
      setMsg('Data from this device is now in your account.')
    } catch {
      setMsg('Could not move the data from this device.')
    }
  }

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
        <h2>Change history</h2>
        <p className="muted">See every add, edit and delete, and restore deleted records.</p>
        <div className="btn-row"><Link className="btn" to="/history">Open history</Link></div>
      </section>

      <section className="panel stack">
        <h2>Your data</h2>
        <p className="muted">Saved to your account{user?.email ? ` (${user.email})` : ''} and synced across your devices. Only you can see it. Works offline and syncs when you reconnect.</p>
        {legacy && (
          <div className="btn-row">
            <button className="btn btn-primary" onClick={moveLegacy}>Move data saved on this device into my account</button>
          </div>
        )}
        <div className="btn-row">
          <button className="btn btn-primary" onClick={backup}>Download backup</button>
          <button className="btn" onClick={() => file.current?.click()}>Restore from backup</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
        </div>
        <div className="btn-row">
          <button className="btn" onClick={async () => { await seedDemo(); setMsg('Sample data added.') }}>Load sample data</button>
          <button className="btn btn-danger" onClick={async () => { if (confirm('Delete all data and its history in your account? This cannot be undone.')) { await wipeAll(); setMsg('All data deleted.') } }}>Delete all data</button>
        </div>
        {msg && <p role="status" className="muted">{msg}</p>}
      </section>
    </>
  )
}
