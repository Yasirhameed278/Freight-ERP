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

module.exports = { quoteEmail, invoiceEmail };
