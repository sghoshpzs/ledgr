import { useEffect, useRef, useState } from 'react'

// Placeholder user until real auth is wired up.
export type User = { name: string; photoUrl?: string }
const placeholderUser: User = { name: 'Guest User' }

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
}

export function UserMenu({ user = placeholderUser, onLogout }: { user?: User; onLogout?: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const logout = () => {
    setOpen(false)
    // TODO: replace with real sign-out once auth exists.
    onLogout?.()
  }

  return (
    <div className="user-menu" ref={ref}>
      <button className="avatar" aria-label={`Account: ${user.name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {user.photoUrl ? <img src={user.photoUrl} alt="" /> : <span>{initials(user.name)}</span>}
      </button>
      {open && (
        <div className="user-pop" role="menu">
          <button className="btn btn-small btn-danger" role="menuitem" onClick={logout}>Log out</button>
        </div>
      )}
    </div>
  )
}
