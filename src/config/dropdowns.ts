// ─────────────────────────────────────────────────────────────────────────────
//  Dropdown lists used in the Add / Edit forms.
//
//  To change a list: add, remove or rename entries below, then rebuild/deploy.
//  • Order here = order in the dropdown (the first entry is the default).
//  • Keep "Other" as the last entry so anything not listed can still be recorded.
//  • Renaming an entry does NOT change records already saved with the old name;
//    they keep showing their saved value (edit the record to pick the new one).
// ─────────────────────────────────────────────────────────────────────────────

/** Turns a list below into dropdown options (value and label are the same text). */
export const toOptions = (xs: string[]) => xs.map((v) => ({ value: v, label: v }))

/** Investments → Type "Mutual Fund" → Fund house */
export const FUND_HOUSES = [
  'SBI Mutual Fund',
  'ICICI Prudential Mutual Fund',
  'HDFC Mutual Fund',
  'Nippon India Mutual Fund',
  'Kotak Mahindra Mutual Fund',
  'Aditya Birla Sun Life Mutual Fund',
  'Axis Mutual Fund',
  'UTI Mutual Fund',
  'Mirae Asset Mutual Fund',
  'DSP Mutual Fund',
  'Tata Mutual Fund',
  'Bandhan Mutual Fund',
  'Edelweiss Mutual Fund',
  'Motilal Oswal Mutual Fund',
  'PPFAS Mutual Fund (Parag Parikh)',
  'Franklin Templeton Mutual Fund',
  'Canara Robeco Mutual Fund',
  'Invesco Mutual Fund',
  'HSBC Mutual Fund',
  'Sundaram Mutual Fund',
  'Quant Mutual Fund',
  'Mahindra Manulife Mutual Fund',
  'Baroda BNP Paribas Mutual Fund',
  'PGIM India Mutual Fund',
  'LIC Mutual Fund',
  'Union Mutual Fund',
  'WhiteOak Capital Mutual Fund',
  'Bajaj Finserv Mutual Fund',
  'Navi Mutual Fund',
  'Groww Mutual Fund',
  'Zerodha Mutual Fund',
  'Quantum Mutual Fund',
  'Other',
]

/** Investments → Type "PPF" → Bank (banks authorised to open PPF accounts, plus India Post) */
export const PPF_BANKS = [
  'State Bank of India',
  'India Post (Post Office)',
  'Punjab National Bank',
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'Bank of India',
  'Central Bank of India',
  'Indian Bank',
  'Indian Overseas Bank',
  'UCO Bank',
  'Bank of Maharashtra',
  'Punjab & Sind Bank',
  'IDBI Bank',
  'ICICI Bank',
  'HDFC Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Other',
]

/** Liabilities → Type "… EMI" (home / car / credit card) → Bank */
export const LOAN_BANKS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'Bank of India',
  'IDFC FIRST Bank',
  'IndusInd Bank',
  'Yes Bank',
  'Federal Bank',
  'AU Small Finance Bank',
  'RBL Bank',
  'Standard Chartered',
  'HSBC',
  'American Express',
  'SBI Card',
  'LIC Housing Finance',
  'Bajaj Finance',
  'Bajaj Housing Finance',
  'Tata Capital',
  'PNB Housing Finance',
  'Aditya Birla Capital',
  'Mahindra Finance',
  'Other',
]

/** Liabilities → Type "Health Insurance" → Insurance provider */
export const HEALTH_INSURERS = [
  'Star Health',
  'Niva Bupa',
  'Care Health',
  'ICICI Lombard',
  'HDFC ERGO',
  'Bajaj General Insurance',
  'Aditya Birla Health',
  'ManipalCigna',
  'Tata AIG',
  'New India Assurance',
  'SBI General',
  'Reliance General',
  'Go Digit',
  'Acko',
  'National Insurance',
  'Oriental Insurance',
  'United India Insurance',
  'Generali Central',
  'Other',
]

/** Liabilities → Type "Car Insurance" → Insurance provider */
export const MOTOR_INSURERS = [
  'ICICI Lombard',
  'HDFC ERGO',
  'Bajaj General Insurance',
  'Tata AIG',
  'New India Assurance',
  'SBI General',
  'Reliance General',
  'Go Digit',
  'Acko',
  'National Insurance',
  'Oriental Insurance',
  'United India Insurance',
  'Generali Central',
  'Royal Sundaram',
  'Cholamandalam MS',
  'Shriram General',
  'IFFCO Tokio',
  'Liberty General',
  'Zurich Kotak General',
  'Universal Sompo',
  'Other',
]
