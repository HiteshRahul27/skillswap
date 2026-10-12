# SkillSwap architecture

```
React (Vite) ──/api (JSON, cookie)──▶ Express ─▶ routes ─▶ validators(zod) ─▶ controllers ─▶ services ─▶ Mongoose ─▶ MongoDB
                                         └─ middleware: helmet, cors, rate limit, auth, error handler
```
Credit logic lives only in `services/creditService.js`; booking state changes only in `services/bookingService.js`.

## Models and relationships
| Model | Key fields | Notes |
|---|---|---|
| User | name, email (unique, lowercase), passwordHash (select:false), role, status, bio, skillsWanted, reset token hash/expiry (select:false) | Profile data is embedded in User (no separate Profile model) |
| Wallet | user (unique), available, reserved, earned, spent | Cached balances, integers ≥ 0, changed only by creditService |
| CreditTransaction | user, wallet, type, amount, booking?, status, description, key (unique), createdAt | Immutable ledger. Types: welcome, reservation, refund, settlement, reward |
| SkillListing | teacher, title, category, description, level, outcomes, durationMinutes, credits, status | status: active / inactive (owner) / removed (admin) |
| Availability | skill, teacher, start, end, isBooked | Slot length must equal the listing duration; a teacher's slots cannot overlap |
| Booking | skill, slot, learner, teacher, credits (price snapshot), skillTitle, startsAt, endsAt, status, activeSlot, timestamps | `activeSlot` is set only while pending/confirmed |
| Review | booking (unique), skill, reviewer, teacher, rating 1–5, comment | Learner reviews teacher once per completed booking; ratings are aggregated, never stored |

## Indexes and why
- `User.email` unique: one account per email.
- `Wallet.user` unique: one wallet per user.
- `CreditTransaction.key` unique: idempotent postings (no duplicate reward/refund). `{user, createdAt}` for history, `{booking}` for audits.
- `Booking.activeSlot` unique sparse: a slot can hold only one live booking. `{learner,startsAt}`, `{teacher,startsAt}`, `status` for lists.
- `Availability {skill,start}` unique; `{teacher,start,end}` for overlap checks.
- `Review.booking` unique: one review per booking.
- `SkillListing {status,category,level,credits,createdAt}` for marketplace filters.

## Credit transaction rules
| Event | Wallet effect | Ledger row(s) (key) |
|---|---|---|
| Sign-up | learner.available += W | welcome (`welcome:<user>`) |
| Book | learner.available −= p, reserved += p | reservation (`reservation:<booking>`) |
| Reject / cancel | learner.reserved −= p, available += p | refund (`refund:<booking>`) |
| Complete | learner.reserved −= p, spent += p; teacher.available += p, earned += p | settlement (`settlement:<booking>`), reward (`reward:<booking>`) |

## Booking transitions
`pending→confirmed|rejected|cancelled`, `confirmed→completed|cancelled`. Everything else is a 409. Roles: confirm/reject/complete = teacher only; cancel = either participant (learner limited by the cutoff on confirmed sessions); admins can read bookings but not change them.

## Concurrency and atomicity strategy
1. Slot claim: `findOneAndUpdate({_id, isBooked:false}, {isBooked:true})`.
2. Reservation: `findOneAndUpdate({user, available:{$gte:p}}, {$inc…})`.
3. Booking insert with unique `activeSlot`.
4. State transitions: `findOneAndUpdate({_id, status:{$in:allowedFrom}}, …)`; only the winner touches credits.
5. With `USE_TRANSACTIONS=true` steps 1–3 and each transition's credit movement run inside one MongoDB transaction. Otherwise failures after a step trigger compensating undo actions.
6. `auditLedger()` recomputes expected balances from the ledger and compares with wallets (admin Ledger tab, `npm run audit-ledger --prefix backend`).
