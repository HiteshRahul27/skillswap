const nodemailer = require('nodemailer');
const { env } = require('../config/env');

const isConfigured = () => Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

/** Returns { sent: boolean }. Never reports sent=true unless the SMTP server accepted the message. */
async function sendMail({ to, subject, text }) {
  if (!isConfigured()) return { sent: false };
  const transport = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
  await transport.sendMail({ from: env.smtp.from, to, subject, text });
  return { sent: true };
}

module.exports = { sendMail, isConfigured };
