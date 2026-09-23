import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { UserMenu } from '@/components/UserMenu'
import { useUpcoming } from '@/lib/upcoming'
import { fireDueReminders } from '@/lib/reminders'

const tabs = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/invest', label: 'Invest', icon: 'invest' },
  { to: '/debts', label: 'Debts', icon: 'debts' },
  { to: '/credits', label: 'Cash flow', icon: 'credits' },
  { to: '/monthly', label: 'Monthly', icon: 'monthly' },
  { to: '/items', label: 'Renewals', icon: 'items' },
]

export function Layout() {
  const upcoming = useUpcoming()
  useEffect(() => { void fireDueReminders(upcoming) }, [upcoming])

  return (
    <div className="shell">
      <nav className="nav" aria-label="Main">
        <div className="brand">Ledger</div>
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'nav-link on' : 'nav-link')}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </NavLink>
        ))}
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'nav-link nav-settings on' : 'nav-link nav-settings')}>
          <Icon name="settings" />
          <span>Settings</span>
        </NavLink>
      </nav>
      <main className="main">
        <div className="topbar">
          <NavLink to="/settings" className="gear" aria-label="Settings"><Icon name="settings" size={20} /></NavLink>
          <UserMenu />
        </div>
        <Outlet />
      </main>
    </div>
  )
}
