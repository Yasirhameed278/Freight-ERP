const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });
  }
  return transporter;
};

const send = async ({ from, to, cc, subject, html, text, attachments }) => {
  const t = getTransporter();
  const info = await t.sendMail({
    from,
    to: Array.isArray(to) ? to.join(', ') : to,
    cc: Array.isArray(cc) ? cc.join(', ') : cc,
    subject,
    text,
    html,
    attachments,
  });
  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
};

module.exports = { send };
