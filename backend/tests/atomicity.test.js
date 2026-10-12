// Precondition for the credit economy: the database must apply conditional updates atomically
// (true for MongoDB / Atlas). If this fails, race-condition tests in credits.test.js are not meaningful
// and the server must not be used for real data. (Emulators such as FerretDB+SQLite can fail it.)
const h = require('./helpers');
const mongoose = require('mongoose');
beforeAll(async () => { await h.setupDb('atomicity'); });
afterAll(h.teardownDb);

test('20 parallel "decrement if >= 1" updates on a counter of 1 succeed exactly once', async () => {
  const col = mongoose.connection.collection('probe');
  for (let round = 0; round < 3; round++) {
    await col.deleteMany({});
    await col.insertOne({ _id: 1, n: 1 });
    const results = await Promise.all(Array.from({ length: 20 }, () =>
      col.findOneAndUpdate({ _id: 1, n: { $gte: 1 } }, { $inc: { n: -1 } }, { returnDocument: 'after' })));
    const wins = results.filter((r) => r && (r.value !== undefined ? r.value : r)).length;
    expect(wins).toBe(1);
    expect((await col.findOne({ _id: 1 })).n).toBe(0);
  }
});
