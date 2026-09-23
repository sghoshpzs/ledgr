import { Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Investments from '@/pages/Investments'
import Liabilities from '@/pages/Liabilities'
import Credits from '@/pages/Credits'
import Monthly from '@/pages/Monthly'
import Items from '@/pages/Items'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="invest" element={<Investments />} />
        <Route path="debts" element={<Liabilities />} />
        <Route path="credits" element={<Credits />} />
        <Route path="monthly" element={<Monthly />} />
        <Route path="items" element={<Items />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
