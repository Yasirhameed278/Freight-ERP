const send = async ({ to, cc, subject, html, text, attachments }) => {
  console.log('\n📧 ───── EMAIL (console mode) ─────');
  console.log(`To:      ${Array.isArray(to) ? to.join(', ') : to}`);
  if (cc) console.log(`Cc:      ${Array.isArray(cc) ? cc.join(', ') : cc}`);
  console.log(`Subject: ${subject}`);
  if (attachments?.length) {
    console.log(`Attachments: ${attachments.map((a) => a.filename).join(', ')}`);
  }
  console.log('─── body (text) ───');
  console.log(text || html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200));
  console.log('───────────────────\n');
  return { messageId: `console-${Date.now()}`, accepted: [to].flat() };
};

module.exports = { send };
