const consoleBackend = require('./console');
const smtpBackend = require('./smtp');
const mockBackend = require('./mock');

const PROVIDER = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Freight ERP';
const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com';

const getBackend = () => {
  if (PROVIDER === 'smtp') return smtpBackend;
  if (PROVIDER === 'mock') return mockBackend;
  return consoleBackend;
};

const sendEmail = async (opts) => {
  if (!opts.to) throw new Error('email.send: "to" is required');
  if (!opts.subject) throw new Error('email.send: "subject" is required');

  const from = opts.from || `"${FROM_NAME}" <${FROM_ADDRESS}>`;
  const backend = getBackend();

  try {
    const result = await backend.send({ ...opts, from });
    return { success: true, ...result };
  } catch (err) {
    console.error('[email] send failed:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendEmail };
