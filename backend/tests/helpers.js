process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-test-secret-test-secret-123456';
process.env.WELCOME_CREDITS = '10';

const mongoose = require('mongoose');
const request = require('supertest');
const { connectDB } = require('../src/config/db');
const { createApp } = require('../src/app');
const models = require('../src/models');
const { hashPassword } = require('../src/utils/password');
const credits = require('../src/services/creditService');

let mongod;

async function setupDb(name) {
  let uri = process.env.TEST_MONGO_URI; // e.g. mongodb://127.0.0.1:27017 (a throwaway test server)
  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
  }
  const base = uri.replace(/\/$/, '').split('?')[0];
  await connectDB(`${base}/skillswap_test_${name}`);
  await mongoose.connection.dropDatabase(); // only ever the isolated test database
  await mongoose.syncIndexes();
  return createApp();
}

async function teardownDb() {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

const PASSWORD = 'Passw0rdTest';
let counter = 0;

async function makeUser(app, overrides = {}) {
  const email = overrides.email || `user${Date.now()}${counter++}@test.dev`;
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ name: 'Test User', email, password: PASSWORD, confirmPassword: PASSWORD, ...overrides });
  if (res.status !== 201) throw new Error('register failed: ' + JSON.stringify(res.body));
  return { agent, email, id: res.body.data.user.id };
}

async function makeAdmin(app) {
  const email = `admin${Date.now()}${counter++}@test.dev`;
  const u = await models.User.create({ name: 'Admin', email, passwordHash: await hashPassword(PASSWORD), role: 'admin' });
  await credits.createWalletWithWelcome(u._id, 0);
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: PASSWORD }).expect(200);
  return { agent, id: String(u._id) };
}

const skillPayload = (o = {}) => ({
  title: 'Intro to testing', category: 'Programming', description: 'A practical session about writing useful tests.',
  level: 'Beginner', outcomes: ['Write a test'], durationMinutes: 30, credits: 3, ...o,
});

const inDays = (d, hour = 10) => { const t = new Date(); t.setDate(t.getDate() + d); t.setHours(hour, 0, 0, 0); return t; };

async function makeListing(teacher, o = {}) {
  const res = await teacher.agent.post('/api/skills').send(skillPayload(o));
  if (res.status !== 201) throw new Error('listing failed: ' + JSON.stringify(res.body));
  return res.body.data;
}
async function makeSlot(teacher, skillId, start, minutes = 30) {
  const res = await teacher.agent.post('/api/availability').send({ skill: skillId, start, end: new Date(start.getTime() + minutes * 60000) });
  if (res.status !== 201) throw new Error('slot failed: ' + JSON.stringify(res.body));
  return res.body.data;
}
const walletOf = async (agent) => (await agent.get('/api/wallet')).body.data;

module.exports = { setupDb, teardownDb, makeUser, makeAdmin, makeListing, makeSlot, skillPayload, inDays, walletOf, PASSWORD, request, models };
