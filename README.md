# SkillSwap — Learn Together. Grow Together.

SkillSwap is a peer-to-peer marketplace where students **teach and learn skills in exchange for credits, not money**.
Stack: React + Vite + Tailwind (frontend), Node.js + Express (API), MongoDB + Mongoose (database).

## 1. Problem and solution
Students have skills others want, but tutoring costs money. SkillSwap lets a student teach a session to earn credits and spend credits to learn from someone else. A real ledger, not a decorative number, keeps the economy honest.

## 2. Key features
- Sign up, log in, log out, forgot/reset password, protected routes, persistent sessions (httpOnly cookie).
- Marketplace with search, category/level/credit filters, sorting and pagination.
- Listings (create / edit / deactivate / delete) with ownership enforced on the server.
- Availability slots, booking requests, confirm / decline / cancel / complete.
- Two-sided credit economy: welcome credits, reservation, refund, teacher reward, immutable ledger.
- Dashboard, wallet, profiles, reviews (only after completed sessions), admin area (users, listings, bookings, ledger audit).

## 3. Prerequisites
- Node.js 18+ (developed on 22) and npm
- MongoDB **5.0+** (local install or a free MongoDB Atlas cluster)

## 4. Quick start
```bash
npm run install:all                      # root + backend + frontend dependencies
cp backend/.env.example backend/.env     # then edit: MONGO_URI, JWT_SECRET
cp frontend/.env.example frontend/.env   # optional in development
npm run seed                             # optional: DEV-ONLY demo users and listings
npm run dev                              # API on :5000, web on :5173
```
Generate a JWT secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

The frontend starts without a database; the API refuses to start with a clear message if `MONGO_URI` / `JWT_SECRET` are missing or MongoDB is unreachable.

### Environment variables (`backend/.env`)
| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | ≥ 32 chars; signs session tokens |
| `CLIENT_URL` | Allowed CORS origin(s), comma separated |
| `WELCOME_CREDITS` | Credits every new account receives (default 10) |
| `CANCEL_CUTOFF_HOURS` | Learner cannot cancel a confirmed session this close to its start (default 12) |
| `USE_TRANSACTIONS` | `true` only on a replica set (Atlas always is) |
| `COOKIE_SAMESITE` | `lax` (same site) or `none` (frontend and API on different sites; HTTPS required) |
| `SMTP_*` | Email for password reset (see §8) |
| `ADMIN_*` | Used only by `npm run create-admin` |

### Demo data (development only)
`npm run seed` creates four accounts `asha|ravi|meera|karthik@demo.skillswap.dev` with password `Demo1234!` (override with `SEED_PASSWORD`). The script **refuses to run when `NODE_ENV=production`**. Demo bios are labelled "DEMO ACCOUNT".

### First administrator
There is no public admin sign-up. On the server run:
```bash
ADMIN_NAME="Your Name" ADMIN_EMAIL=you@school.edu ADMIN_PASSWORD='a-strong-password1' npm run create-admin
```
(creates the admin, or promotes an existing user with that email).

## 5. Scripts
| Command | What it does |
|---|---|
| `npm run dev` | API (nodemon) + web (Vite) together |
| `npm run build` | Production frontend build to `frontend/dist` |
| `npm start` | Start the API (`NODE_ENV=production` for prod) |
| `npm test` | Backend test suite (see §11) |
| `npm run seed` / `create-admin` | Dev demo data / first admin |
| `npm run audit-ledger --prefix backend` | Read-only check that every wallet matches the ledger (exit code 2 if not) |

## 6. Folder structure
```
skillswap/
├── backend/src/{config,models,controllers,services,routes,middleware,validators,utils}, app.js, server.js
├── backend/tests/        # Jest + Supertest
├── backend/scripts/      # seed, create-admin, audit-ledger
├── frontend/src/{components,pages,context,hooks,services,utils}
└── docs/ARCHITECTURE.md  # models, indexes, state machine, accounting
```

## 7. API summary (all JSON: `{success, data, meta?}` or `{success:false, error:{code,message,fields?}}`)
| Group | Endpoints |
|---|---|
| `/api/auth` | `POST register, login, logout, forgot-password, reset-password` · `GET me` |
| `/api/users` | `GET/PATCH me` (name, bio, skillsWanted only) |
| `/api/profiles` | `GET :id` public profile (no email) |
| `/api/skills` | `GET /` (q, category, level, minCredits, maxCredits, sort, page, limit) · `GET mine, :id` · `POST` · `PATCH/DELETE :id` (owner) |
| `/api/availability` | `GET ?skill=` · `POST` · `PATCH/DELETE :id` (owner, unbooked) |
| `/api/bookings` | `POST` · `GET ?role=learner|teacher&status=` · `GET :id` · `POST :id/confirm|reject|cancel|complete` |
| `/api/wallet` | `GET /` · `GET transactions` · `GET summary` — **read-only** |
| `/api/reviews` | `GET ?skill|teacher|booking` · `POST` · `DELETE :id` (author/admin) |
| `/api/admin` | users, user status, skills, moderation, bookings, ledger, `ledger/audit` (admin only) |
| `/api/health`, `/api/stats` | health check; real community counts |

## 8. Authentication design
- Passwords hashed with bcryptjs (cost 12); never stored or returned in plaintext.
- JWT in an **httpOnly, SameSite cookie** (`Secure` in production). Bearer header also accepted for API clients.
- Emails are trimmed and lower-cased; uniqueness enforced by a unique index as well as a pre-check.
- Login errors are generic ("Incorrect email or password") for unknown email or wrong password. Suspended accounts are blocked at login and on every request.
- Registration, login and reset errors are separate and field-specific. A new user never sees a login error.
- Rate limits on auth endpoints, `helmet`, explicit CORS, 100 kB body limit, zod validation on every input (unknown fields rejected).
- **Password reset:** random 256-bit token, only its SHA-256 hash is stored, valid 30 minutes, burned in the same atomic update that sets the new password (single use).
  - With `SMTP_*` configured the link is emailed.
  - Without SMTP in **development** the API says plainly that no email was sent and returns the link in the response (also logged to the server console).
  - Without SMTP in **production** the endpoint returns 503. It never pretends to have sent email.

## 9. Credit economy (rules)
1. Every new account gets `WELCOME_CREDITS` (ledger type `welcome`).
2. Booking a slot **reserves** the listing's price: `available −= price`, `reserved += price` (ledger `reservation`). The price comes from the stored listing, never the request.
3. The teacher **confirms** or **declines**. Decline → full refund (`refund`), slot freed.
4. **Cancel** (pending or confirmed) → full refund, slot freed. A learner cannot cancel a confirmed session within `CANCEL_CUTOFF_HOURS` of its start; the teacher always can.
5. After the session ends, only the **teacher** marks it **completed**: learner `reserved −= price, spent += price` (`settlement`), teacher `available += price, earned += price` (`reward`).
6. Amounts are positive integers, validated by the server. No endpoint writes balances or ledger rows.

### Booking lifecycle
```
pending ──confirm──▶ confirmed ──complete (teacher, after end)──▶ completed
   │                     │
   ├─reject (teacher)──▶ rejected        cancel (learner/teacher) ─▶ cancelled
   └─cancel────────────────────────────────────────────────────────▶ cancelled
```
### How balances and ledger stay consistent
- Wallet fields are a cache; the ledger is the source of truth: `available = welcome+refund+reward−reservation`, `reserved = reservation−refund−settlement`, `spent = settlement`, `earned = reward`.
- **No overspending:** reservation is one atomic `findOneAndUpdate` conditioned on `available ≥ price`.
- **No double refund/reward:** each transition is one atomic update conditioned on the current status; only the request that wins moves credits. Ledger rows also carry a unique idempotency key (`reward:<bookingId>`, `refund:<bookingId>`…).
- **No double booking:** slots are claimed atomically and `Booking.activeSlot` has a unique sparse index.
- **Immutable ledger:** Mongoose blocks updates/deletes of ledger rows; the API has no write routes.
- **Transactions:** with `USE_TRANSACTIONS=true` (replica set / Atlas) multi-document steps run in a MongoDB transaction. Without it (standalone MongoDB) they are **not** atomic as a group; the code relies on the conditional updates above plus compensating actions if a later step fails, and `audit-ledger` / the admin Ledger tab detect any drift.
- These guarantees depend on MongoDB's single-document atomicity (see §11 for a database that lacks it).

## 10. MongoDB setup
- **Local:** install MongoDB Community 5.0+, use `mongodb://127.0.0.1:27017/skillswap`.
- **Atlas:** create a free cluster, add a database user, allow your server's IP in Network Access, copy the `mongodb+srv://…` string into `MONGO_URI`, and set `USE_TRANSACTIONS=true`.
- Indexes are created on startup (`syncIndexes`). Details in `docs/ARCHITECTURE.md`.

## 11. Tests and actual results
```bash
npm test      # uses an in-memory MongoDB by default
# or point at a throwaway test server:  TEST_MONGO_URI=mongodb://127.0.0.1:27017 npm test
```
Suites: `auth`, `marketplace`, `credits` (booking, reservation, refund, reward, concurrency, permissions, reviews, ledger audit), `atomicity` (precondition probe). Tests only touch databases named `skillswap_test_*`, which they drop.

**What was actually run (in the build environment):**
- Frontend production build: **passed** (`npm run build`).
- API smoke test (seed → health → list → login → wallet → bad login → missing-config error → create-admin → audit-ledger): **passed**.
- Backend suite: the environment could not download a real `mongod` (network allow-list), so tests were run against **FerretDB 1.24 on SQLite**, a MongoDB-compatible emulator. Result: **57 of 58 passed; 1 failed consistently**: the `atomicity` probe. A raw-driver check (no app code) showed that emulator can report several successful "decrement if ≥ 1" updates for a counter of 1, i.e. it does **not** provide MongoDB's atomic conditional updates. The two concurrency tests in `credits.test.js` (parallel bookings can't overspend; two learners racing for one slot) also failed intermittently there for the same reason, and passed on other runs.
- **Not yet verified:** the suite against real MongoDB / Atlas. Please run `npm test` on your machine (it downloads a real MongoDB binary automatically) and treat the concurrency tests as the acceptance check for the credit economy. If `atomicity` fails on your database, do not use it for real data.
- Not verified: real email delivery, deployment, browser/UI automation, accessibility audits (the UI uses labelled controls, focus states, dialog focus handling and reduced-motion support, but was not audited with tooling).

## 12. Production deployment
1. **Database:** MongoDB Atlas (§10).
2. **API** (Render, Railway, Fly.io, a VPS…): set `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL=https://your-frontend`, `USE_TRANSACTIONS=true`, SMTP vars. Start command `npm start --prefix backend`. Run `npm run create-admin` once.
3. **Frontend** (Netlify, Vercel, Cloudflare Pages…): build `npm run build --prefix frontend`, publish `frontend/dist`, set `VITE_API_URL=https://your-api/api`, and add an SPA fallback rewrite of all paths to `/index.html`.
4. **Cookies/CORS:** if the frontend and API are on different sites set `COOKIE_SAMESITE=none` (HTTPS only) and make `CLIENT_URL` exactly the frontend origin. Same-site subdomains can keep `lax`. The API trusts one proxy hop in production for correct rate limiting.

## 13. Known limitations
- No image upload (listings have no images); credits have no cash value and there is no payments code.
- Admin "reported activity" is not built; admins moderate by suspending users, removing listings and deleting reviews.
- A learner could in theory win two *different overlapping* slots with truly simultaneous requests (the overlap check is not atomic). Credits stay consistent either way, and the teacher can decline.
- Without transactions a crash mid-operation could leave partial state; the audit tools exist to detect that.
- Email reset is implemented but unverified without your SMTP credentials.
