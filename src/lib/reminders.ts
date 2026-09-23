import { today } from '@/lib/format'
import type { Upcoming } from '@/lib/upcoming'

// Local reminders: fire once a day when the app is opened and something is due within 3 days.
// True background reminders (app closed) need Web Push + a small server — see README "Next steps".

export const remindersSupported = () => 'Notification' in window

export async function enableReminders() {
  if (!remindersSupported()) return 'denied' as NotificationPermission
  return Notification.requestPermission()
}

export async function fireDueReminders(list: Upcoming[]) {
  if (!remindersSupported() || Notification.permission !== 'granted') return
  if (localStorage.getItem('ledger:lastReminder') === today()) return
  const urgent = list.filter((u) => u.days <= 3)
  if (!urgent.length) return
  const reg = await navigator.serviceWorker?.getRegistration()
  await reg?.showNotification(`${urgent.length} due in the next 3 days`, {
    body: urgent.map((u) => u.title).join(', '),
    icon: '/icons/icon-192.png',
  })
  localStorage.setItem('ledger:lastReminder', today())
}
