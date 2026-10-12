const mongoose = require('mongoose');
const { env } = require('./env');

async function connectDB(uri = env.mongoUri) {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  } catch (err) {
    throw new Error(`Could not connect to MongoDB. Check that it is running and MONGO_URI is correct. (${err.message})`);
  }
  // Make sure unique/sparse indexes exist before serving traffic (they protect accounting).
  await mongoose.syncIndexes();
  return mongoose.connection;
}

module.exports = { connectDB };
