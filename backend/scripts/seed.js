// DEVELOPMENT ONLY. Creates clearly labelled demo users and listings. Refuses to run in production.
const { env, validateEnv } = require('../src/config/env');
const { connectDB } = require('../src/config/db');
const { User, SkillListing, Availability } = require('../src/models');
const credits = require('../src/services/creditService');
const { hashPassword } = require('../src/utils/password');

const DOMAIN = '@demo.skillswap.dev';
const demoUsers = [
  { name: 'Demo Asha', bio: 'DEMO ACCOUNT. Third-year CS student who enjoys teaching web development.' },
  { name: 'Demo Ravi', bio: 'DEMO ACCOUNT. Mathematics tutor and chess player.' },
  { name: 'Demo Meera', bio: 'DEMO ACCOUNT. Product design student, loves Figma.' },
  { name: 'Demo Karthik', bio: 'DEMO ACCOUNT. Guitarist and music theory nerd.' },
];
const demoSkills = [
  [0, 'React fundamentals in one session', 'Programming', 'Beginner', 30, 3, 'Components, props, state and hooks explained with a small live project. Bring a laptop with Node installed.', ['Build a small component tree', 'Understand state and effects']],
  [0, 'Git and GitHub workflow for teams', 'Programming', 'Intermediate', 45, 4, 'Branching, pull requests, resolving merge conflicts and writing useful commits.', ['Resolve a merge conflict', 'Open a clean pull request']],
  [1, 'Calculus problem-solving clinic', 'Mathematics', 'Intermediate', 60, 5, 'Bring your hardest limits, derivatives and integrals problems and work through them step by step.', ['Approach unfamiliar problems', 'Check answers confidently']],
  [2, 'Figma basics for non-designers', 'Design', 'Beginner', 45, 3, 'Frames, auto-layout and components. Leave with a clickable mobile prototype.', ['Create a reusable component', 'Share a prototype link']],
  [3, 'Guitar chords and strumming', 'Music', 'Beginner', 30, 2, 'Learn the open chords and three strumming patterns to play your first song.', ['Switch between open chords', 'Play a simple song']],
];

(async () => {
  if (env.isProd) { console.error('Refusing to seed in production.'); process.exit(1); }
  validateEnv();
  await connectDB();
  const password = process.env.SEED_PASSWORD || 'Demo1234!';
  const users = [];
  for (const [i, u] of demoUsers.entries()) {
    const email = `${u.name.split(' ')[1].toLowerCase()}${DOMAIN}`;
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ ...u, email, passwordHash: await hashPassword(password) });
      await credits.createWalletWithWelcome(user._id, env.welcomeCredits);
    }
    users[i] = user;
  }
  for (const [ti, title, category, level, dur, cost, description, outcomes] of demoSkills) {
    if (await SkillListing.exists({ teacher: users[ti]._id, title })) continue;
    const skill = await SkillListing.create({ teacher: users[ti]._id, title, category, level, durationMinutes: dur, credits: cost, description, outcomes });
    for (let d = 2; d <= 4; d++) {
      const start = new Date(); start.setDate(start.getDate() + d + ti); start.setHours(16 + (d % 2), 0, 0, 0);
      await Availability.create({ skill: skill._id, teacher: users[ti]._id, start, end: new Date(start.getTime() + dur * 60000) }).catch(() => {});
    }
  }
  console.log(`Seeded demo data. Demo logins (development only): ${demoUsers.map((u) => u.name.split(' ')[1].toLowerCase() + DOMAIN).join(', ')}  password: ${password}`);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
