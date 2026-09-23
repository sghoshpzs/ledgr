# Personal Ledger (PWA skeleton)

Offline-first personal finance + renewal tracker. React + TypeScript + Vite, data in IndexedDB (Dexie), installable via `vite-plugin-pwa`.

## Run

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + production build (with service worker)
npm run preview      # serve the build; open on your phone via the LAN URL to test install
```
Settings → **Load sample data** fills every screen with examples.

## What's in it

| Screen | Route | Covers |
|---|---|---|
| Coming up | `/` | Next EMIs/premiums, maturities, renewals + portfolio summary |
| Investments | `/invest` | Long term: MF, PPF, NPS, gratuity, stocks · Short term: FD, RD, stocks |
| Liabilities | `/debts` | Home/car/credit-card EMIs, health/car insurance. **Mark paid** logs a debit and moves the due date |
| Cash flow | `/credits` | Credits (salary, investment payouts) and debits |
| Monthly | `/monthly` | Credits vs spend, category split, fixed commitments for any month |
| Renewals | `/items` | Vehicle insurance, PUC, warranties with "remind N days before" |
| Settings | `/settings` | Notifications, JSON backup/restore, sample data |

## Layout

```
src/
  types.ts                 all data shapes in one place
  db/db.ts                 Dexie tables + export/import
  db/seed.ts               sample data
  components/CrudList.tsx  generic list + add/edit sheet (driven by a field list)
  components/Layout.tsx    bottom tabs on phones, side rail on desktop
  lib/upcoming.ts          "what's due soon" logic (pure, easy to unit test)
  lib/reminders.ts         local notifications
  pages/*                  one file per screen
```

### Adding a module
Copy `pages/Items.tsx`: define a type in `types.ts`, add a table in `db/db.ts` (bump `version`), list its `fields` and a `view()` for the row, add a route in `App.tsx` and a tab in `Layout.tsx`.

## Deploy
PWAs need HTTPS (localhost is exempt). Any static host works (Netlify, Cloudflare Pages, GitHub Pages with an SPA fallback).
A `Dockerfile` + `nginx.conf` are included for a container image (nginx-unprivileged on 8080, SPA fallback, no-cache on `sw.js`) — untested here.

## Known limits / next steps
- **Data lives only on the device.** Use Settings → Download backup. For multi-device sync, put Supabase/PocketBase/CouchDB (PouchDB) behind the same table shapes.
- **Reminders fire only when the app is opened.** Reliable background reminders need Web Push and a small server.
- No login or encryption at rest yet. If the phone is shared, add an app PIN and encrypt with the Web Crypto API.
- Ideas: auto-refresh NAV/stock prices, XIRR per investment, EMI amortisation (reduce `outstanding` when marking paid), recurring transactions, budgets per category, attach policy PDFs to renewals (store Blobs in IndexedDB), unit tests for `buildUpcoming`.
