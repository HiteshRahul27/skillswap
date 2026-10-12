const { env, validateEnv } = require('./config/env');
const { connectDB } = require('./config/db');
const { createApp } = require('./app');

async function main() {
  validateEnv();
  await connectDB();
  const app = createApp();
  app.listen(env.port, () => console.log(`SkillSwap API listening on http://localhost:${env.port} (${env.nodeEnv})`));
}

main().catch((err) => {
  console.error(`\nStartup failed.\n${err.message}\n`);
  process.exit(1);
});
