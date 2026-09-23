import type { CREDIT_SOURCES, DEBIT_CATEGORIES } from '@/config/dropdowns'

// ---------- Investments ----------
export type InvestmentType = 'MUTUAL_FUND' | 'PPF' | 'NPS' | 'GRATUITY' | 'STOCK' | 'FD' | 'RD'
export type Horizon = 'long' | 'short'

export interface Investment {
  id?: string
  name: string
  type: InvestmentType
  horizon: Horizon
  investedAmount?: number // not used for FD / RD
  currentValue?: number // not used for FD / RD
  maturityAmount?: number // FD / RD: the one amount tracked — what it pays out at maturity
  startDate: string // ISO yyyy-mm-dd
  maturityDate?: string
  interestRate?: number // % p.a. — FD / RD / PPF
  monthlyContribution?: number // RD / SIP / NPS
  debitBank?: string // your account the contribution is paid from
  fundHouse?: string // MUTUAL_FUND — list in config/dropdowns.ts
  bank?: string // PPF — list in config/dropdowns.ts
  broker?: string // STOCK — list in config/dropdowns.ts
  folioNumber?: string // MUTUAL_FUND
  sipPaused?: boolean // MUTUAL_FUND: SIP stopped (absent = running)
  lastTxnDate?: string // MUTUAL_FUND, when paused: date of the last SIP instalment
  ppfAccountNumber?: string // PPF
  pran?: string // NPS — Permanent Retirement Account Number
  dematAccountNumber?: string // STOCK — DP ID + client ID
  fdNumber?: string // FD
  rdNumber?: string // RD
  notes?: string
}

// ---------- Liabilities ----------
export type LiabilityType =
  | 'HOME_LOAN_EMI'
  | 'CAR_LOAN_EMI'
  | 'CREDIT_CARD_EMI'
  | 'HEALTH_INSURANCE'
  | 'CAR_INSURANCE'
export type Frequency = 'monthly' | 'quarterly' | 'yearly'

export interface Liability {
  id?: string
  name: string
  type: LiabilityType
  amount: number // per instalment / premium
  frequency: Frequency
  nextDueDate: string // advances by `frequency` each time you mark it paid
  debitBank?: string // your account the payment is debited from
  bank?: string // *_EMI — list in config/dropdowns.ts
  insurer?: string // *_INSURANCE — list in config/dropdowns.ts
  policyNumber?: string // *_INSURANCE
  outstanding?: number
  endDate?: string
  notes?: string
}

// ---------- Transactions (credits + debits) ----------
// Category lists live in config/dropdowns.ts so they can be edited in one place.
export type CreditSource = (typeof CREDIT_SOURCES)[number]
export type DebitCategory = (typeof DEBIT_CATEGORIES)[number]

export interface Transaction {
  id?: string
  kind: 'credit' | 'debit'
  category: CreditSource | DebitCategory
  amount: number
  date: string
  note?: string
  recurring?: boolean // fixed expense that repeats every month (see lib/recurring.ts)
  debitDay?: number // recurring: day of the month it is debited (1–31)
  endMonth?: string // recurring: last month it applies (yyyy-mm); open-ended when absent
  debitBank?: string // your account it is paid from — config/dropdowns.ts MY_BANK_ACCOUNTS
  liabilityId?: string // optional link when a debit settles a liability
  investmentId?: string // optional link when a credit/debit relates to an investment
}

// ---------- Tracked items (renewals) ----------
export type ItemType = 'VEHICLE_INSURANCE' | 'VEHICLE_PUC' | 'WARRANTY'

export interface TrackedItem {
  id?: string
  name: string // e.g. "Swift – insurance", "Fridge warranty"
  type: ItemType
  policyNumber?: string // VEHICLE_INSURANCE
  reference?: string // vehicle no. / serial no.
  expiryDate: string
  remindDaysBefore: number
  cost?: number
  debitBank?: string // your account the renewal is paid from
  notes?: string
}

// ---------- Change history ----------
export type HistoryAction = 'add' | 'update' | 'delete' | 'restore'

export interface HistoryEntry {
  id?: string
  table: 'investments' | 'liabilities' | 'transactions' | 'items'
  rowId: string
  action: HistoryAction
  at: string // ISO timestamp
  title: string // row name at the time of the change
  before?: Record<string, unknown> // update / delete
  after?: Record<string, unknown> // add / update / restore
}
