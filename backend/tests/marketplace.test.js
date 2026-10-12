const h = require('./helpers');
const { request } = h;
let app, teacher, other;
beforeAll(async () => { app = await h.setupDb('market'); teacher = await h.makeUser(app, { name: 'Teacher T' }); other = await h.makeUser(app, { name: 'Other O' }); });
afterAll(h.teardownDb);

describe('skill listing CRUD', () => {
  let skill;
  test('create, read, update', async () => {
    skill = await h.makeListing(teacher);
    expect(skill.teacher.id || skill.teacher).toBeTruthy();
    const got = await request(app).get(`/api/skills/${skill.id}`).expect(200);
    expect(got.body.data.title).toBe('Intro to testing');
    const upd = await teacher.agent.patch(`/api/skills/${skill.id}`).send({ credits: 5, title: 'Intro to testing v2' }).expect(200);
    expect(upd.body.data.credits).toBe(5);
  });
  test.each([
    [{ credits: 0 }, 'credits'], [{ credits: 2.5 }, 'credits'], [{ credits: -3 }, 'credits'],
    [{ title: 'ab' }, 'title'], [{ category: 'Nope' }, 'category'], [{ durationMinutes: 5 }, 'durationMinutes'],
  ])('rejects invalid listing %j', async (patch, field) => {
    const res = await teacher.agent.post('/api/skills').send(h.skillPayload(patch));
    expect(res.status).toBe(400);
    expect(res.body.error.fields[field]).toBeTruthy();
  });
  test('client cannot inject teacher or status on create', async () => {
    const res = await teacher.agent.post('/api/skills').send({ ...h.skillPayload(), teacher: other.id });
    expect(res.status).toBe(400);
  });
  test('another user cannot edit or delete (ownership enforced)', async () => {
    await other.agent.patch(`/api/skills/${skill.id}`).send({ credits: 1 }).expect(403);
    await other.agent.delete(`/api/skills/${skill.id}`).expect(403);
    await request(app).delete(`/api/skills/${skill.id}`).expect(401);
    const still = await request(app).get(`/api/skills/${skill.id}`).expect(200);
    expect(still.body.data.credits).toBe(5);
  });
  test('missing listing -> 404, malformed id -> 400', async () => {
    await request(app).get('/api/skills/aaaaaaaaaaaaaaaaaaaaaaaa').expect(404);
    await request(app).get('/api/skills/not-an-id').expect(400);
  });
  test('deactivate hides it from the marketplace; owner can still view; delete works', async () => {
    await teacher.agent.patch(`/api/skills/${skill.id}`).send({ status: 'inactive' }).expect(200);
    const list = await request(app).get('/api/skills?q=testing').expect(200);
    expect(list.body.data.find((s) => s.id === skill.id)).toBeUndefined();
    await request(app).get(`/api/skills/${skill.id}`).expect(404);
    await teacher.agent.get(`/api/skills/${skill.id}`).expect(200);
    await teacher.agent.delete(`/api/skills/${skill.id}`).expect(200);
    await teacher.agent.get(`/api/skills/${skill.id}`).expect(404);
  });
});

describe('search, filter, sort, pagination', () => {
  beforeAll(async () => {
    await h.makeListing(teacher, { title: 'Python basics', category: 'Programming', level: 'Beginner', credits: 2 });
    await h.makeListing(teacher, { title: 'Watercolour painting', category: 'Design', level: 'Advanced', credits: 8, description: 'Layering washes and controlling water on paper.' });
    await h.makeListing(teacher, { title: 'Spanish conversation', category: 'Languages', level: 'Intermediate', credits: 4, description: 'Practice everyday conversation with a patient partner.' });
  });
  const get = async (qs) => (await request(app).get(`/api/skills?${qs}`).expect(200)).body;
  test('keyword search (title or description, case-insensitive)', async () => {
    expect((await get('q=PYTHON')).data.map((s) => s.title)).toEqual(['Python basics']);
    expect((await get('q=washes')).data.map((s) => s.title)).toEqual(['Watercolour painting']);
  });
  test('category, level and price filters', async () => {
    expect((await get('category=Design')).data).toHaveLength(1);
    expect((await get('level=Intermediate')).data[0].title).toBe('Spanish conversation');
    expect((await get('minCredits=3&maxCredits=5')).data.map((s) => s.credits)).toEqual([4]);
  });
  test('sorting and pagination meta', async () => {
    expect((await get('sort=price_asc')).data.map((s) => s.credits)).toEqual([2, 4, 8]);
    expect((await get('sort=price_desc')).data.map((s) => s.credits)).toEqual([8, 4, 2]);
    const p = await get('limit=2&page=2');
    expect(p.data).toHaveLength(1);
    expect(p.meta).toMatchObject({ page: 2, limit: 2, total: 3, pages: 2 });
  });
  test('no ratings are shown without real reviews', async () => {
    const r = await get('q=python');
    expect(r.data[0].rating).toEqual({ avg: null, count: 0 });
  });
  test('empty result is a normal 200 with an empty list', async () => {
    expect((await get('q=zzzznothing')).data).toEqual([]);
  });
});

describe('profile protection', () => {
  test('profile update cannot change role, status or balance', async () => {
    for (const body of [{ role: 'admin' }, { status: 'active' }, { available: 999 }, { email: 'x@y.com' }]) {
      await other.agent.patch('/api/users/me').send(body).expect(400);
    }
    const ok = await other.agent.patch('/api/users/me').send({ bio: 'Hello there', skillsWanted: ['Guitar', 'Guitar', 'Chess'] }).expect(200);
    expect(ok.body.data.user.skillsWanted).toEqual(['Guitar', 'Chess']);
    expect(ok.body.data.user.role).toBe('user');
    expect((await h.walletOf(other.agent)).available).toBe(10);
  });
  test('public profile hides email', async () => {
    const res = await request(app).get(`/api/profiles/${teacher.id}`).expect(200);
    expect(JSON.stringify(res.body)).not.toContain('@test.dev');
  });
});

describe('admin moderation and access', () => {
  test('non-admin is forbidden; admin can remove and restore a listing', async () => {
    const l = await h.makeListing(teacher, { title: 'Moderate me please' });
    await other.agent.get('/api/admin/users').expect(403);
    const admin = await h.makeAdmin(app);
    await admin.agent.patch(`/api/admin/skills/${l.id}/moderation`).send({ status: 'removed' }).expect(200);
    await request(app).get(`/api/skills/${l.id}`).expect(404);
    await teacher.agent.patch(`/api/skills/${l.id}`).send({ credits: 9 }).expect(403); // owner cannot un-remove
    await admin.agent.patch(`/api/admin/skills/${l.id}/moderation`).send({ status: 'active' }).expect(200);
    await request(app).get(`/api/skills/${l.id}`).expect(200);
  });
  test('admin cannot suspend another admin; ledger endpoints work', async () => {
    const admin = await h.makeAdmin(app); const admin2 = await h.makeAdmin(app);
    await admin.agent.patch(`/api/admin/users/${admin2.id}/status`).send({ status: 'suspended' }).expect(403);
    const led = await admin.agent.get('/api/admin/ledger').expect(200);
    expect(led.body.data.length).toBeGreaterThan(0);
    expect((await admin.agent.get('/api/admin/ledger/audit').expect(200)).body.data.consistent).toBe(true);
  });
});
