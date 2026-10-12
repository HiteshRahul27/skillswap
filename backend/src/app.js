const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { env } = require('./config/env');
const { notFound, errorHandler } = require('./middleware/error');
const { apiLimiter } = require('./middleware/rateLimit');
const { asyncHandler, ok } = require('./utils/http');
const skillController = require('./controllers/skillController');

function createApp() {
  const app = express();
  if (env.isProd) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.clientUrl.split(',').map((s) => s.trim()), credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));
  app.use('/api', apiLimiter);

  app.get('/api/health', (_req, res) => {
    const up = mongoose.connection.readyState === 1;
    res.status(up ? 200 : 503).json({ success: up, data: { status: up ? 'ok' : 'database_unavailable', uptime: Math.round(process.uptime()) } });
  });
  app.get('/api/stats', asyncHandler(skillController.stats));

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/profiles', require('./routes/profiles'));
  app.use('/api/skills', require('./routes/skills'));
  app.use('/api/availability', require('./routes/availability'));
  app.use('/api/bookings', require('./routes/bookings'));
  app.use('/api/wallet', require('./routes/wallet'));
  app.use('/api/reviews', require('./routes/reviews'));
  app.use('/api/admin', require('./routes/admin'));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
