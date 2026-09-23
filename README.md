# Personal Ledger (PWA skeleton)

Offline-first personal finance + renewal tracker. React + TypeScript + Vite, Google sign-in via Firebase Auth, data in Firestore (private per user, cached offline), installable via `vite-plugin-pwa`.

## Firebase setup (once)

1. Firebase console → your project → **Build → Authentication → Get started → Sign-in method → Google → Enable**.
2. **Build → Firestore Database → Create database** in *production mode* (pick a region near you, e.g. `asia-south1`).
3. **Project settings → General → Your apps → Add app → Web**. Copy `.env.example` to `.env.local` and fill in the config values. For CI, add the same four names as GitHub Actions secrets.
4. `npx firebase deploy --only firestore:rules` — publishes `firestore.rules` (each user can only access `users/{their uid}/…`).

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
| History | `/history` | Every add / edit / delete with old → new values; restore deleted records (also per record in its edit form) |
| Settings | `/settings` | Notifications, JSON backup/restore, sample data |

## Layout

```
src/
  types.ts                 all data shapes in one place
  config/dropdowns.ts      dropdown lists (fund houses, banks, insurers, your accounts, cash-flow categories) — edit and redeploy
  lib/firebase.ts          Firebase app, auth, Firestore (offline cache)
  lib/auth.tsx             sign-in state, Google sign-in, log out
  db/db.ts                 per-user Firestore tables, useTable() hook, backup/restore
  db/legacy.ts             one-time move of pre-login on-device data into the account
  db/seed.ts               sample data
  components/CrudList.tsx  generic list + add/edit sheet (driven by a field list)
  components/Layout.tsx    bottom tabs on phones, side rail on desktop
  lib/upcoming.ts          "what's due soon" logic (pure, easy to unit test)
  lib/reminders.ts         local notifications
  pages/*                  one file per screen
```

### Adding a module
Copy `pages/Items.tsx`: define a type in `types.ts`, add its name to `TABLES` in `db/db.ts` and to the list in `firestore.rules`, list its `fields` and a `view()` for the row, add a route in `App.tsx` and a tab in `Layout.tsx`.

## Deploy
Firebase Hosting: `npm run deploy` (hosting + Firestore rules). Pushes to `master` also deploy hosting via `.github/workflows/firebase-deploy.yml`; rules are deployed only by `npm run deploy` / `npx firebase deploy --only firestore:rules`.
PWAs need HTTPS (localhost is exempt). If you host elsewhere, add that domain under Authentication → Settings → Authorized domains.
A `Dockerfile` + `nginx.conf` are included for a container image (nginx-unprivileged on 8080, SPA fallback, no-cache on `sw.js`) — untested here.

## Known limits / next steps
- Data is stored in Firestore under `users/{uid}` and synced across the user's devices. Settings → Download backup still exports a JSON copy.
- **Reminders fire only when the app is opened.** Reliable background reminders need Web Push and a small server.
- Log out clears the on-device Firestore cache, so a shared device keeps nothing behind.
- Ideas: auto-refresh NAV/stock prices, XIRR per investment, EMI amortisation (reduce `outstanding` when marking paid), recurring transactions, budgets per category, attach policy PDFs to renewals (store Blobs in IndexedDB), unit tests for `buildUpcoming`.
