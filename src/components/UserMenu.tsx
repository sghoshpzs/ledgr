import { useEffect, useRef, useState } from 'react'
import { logOut, useAuth } from '@/lib/auth'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
}

export function UserMenu() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  if (!user) return null
  const name = user.displayName || user.email || 'Account'

  return (
    <div className="user-menu" ref={ref}>
      <button className="avatar" aria-label={`Account: ${name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {user.photoURL && !imgFailed
          // Google profile images refuse requests that carry a referrer.
          ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" onError={() => setImgFailed(true)} />
          : <span>{initials(name)}</span>}
      </button>
      {open && (
        <div className="user-pop" role="menu">
          <div className="user-pop-name">{user.displayName}</div>
          {user.email && <div className="user-pop-email">{user.email}</div>}
          <button className="btn btn-small btn-danger" role="menuitem" onClick={() => { setOpen(false); void logOut() }}>Log out</button>
        </div>
      )}
    </div>
  )
}
