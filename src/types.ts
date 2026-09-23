// ---------- Investments ----------
export type InvestmentType = 'MUTUAL_FUND' | 'PPF' | 'NPS' | 'GRATUITY' | 'STOCK' | 'FD' | 'RD'
export type Horizon = 'long' | 'short'

export interface Investment {
  id?: number
  name: string
  type: InvestmentType
  horizon: Horizon
  investedAmount: number
  currentValue: number
  startDate: string // ISO yyyy-mm-dd
  maturityDate?: string
  interestRate?: number // % p.a. — FD / RD / PPF
  monthlyContribution?: number // RD / SIP / NPS
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
  id?: number
  name: string
  type: LiabilityType
  amount: number // per instalment / premium
  frequency: Frequency
  nextDueDate: string // advances by `frequency` each time you mark it paid
  outstanding?: number
  endDate?: string
  notes?: string
}

// ---------- Transactions (credits + debits) ----------
export type CreditSource =
  | 'SALARY'
  | 'MF_REDEMPTION'
  | 'FD_MATURITY'
  | 'RD_MATURITY'
  | 'PPF_MATURITY'
  | 'NPS_WITHDRAWAL'
  | 'GRATUITY'
  | 'DIVIDEND'
  | 'STOCK_SALE'
  | 'OTHER'

export type DebitCategory =
  | 'EMI'
  | 'INSURANCE'
  | 'INVESTMENT'
  | 'GROCERIES'
  | 'UTILITIES'
  | 'TRANSPORT'
  | 'EATING_OUT'
  | 'SHOPPING'
  | 'HEALTH'
  | 'OTHER'

export interface Transaction {
  id?: number
  kind: 'credit' | 'debit'
  category: CreditSource | DebitCategory
  amount: number
  date: string
  note?: string
  liabilityId?: number // optional link when a debit settles a liability
  investmentId?: number // optional link when a credit/debit relates to an investment
}

// ---------- Tracked items (renewals) ----------
export type ItemType = 'VEHICLE_INSURANCE' | 'VEHICLE_PUC' | 'WARRANTY'

export interface TrackedItem {
  id?: number
  name: string // e.g. "Swift – insurance", "Fridge warranty"
  type: ItemType
  reference?: string // policy no. / vehicle no. / serial no.
  expiryDate: string
  remindDaysBefore: number
  cost?: number
  notes?: string
}
