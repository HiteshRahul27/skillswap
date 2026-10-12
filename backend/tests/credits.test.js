const h = require('./helpers');
const { request, models } = h;
let app, admin;
beforeAll(async () => { app = await h.setupDb('credits'); admin = await h.makeAdmin(app); });
afterAll(h.teardownDb);

const book = (u, slotId, note) => u.agent.post('/api/bookings').send({ slot: slotId, note });
const creditsSvc = require('../src/services/creditService');
// Audit only the users a test created, so one test's data can never affect another's result.
const auditUsers = async (...users) => {
  for (const u of users) { const r = await creditsSvc.auditLedger({ userId: u.id }); if (!r.consistent) return r; }
  return { consistent: true };
};
const endInPast = (id) => models.Booking.collection.updateOne({ _id: new (require('mongoose').Types.ObjectId)(id) }, { $set: { endsAt: new Date(Date.now() - 1000), startsAt: new Date(Date.now() - 3600000) } });

async function scenario(cost = 3) {
  const teacher = await h.makeUser(app); const learner = await h.makeUser(app);
  const skill = await h.makeListing(teacher, { credits: cost });
  const slot = await h.makeSlot(teacher, skill.id, h.inDays(3));
  return { teacher, learner, skill, slot };
}

describe('booking validation', () => {
  test('cannot book your own listing', async () => {
    const s = await scenario();
    const res = await book(s.teacher, s.slot.id);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('OWN_LISTING');
    expect((await h.walletOf(s.teacher.agent)).reserved).toBe(0);
  });
  test('price comes from the listing, not the client', async () => {
    const s = await scenario(3);
    const res = await s.learner.agent.post('/api/bookings').send({ slot: s.slot.id, credits: 0 });
    expect(res.status).toBe(400); // unknown field rejected
    const ok = await book(s.learner, s.slot.id).expect(201);
    expect(ok.body.data.credits).toBe(3);
  });
  test('invalid slot id / nonexistent slot / past slot', async () => {
    const s = await scenario();
    await book(s.learner, 'bad').expect(400);
    await book(s.learner, 'aaaaaaaaaaaaaaaaaaaaaaaa').expect(404);
    const past = await models.Availability.create({ skill: s.skill.id, teacher: s.teacher.id, start: new Date(Date.now() - 7200000), end: new Date(Date.now() - 3600000) });
    const res = await book(s.learner, String(past._id));
    expect(res.status).toBe(400); expect(res.body.error.code).toBe('SLOT_IN_PAST');
  });
  test('slot length must match duration and slots cannot overlap', async () => {
    const t = await h.makeUser(app); const sk = await h.makeListing(t);
    const start = h.inDays(5);
    await t.agent.post('/api/availability').send({ skill: sk.id, start, end: new Date(start.getTime() + 10 * 60000) }).expect(400);
    await h.makeSlot(t, sk.id, start);
    await t.agent.post('/api/availability').send({ skill: sk.id, start: new Date(start.getTime() + 10 * 60000), end: new Date(start.getTime() + 40 * 60000) }).expect(409);
  });
  test('overlapping bookings by the same learner are blocked', async () => {
    const t1 = await h.makeUser(app); const t2 = await h.makeUser(app); const l = await h.makeUser(app);
    const s1 = await h.makeListing(t1); const s2 = await h.makeListing(t2);
    const start = h.inDays(6);
    const a = await h.makeSlot(t1, s1.id, start); const b = await h.makeSlot(t2, s2.id, new Date(start.getTime() + 15 * 60000));
    await book(l, a.id).expect(201);
    const res = await book(l, b.id);
    expect(res.status).toBe(409); expect(res.body.error.code).toBe('BOOKING_CONFLICT');
  });
});

describe('credit reservation', () => {
  test('insufficient balance is rejected and nothing changes', async () => {
    const s = await scenario(50);
    const res = await book(s.learner, s.slot.id);
    expect(res.status).toBe(402); expect(res.body.error.code).toBe('INSUFFICIENT_CREDITS');
    expect(await h.walletOf(s.learner.agent)).toMatchObject({ available: 10, reserved: 0 });
    const slots = await request(app).get(`/api/availability?skill=${s.skill.id}`).expect(200);
    expect(slots.body.data[0].isBooked).toBe(false); // slot released
  });
  test('successful reservation moves credits and writes the ledger', async () => {
    const s = await scenario(4);
    const b = await book(s.learner, s.slot.id).expect(201);
    expect(b.body.data.status).toBe('pending');
    expect(await h.walletOf(s.learner.agent)).toMatchObject({ available: 6, reserved: 4, spent: 0 });
    const tx = (await s.learner.agent.get('/api/wallet/transactions?type=reservation').expect(200)).body.data;
    expect(tx).toHaveLength(1); expect(tx[0].amount).toBe(4);
    expect((await auditUsers(s.learner, s.teacher)).consistent).toBe(true);
  });
  test('two concurrent bookings cannot overspend one wallet', async () => {
    const t = await h.makeUser(app); const l = await h.makeUser(app);
    const sk = await h.makeListing(t, { credits: 6 });
    const a = await h.makeSlot(t, sk.id, h.inDays(7, 9)); const b = await h.makeSlot(t, sk.id, h.inDays(7, 14));
    const results = await Promise.all([book(l, a.id), book(l, b.id)]);
    const codes = results.map((r) => r.status).sort();
    expect(codes).toEqual([201, 402]);
    expect(await h.walletOf(l.agent)).toMatchObject({ available: 4, reserved: 6 });
    expect((await auditUsers(l, t)).consistent).toBe(true);
  });
  test('two learners racing for one slot: exactly one wins', async () => {
    const t = await h.makeUser(app); const l1 = await h.makeUser(app); const l2 = await h.makeUser(app);
    const sk = await h.makeListing(t); const slot = await h.makeSlot(t, sk.id, h.inDays(8));
    const res = await Promise.all([book(l1, slot.id), book(l2, slot.id)]);
    expect(res.map((r) => r.status).sort()).toEqual([201, 409]);
    const loser = res[0].status === 409 ? l1 : l2;
    expect(await h.walletOf(loser.agent)).toMatchObject({ available: 10, reserved: 0 });
    expect((await auditUsers(l1, l2, t)).consistent).toBe(true);
  });
});

describe('reject / cancel / refund', () => {
  test('rejection refunds once and frees the slot; repeat is refused', async () => {
    const s = await scenario(3);
    const b = (await book(s.learner, s.slot.id).expect(201)).body.data;
    await s.learner.agent.post(`/api/bookings/${b.id}/reject`).expect(403); // learner cannot reject
    await s.teacher.agent.post(`/api/bookings/${b.id}/reject`).expect(200);
    await s.teacher.agent.post(`/api/bookings/${b.id}/reject`).expect(409);
    await Promise.all([1, 2, 3].map(() => s.teacher.agent.post(`/api/bookings/${b.id}/cancel`)));
    expect(await h.walletOf(s.learner.agent)).toMatchObject({ available: 10, reserved: 0 });
    expect(await models.CreditTransaction.countDocuments({ booking: b.id, type: 'refund' })).toBe(1);
    await book(await h.makeUser(app), s.slot.id).expect(201); // slot reusable
    expect((await auditUsers(s.learner, s.teacher)).consistent).toBe(true);
  });
  test('learner cancels a pending booking: full refund; concurrent double-cancel refunds once', async () => {
    const s = await scenario(5);
    const b = (await book(s.learner, s.slot.id).expect(201)).body.data;
    const r = await Promise.all([s.learner.agent.post(`/api/bookings/${b.id}/cancel`), s.learner.agent.post(`/api/bookings/${b.id}/cancel`)]);
    expect(r.map((x) => x.status).sort()).toEqual([200, 409]);
    expect(await h.walletOf(s.learner.agent)).toMatchObject({ available: 10, reserved: 0 });
    expect(await models.CreditTransaction.countDocuments({ booking: b.id, type: 'refund' })).toBe(1);
  });
  test('learner cannot cancel a confirmed session inside the cutoff window; teacher can', async () => {
    const t = await h.makeUser(app); const l = await h.makeUser(app);
    const sk = await h.makeListing(t, { credits: 2 });
    const start = new Date(Date.now() + 2 * 3600 * 1000); // 2h away < 12h cutoff
    const slot = await h.makeSlot(t, sk.id, start);
    const b = (await book(l, slot.id).expect(201)).body.data;
    await t.agent.post(`/api/bookings/${b.id}/confirm`).expect(200);
    const res = await l.agent.post(`/api/bookings/${b.id}/cancel`);
    expect(res.status).toBe(409); expect(res.body.error.code).toBe('CANCEL_CUTOFF');
    await t.agent.post(`/api/bookings/${b.id}/cancel`).expect(200);
    expect(await h.walletOf(l.agent)).toMatchObject({ available: 10, reserved: 0 });
  });
});

describe('completion and teacher reward', () => {
  test('confirm -> complete pays teacher exactly once', async () => {
    const s = await scenario(4);
    const b = (await book(s.learner, s.slot.id).expect(201)).body.data;
    await s.teacher.agent.post(`/api/bookings/${b.id}/complete`).expect(409); // not confirmed yet
    await s.learner.agent.post(`/api/bookings/${b.id}/confirm`).expect(403);
    await s.teacher.agent.post(`/api/bookings/${b.id}/confirm`).expect(200);
    const early = await s.teacher.agent.post(`/api/bookings/${b.id}/complete`);
    expect(early.status).toBe(409); expect(early.body.error.code).toBe('TOO_EARLY');
    await endInPast(b.id);
    await s.learner.agent.post(`/api/bookings/${b.id}/complete`).expect(403); // learner cannot self-complete
    const calls = await Promise.all([1, 2, 3, 4].map(() => s.teacher.agent.post(`/api/bookings/${b.id}/complete`)));
    expect(calls.filter((c) => c.status === 200)).toHaveLength(1);
    expect(await h.walletOf(s.teacher.agent)).toMatchObject({ available: 14, earned: 4 });
    expect(await h.walletOf(s.learner.agent)).toMatchObject({ available: 6, reserved: 0, spent: 4 });
    expect(await models.CreditTransaction.countDocuments({ booking: b.id, type: 'reward' })).toBe(1);
    await s.teacher.agent.post(`/api/bookings/${b.id}/complete`).expect(409);
    await s.teacher.agent.post(`/api/bookings/${b.id}/cancel`).expect(409); // no refund after completion
    expect((await auditUsers(s.learner, s.teacher)).consistent).toBe(true);
  });
});

describe('permissions and ledger integrity', () => {
  test('outsiders cannot see or change a booking', async () => {
    const s = await scenario(); const stranger = await h.makeUser(app);
    const b = (await book(s.learner, s.slot.id).expect(201)).body.data;
    await stranger.agent.get(`/api/bookings/${b.id}`).expect(404);
    await stranger.agent.post(`/api/bookings/${b.id}/cancel`).expect(404);
    await s.learner.agent.get(`/api/bookings/${b.id}`).expect(200);
    await s.teacher.agent.get(`/api/bookings/${b.id}`).expect(200);
    await admin.agent.get(`/api/bookings/${b.id}`).expect(200);
    const mine = await s.teacher.agent.get('/api/bookings?role=teacher').expect(200);
    expect(mine.body.data.map((x) => x.id)).toContain(b.id);
    expect((await stranger.agent.get('/api/bookings?role=teacher')).body.data).toEqual([]);
  });
  test('no API can write balances or ledger rows', async () => {
    const u = await h.makeUser(app);
    for (const [m, p] of [['post', '/api/wallet'], ['patch', '/api/wallet'], ['put', '/api/wallet/transactions'], ['delete', '/api/wallet/transactions']]) {
      expect([404]).toContain((await u.agent[m](p).send({ available: 9999 })).status);
    }
    expect((await h.walletOf(u.agent)).available).toBe(10);
  });
  test('ledger rows are immutable through the model layer', async () => {
    const tx = await models.CreditTransaction.findOne();
    await expect(models.CreditTransaction.updateOne({ _id: tx._id }, { amount: 999 })).rejects.toThrow(/immutable/);
    await expect(models.CreditTransaction.deleteMany({})).rejects.toThrow(/immutable/);
    tx.amount = 5; await expect(tx.save()).rejects.toThrow(/immutable/);
  });
  test('audit detects a tampered wallet', async () => {
    const u = await h.makeUser(app);
    await models.Wallet.collection.updateOne({ user: new (require('mongoose').Types.ObjectId)(u.id) }, { $inc: { available: 100 } });
    const a = await creditsSvc.auditLedger({ userId: u.id });
    expect(a.consistent).toBe(false);
    expect(a.issues.some((i) => String(i.user) === u.id && i.field === 'available')).toBe(true);
    
    await models.Wallet.collection.updateOne({ user: new (require('mongoose').Types.ObjectId)(u.id) }, { $inc: { available: -100 } });
    expect((await auditUsers(u)).consistent).toBe(true);
  });
});

describe('reviews', () => {
  test('only after completion, once, by the learner; ratings derive from reviews', async () => {
    const s = await scenario(2);
    const b = (await book(s.learner, s.slot.id).expect(201)).body.data;
    await s.learner.agent.post('/api/reviews').send({ booking: b.id, rating: 5 }).expect(409); // not completed
    await s.teacher.agent.post(`/api/bookings/${b.id}/confirm`).expect(200);
    await endInPast(b.id);
    await s.teacher.agent.post(`/api/bookings/${b.id}/complete`).expect(200);
    await s.teacher.agent.post('/api/reviews').send({ booking: b.id, rating: 5 }).expect(404); // teacher cannot self-review
    await s.learner.agent.post('/api/reviews').send({ booking: b.id, rating: 6 }).expect(400);
    await s.learner.agent.post('/api/reviews').send({ booking: b.id, rating: 4, comment: 'Clear and patient.' }).expect(201);
    await s.learner.agent.post('/api/reviews').send({ booking: b.id, rating: 5 }).expect(409);
    const skill = (await request(app).get(`/api/skills/${s.skill.id}`).expect(200)).body.data;
    expect(skill.rating).toEqual({ avg: 4, count: 1 });
    const rid = skill.reviews[0].id;
    await s.teacher.agent.delete(`/api/reviews/${rid}`).expect(403);
    await admin.agent.delete(`/api/reviews/${rid}`).expect(200);
    expect((await request(app).get(`/api/skills/${s.skill.id}`)).body.data.rating.count).toBe(0);
  });
});

describe('listing deletion safety', () => {
  test('cannot delete a listing with active bookings', async () => {
    const s = await scenario();
    await book(s.learner, s.slot.id).expect(201);
    const res = await s.teacher.agent.delete(`/api/skills/${s.skill.id}`);
    expect(res.status).toBe(409);
    await s.teacher.agent.delete(`/api/availability/${s.slot.id}`).expect(409); // booked slot protected
  });
});
