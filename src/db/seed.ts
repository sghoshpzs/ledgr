import { batch, db } from '@/db/db'
import type { Investment, Liability, TrackedItem, Transaction } from '@/types'
import { addMonths, toISO, today } from '@/lib/format'

/** Sample data so a fresh install has something to look at. Settings → "Load sample data". */
export async function seedDemo() {
  const t = today()
  const mo = (n: number) => addMonths(t, n)
  const day = (n: number) => { const d = new Date(t + 'T00:00:00'); d.setDate(d.getDate() + n); return toISO(d) }
  const thisMonth = t.slice(0, 7)

  const investments: Investment[] = [
    { name: 'Index fund SIP', type: 'MUTUAL_FUND', horizon: 'long', investedAmount: 300000, currentValue: 362000, startDate: mo(-30), monthlyContribution: 10000 },
    { name: 'PPF – SBI', type: 'PPF', horizon: 'long', investedAmount: 450000, currentValue: 520000, startDate: mo(-48), interestRate: 7.1, maturityDate: mo(132) },
    { name: 'NPS Tier I', type: 'NPS', horizon: 'long', investedAmount: 180000, currentValue: 214000, startDate: mo(-36), monthlyContribution: 5000 },
    { name: 'Gratuity (employer)', type: 'GRATUITY', horizon: 'long', investedAmount: 0, currentValue: 240000, startDate: mo(-60) },
    { name: 'Direct equity', type: 'STOCK', horizon: 'long', investedAmount: 200000, currentValue: 231000, startDate: mo(-20) },
    { name: 'FD – HDFC 1y', type: 'FD', horizon: 'short', investedAmount: 200000, currentValue: 206500, startDate: mo(-9), interestRate: 7.0, maturityDate: mo(3) },
    { name: 'RD – Post office', type: 'RD', horizon: 'short', investedAmount: 60000, currentValue: 62400, startDate: mo(-10), interestRate: 6.7, monthlyContribution: 6000, maturityDate: day(45) },
  ]
  const liabilities: Liability[] = [
    { name: 'Home loan – HDFC', type: 'HOME_LOAN_EMI', amount: 38500, frequency: 'monthly', nextDueDate: day(4), outstanding: 3200000, endDate: mo(180) },
    { name: 'Car loan – ICICI', type: 'CAR_LOAN_EMI', amount: 14200, frequency: 'monthly', nextDueDate: day(9), outstanding: 380000, endDate: mo(30) },
    { name: 'Phone EMI – credit card', type: 'CREDIT_CARD_EMI', amount: 4100, frequency: 'monthly', nextDueDate: day(2), outstanding: 24600 },
    { name: 'Health insurance', type: 'HEALTH_INSURANCE', amount: 21500, frequency: 'yearly', nextDueDate: day(26) },
    { name: 'Car insurance', type: 'CAR_INSURANCE', amount: 12800, frequency: 'yearly', nextDueDate: mo(7) },
  ]
  const transactions: Transaction[] = [
    { kind: 'credit', category: 'SALARY', amount: 145000, date: `${thisMonth}-01`, note: 'Monthly salary' },
    { kind: 'credit', category: 'DIVIDEND', amount: 3200, date: `${thisMonth}-05`, note: 'Q1 dividend' },
    { kind: 'debit', category: 'EMI', amount: 38500, date: `${thisMonth}-03`, note: 'Home loan – HDFC' },
    { kind: 'debit', category: 'EMI', amount: 14200, date: `${thisMonth}-04`, note: 'Car loan – ICICI' },
    { kind: 'debit', category: 'INVESTMENT', amount: 15000, date: `${thisMonth}-05`, note: 'SIP + NPS' },
    { kind: 'debit', category: 'GROCERIES', amount: 9800, date: `${thisMonth}-06` },
    { kind: 'debit', category: 'UTILITIES', amount: 4300, date: `${thisMonth}-07`, note: 'Electricity, broadband' },
    { kind: 'debit', category: 'TRANSPORT', amount: 3600, date: `${thisMonth}-08`, note: 'Fuel' },
    { kind: 'debit', category: 'EATING_OUT', amount: 5200, date: `${thisMonth}-09` },
  ]
  const items: TrackedItem[] = [
    { name: 'Car – insurance', type: 'VEHICLE_INSURANCE', reference: 'Policy 0000-0000', expiryDate: day(18), remindDaysBefore: 30, cost: 12800 },
    { name: 'Car – pollution certificate', type: 'VEHICLE_PUC', expiryDate: day(-3), remindDaysBefore: 15, cost: 100 },
    { name: 'Refrigerator warranty', type: 'WARRANTY', reference: 'Serial ABC123', expiryDate: mo(5), remindDaysBefore: 45 },
    { name: 'Laptop warranty', type: 'WARRANTY', expiryDate: mo(14), remindDaysBefore: 45 },
  ]

  const b = batch()
  for (const r of investments) db.investments.addIn(b, r)
  for (const r of liabilities) db.liabilities.addIn(b, r)
  for (const r of transactions) db.transactions.addIn(b, r)
  for (const r of items) db.items.addIn(b, r)
  await b.commit()
}
