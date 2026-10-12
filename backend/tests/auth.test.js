const h = require('./helpers');
const { request, models } = h;
let app;
beforeAll(async () => { app = await h.setupDb('auth'); });
afterAll(h.teardownDb);

const valid = (e) => ({ name: 'Asha Rao', email: e, password: 'Secret123', confirmPassword: 'Secret123' });

describe('registration', () => {
  test('registers a valid user, hashes the password, creates wallet with welcome credits', async () => {
    const res = await request(app).post('/api/auth/register').send(valid('  Asha@Example.com '));
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('asha@example.com');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|Secret123/);
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/);
    const user = await models.User.findOne({ email: 'asha@example.com' }).select('+passwordHash');
    expect(user.passwordHash).not.toBe('Secret123');
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
    const wallet = await models.Wallet.findOne({ user: user._id });
    expect(wallet.available).toBe(10);
    expect(await models.CreditTransaction.countDocuments({ user: user._id, type: 'welcome' })).toBe(1);
  });

  test.each([
    [{ name: 'A' }, 'name'],
    [{ email: 'not-an-email' }, 'email'],
    [{ password: 'short1', confirmPassword: 'short1' }, 'password'],
    [{ password: 'onlyletters', confirmPassword: 'onlyletters' }, 'password'],
    [{ confirmPassword: 'Different123' }, 'confirmPassword'],
  ])('rejects invalid input %j with a field-specific error', async (patch, field) => {
    const res = await request(app).post('/api/auth/register').send({ ...valid('inv@example.com'), ...patch });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields[field]).toBeTruthy();
  });

  test('duplicate email gives 409 with a clear message (case-insensitive)', async () => {
    await request(app).post('/api/auth/register').send(valid('dup@example.com')).expect(201);
    const res = await request(app).post('/api/auth/register').send(valid('DUP@example.com'));
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('An account with this email already exists.');
    expect(res.body.error.fields.email).toBeTruthy();
  });

  test('a brand-new user never receives a login-style error', async () => {
    const res = await request(app).post('/api/auth/register').send(valid('fresh@example.com'));
    expect(res.status).toBe(201);
    expect(JSON.stringify(res.body)).not.toMatch(/incorrect|invalid credentials/i);
  });
});

describe('login / session', () => {
  beforeAll(async () => { await request(app).post('/api/auth/register').send(valid('login@example.com')); });

  test('logs in, /me works, logout clears session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'LOGIN@example.com', password: 'Secret123' }).expect(200);
    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.data.user.email).toBe('login@example.com');
    await agent.post('/api/auth/logout').expect(200);
    await agent.get('/api/auth/me').expect(401);
  });

  test('wrong password and unknown email return the same generic error', async () => {
    const a = await request(app).post('/api/auth/login').send({ email: 'login@example.com', password: 'Wrong1234' });
    const b = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'Wrong1234' });
    expect(a.status).toBe(401); expect(b.status).toBe(401);
    expect(a.body.error).toEqual(b.body.error);
  });

  test('protected routes require authentication', async () => {
    for (const [m, p] of [['get', '/api/auth/me'], ['get', '/api/wallet'], ['get', '/api/bookings'], ['post', '/api/skills'], ['get', '/api/admin/users']]) {
      const res = await request(app)[m](p).send({});
      expect(res.status).toBe(401);
    }
  });

  test('invalid token is treated as an expired session', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not.a.token');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('SESSION_EXPIRED');
  });

  test('suspended accounts cannot log in and existing sessions stop working', async () => {
    const u = await h.makeUser(app);
    const admin = await h.makeAdmin(app);
    await admin.agent.patch(`/api/admin/users/${u.id}/status`).send({ status: 'suspended' }).expect(200);
    const me = await u.agent.get('/api/auth/me');
    expect(me.status).toBe(403);
    expect(me.body.error.code).toBe('ACCOUNT_SUSPENDED');
    const login = await request(app).post('/api/auth/login').send({ email: u.email, password: h.PASSWORD });
    expect(login.status).toBe(403);
    await admin.agent.patch(`/api/admin/users/${u.id}/status`).send({ status: 'active' }).expect(200);
    await request(app).post('/api/auth/login').send({ email: u.email, password: h.PASSWORD }).expect(200);
  });
});

describe('password reset', () => {
  test('dev flow: token is single-use, stored hashed, and old password stops working', async () => {
    await request(app).post('/api/auth/register').send(valid('reset@example.com'));
    const f = await request(app).post('/api/auth/forgot-password').send({ email: 'reset@example.com' }).expect(200);
    expect(f.body.data.message).toMatch(/not configured/i); // honest: nothing was emailed
    const token = new URL(f.body.data.devResetUrl).searchParams.get('token');
    const stored = await models.User.findOne({ email: 'reset@example.com' }).select('+resetTokenHash');
    expect(stored.resetTokenHash).toBeTruthy();
    expect(stored.resetTokenHash).not.toBe(token);

    await request(app).post('/api/auth/reset-password').send({ token, password: 'Brandnew123' }).expect(200);
    const again = await request(app).post('/api/auth/reset-password').send({ token, password: 'Another123' });
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe('INVALID_RESET_TOKEN');
    await request(app).post('/api/auth/login').send({ email: 'reset@example.com', password: 'Secret123' }).expect(401);
    await request(app).post('/api/auth/login').send({ email: 'reset@example.com', password: 'Brandnew123' }).expect(200);
  });

  test('expired token is rejected', async () => {
    await request(app).post('/api/auth/register').send(valid('exp@example.com'));
    const f = await request(app).post('/api/auth/forgot-password').send({ email: 'exp@example.com' });
    const token = new URL(f.body.data.devResetUrl).searchParams.get('token');
    await models.User.collection.updateOne({ email: 'exp@example.com' }, { $set: { resetTokenExpires: new Date(Date.now() - 1000) } });
    await request(app).post('/api/auth/reset-password').send({ token, password: 'Brandnew123' }).expect(400);
  });

  test('unknown email gets the same generic response and no link', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'ghost@example.com' }).expect(200);
    expect(res.body.data.devResetUrl).toBeUndefined();
  });
});

describe('app basics', () => {
  test('health check and unknown route format', async () => {
    const hres = await request(app).get('/api/health').expect(200);
    expect(hres.body.data.status).toBe('ok');
    const nf = await request(app).get('/api/nope');
    expect(nf.status).toBe(404);
    expect(nf.body.success).toBe(false);
  });
  test('malformed JSON returns 400 in the standard format', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_JSON');
  });
});
