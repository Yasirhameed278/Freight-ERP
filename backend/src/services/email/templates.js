const { brand } = require('../pdf/templates/_shared');

const wrap = (innerHtml, b) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${b.name}</title></head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#1a1d23;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:${b.color};padding:24px;color:#fff;">
          <h1 style="margin:0;font-size:20px;font-weight:600;">${b.name}</h1>
        </td></tr>
        <tr><td style="padding:32px 24px;">
          ${innerHtml}
        </td></tr>
        <tr><td style="background:#f8f9fa;padding:20px 24px;font-size:11px;color:#6c757d;border-top:1px solid #e5e7eb;">
          ${b.address}<br/>
          ${b.phone ? `${b.phone} · ` : ''}${b.email}<br/>
          ${b.website}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const quoteEmail = ({ quote, customerName, senderName }) => {
  const b = brand();
  const inner = `
    <p style="font-size:15px;margin:0 0 16px 0;">Dear ${customerName || 'valued customer'},</p>
    <p style="font-size:14px;line-height:1.6;margin:0 0 16px 0;">
      Please find attached our quotation <strong>${quote.quoteNumber}</strong> for your shipment requirement.
    </p>
    <table role="presentation" cellpadding="8" cellspacing="0" style="width:100%;background:#f8f9fa;border-radius:6px;font-size:13px;margin:16px 0;">
      <tr><td style="color:#5a6270;width:140px;">Reference</td><td><strong>${quote.quoteNumber}</strong></td></tr>
      ${quote.origin?.name ? `<tr><td style="color:#5a6270;">Origin</td><td>${quote.origin.name}</td></tr>` : ''}
      ${quote.destination?.name ? `<tr><td style="color:#5a6270;">Destination</td><td>${quote.destination.name}</td></tr>` : ''}
      ${quote.mode ? `<tr><td style="color:#5a6270;">Mode</td><td>${quote.mode.toUpperCase()} · ${quote.type || ''}</td></tr>` : ''}
      <tr><td style="color:#5a6270;">Valid Until</td><td><strong>${new Date(quote.validUntil).toLocaleDateString()}</strong></td></tr>
    </table>
    <p style="font-size:14px;line-height:1.6;margin:16px 0;">
      The full breakdown is in the attached PDF. If you have any questions or would like to proceed with booking, simply reply to this email.
    </p>
    <p style="font-size:14px;margin:24px 0 0 0;">
      Best regards,<br/>
      <strong>${senderName || b.name}</strong>
    </p>`;

  return {
    subject: `Quotation ${quote.quoteNumber} — ${b.name}`,
    html: wrap(inner, b),
    text: `Dear ${customerName || 'customer'},\n\nPlease find attached our quotation ${quote.quoteNumber} valid until ${new Date(quote.validUntil).toLocaleDateString()}.\n\nBest regards,\n${senderName || b.name}`,
  };
};

const invoiceEmail = ({ invoice, customerName }) => {
  const b = brand();
  const total = new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency || 'USD' }).format(invoice.total);
  const inner = `
    <p style="font-size:15px;margin:0 0 16px 0;">Dear ${customerName || 'valued customer'},</p>
    <p style="font-size:14px;line-height:1.6;margin:0 0 16px 0;">
      Please find attached invoice <strong>${invoice.invoiceNumber}</strong> for the amount of <strong>${total}</strong>.
    </p>
    <table role="presentation" cellpadding="8" cellspacing="0" style="width:100%;background:#f8f9fa;border-radius:6px;font-size:13px;margin:16px 0;">
      <tr><td style="color:#5a6270;width:140px;">Invoice Number</td><td><strong>${invoice.invoiceNumber}</strong></td></tr>
      <tr><td style="color:#5a6270;">Issue Date</td><td>${new Date(invoice.issueDate).toLocaleDateString()}</td></tr>
      <tr><td style="color:#5a6270;">Due Date</td><td><strong>${new Date(invoice.dueDate).toLocaleDateString()}</strong></td></tr>
      <tr><td style="color:#5a6270;">Amount Due</td><td><strong style="color:${b.color};font-size:15px;">${new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency || 'USD' }).format(invoice.amountDue)}</strong></td></tr>
    </table>
    <p style="font-size:14px;line-height:1.6;margin:16px 0;">
      Please remit payment by the due date. Reference invoice number <strong>${invoice.invoiceNumber}</strong> on all payments. The full breakdown is in the attached PDF.
    </p>
    <p style="font-size:14px;margin:24px 0 0 0;">
      Thank you for your business,<br/>
      <strong>${b.name}</strong>
    </p>`;

  return {
    subject: `Invoice ${invoice.invoiceNumber} from ${b.name}`,
    html: wrap(inner, b),
    text: `Invoice ${invoice.invoiceNumber} — ${total}\nDue: ${new Date(invoice.dueDate).toLocaleDateString()}\n\nPlease find the invoice attached. Thank you,\n${b.name}`,
  };
};

const portalQuoteEmail = ({ pq, quoteUrl }) => {
  const route = [
    pq.origin?.name  || pq.origin?.code,
    pq.destination?.name || pq.destination?.code,
  ].filter(Boolean).join(' → ') || 'Your route';

  const expiry = pq.tokenExpiry
    ? new Date(pq.tokenExpiry).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '7 days from today';

  const rateRows = (pq.rates || []).map((r) => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;">${r.carrier || '—'}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">${r.transitDays ? r.transitDays + ' days' : '—'}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#1d4ed8;text-align:right;">
        ${r.currency || 'USD'} ${(r.portalPrice || r.totalSell || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:36px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.07);">

  <tr><td style="background:linear-gradient(135deg,#4f46e5 0%,#06b6d4 100%);padding:26px 32px;">
    <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Reliq</span>
    <p style="color:rgba(255,255,255,.8);margin:4px 0 0;font-size:13px;">Logistics Platform</p>
  </td></tr>

  <tr><td style="padding:32px;">
    <h2 style="margin:0 0 6px;color:#0f172a;font-size:21px;font-weight:700;">Your freight quote is ready</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.5;">
      Hi ${pq.contact.name}, here are the rates we found for your shipment.
    </p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Shipment Details</div>
      <div style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:4px;">${route}</div>
      <div style="font-size:13px;color:#64748b;">
        Mode: ${(pq.mode || '').toUpperCase()}${pq.weight ? ` &nbsp;·&nbsp; ${pq.weight} ${pq.weightUnit}` : ''}${pq.volume ? ` &nbsp;·&nbsp; ${pq.volume} ${pq.volumeUnit}` : ''}
      </div>
    </div>

    ${rateRows ? `
    <div style="margin-bottom:28px;">
      <div style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">Available Rates</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#f8fafc;">
          <th style="padding:10px 14px;text-align:left;font-size:11px;color:#64748b;font-weight:600;">Carrier</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;color:#64748b;font-weight:600;">Transit</th>
          <th style="padding:10px 14px;text-align:right;font-size:11px;color:#64748b;font-weight:600;">All-in Price</th>
        </tr></thead>
        <tbody>${rateRows}</tbody>
      </table>
    </div>` : ''}

    <div style="text-align:center;margin:28px 0;">
      <a href="${quoteUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5 0%,#06b6d4 100%);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">
        View Quote &amp; Book &rarr;
      </a>
    </div>

    <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0 0 4px;">Valid until ${expiry} &nbsp;·&nbsp; Ref: <strong style="color:#64748b;">${pq.quoteRef}</strong></p>
  </td></tr>

  <tr><td style="background:#f8fafc;padding:18px 32px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
      Reliq Logistics Platform &nbsp;·&nbsp; If you didn't request this quote, please ignore this email.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = `Hi ${pq.contact.name},\n\nYour freight quote ${pq.quoteRef} is ready.\n\nRoute: ${route}\nMode: ${(pq.mode || '').toUpperCase()}\n\nView and book: ${quoteUrl}\n\nValid until: ${expiry}\n\nReliq Logistics Platform`;

  return {
    subject: `Your freight quote ${pq.quoteRef} — ${route}`,
    html,
    text,
  };
};

module.exports = { quoteEmail, invoiceEmail, portalQuoteEmail };
