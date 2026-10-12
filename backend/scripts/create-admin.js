// Creates (or promotes) the first administrator from ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD.
const { env, validateEnv } = require('../src/config/env');
const { connectDB } = require('../src/config/db');
const { User } = require('../src/models');
const credits = require('../src/services/creditService');
const { hashPassword } = require('../src/utils/password');
const v = require('../src/validators');

(async () => {
  validateEnv();
  const parsed = v.auth.register.safeParse({ name: process.env.ADMIN_NAME, email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, confirmPassword: process.env.ADMIN_PASSWORD });
  if (!parsed.success) { console.error('Set valid ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD:', parsed.error.issues.map((i) => i.message).join('; ')); process.exit(1); }
  await connectDB();
  const { name, email, password } = parsed.data;
  let user = await User.findOne({ email });
  if (user) { user.role = 'admin'; await user.save(); console.log(`Promoted existing user ${email} to admin.`); }
  else {
    user = await User.create({ name, email, passwordHash: await hashPassword(password), role: 'admin' });
    await credits.createWalletWithWelcome(user._id, env.welcomeCredits);
    console.log(`Created admin ${email}.`);
  }
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
