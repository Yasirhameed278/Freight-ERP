const { formatMoney, formatDate, escape, brand, baseStyles } = require('./_shared');

const STATUS_BADGE = {
  paid: 'badge-paid',
  overdue: 'badge-overdue',
  draft: 'badge-draft',
};

const renderInvoice = (invoice) => {
  const b = brand();
  const client = invoice.client || {};

  const linesHtml = (invoice.lines || []).map((line) => `
    <tr>
      <td>
        <strong>${escape(line.description)}</strong>
        ${line.code ? `<br/><small style="color:#5a6270">${escape(line.code)}</small>` : ''}
      </td>
      <td class="right">${line.quantity || 1}</td>
      <td class="right">${formatMoney(line.unitPrice, invoice.currency)}</td>
      <td class="right">${line.taxRate ? line.taxRate + '%' : '—'}</td>
      <td class="right"><strong>${formatMoney(line.total, invoice.currency)}</strong></td>
    </tr>
  `).join('');

  const paymentsHtml = (invoice.payments || []).map((p) => `
    <tr>
      <td>${formatDate(p.paidOn)}</td>
      <td>${escape(p.method?.replace(/_/g, ' ') || '—')}</td>
      <td>${escape(p.reference || '—')}</td>
      <td class="right"><strong>${formatMoney(p.amount, invoice.currency)}</strong></td>
    </tr>
  `).join('');

  const isOverdue = ['sent', 'partially_paid', 'overdue'].includes(invoice.status) && new Date(invoice.dueDate) < new Date();
  const statusClass = STATUS_BADGE[invoice.status] || 'badge-status';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Invoice ${escape(invoice.invoiceNumber)}</title>
<style>${baseStyles(b.color)}</style>
</head>
<body>
  <div class="doc">
    <div class="header">
      <div>
        <div class="brand-name">${escape(b.name)}</div>
        <div class="brand-meta">
          ${escape(b.address)}<br/>
          ${b.phone ? `Tel: ${escape(b.phone)} · ` : ''}${escape(b.email)}<br/>
          ${escape(b.website)}
        </div>
      </div>
      <div class="doc-title">
        <h1>${invoice.type === 'credit_note' ? 'Credit Note' : 'Invoice'}</h1>
        <div class="number">${escape(invoice.invoiceNumber)}</div>
        <div style="margin-top:8px">
          <span class="badge ${statusClass}">${escape((isOverdue ? 'overdue' : invoice.status).replace(/_/g, ' '))}</span>
        </div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-block">
        <h3>Bill To</h3>
        <div class="value">
          <strong>${escape(client.companyName || 'Customer')}</strong>
          ${client.clientCode ? `${escape(client.clientCode)}<br/>` : ''}
          ${client.email ? `${escape(client.email)}<br/>` : ''}
          ${client.taxNumber ? `Tax No: ${escape(client.taxNumber)}` : ''}
        </div>
      </div>
      <div class="meta-block" style="text-align:right">
        <h3>Invoice Details</h3>
        <div class="value">
          <strong>Issue Date:</strong> ${formatDate(invoice.issueDate)}<br/>
          <strong>Due Date:</strong> ${formatDate(invoice.dueDate)}<br/>
          ${invoice.poNumber ? `PO Number: ${escape(invoice.poNumber)}<br/>` : ''}
          ${invoice.shipment?.shipmentNumber ? `Shipment: ${escape(invoice.shipment.shipmentNumber)}<br/>` : ''}
          ${invoice.paymentTerms ? `Terms: ${escape(invoice.paymentTerms)}` : ''}
        </div>
      </div>
    </div>

    <table class="lines">
      <thead>
        <tr>
          <th>Description</th>
          <th class="right" style="width:60px">Qty</th>
          <th class="right" style="width:100px">Unit Price</th>
          <th class="right" style="width:60px">Tax</th>
          <th class="right" style="width:110px">Total</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml || `<tr><td colspan="5" style="text-align:center;padding:40px;color:#5a6270">No line items</td></tr>`}
      </tbody>
    </table>

    <div class="totals">
      <table>
        <tr>
          <td class="label">Subtotal</td>
          <td class="value">${formatMoney(invoice.subtotal, invoice.currency)}</td>
        </tr>
        ${invoice.taxTotal > 0 ? `
        <tr>
          <td class="label">Tax</td>
          <td class="value">${formatMoney(invoice.taxTotal, invoice.currency)}</td>
        </tr>` : ''}
        <tr class="grand">
          <td class="label">Total</td>
          <td class="value">${formatMoney(invoice.total, invoice.currency)}</td>
        </tr>
        ${invoice.amountPaid > 0 ? `
        <tr>
          <td class="label" style="color:#198754">Paid</td>
          <td class="value" style="color:#198754">−${formatMoney(invoice.amountPaid, invoice.currency)}</td>
        </tr>
        <tr class="grand">
          <td class="label">Amount Due</td>
          <td class="value">${formatMoney(invoice.amountDue, invoice.currency)}</td>
        </tr>` : ''}
      </table>
    </div>

    ${paymentsHtml ? `
    <div style="margin-top:30px">
      <h4 style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#5a6270;margin-bottom:8px">Payment History</h4>
      <table class="lines">
        <thead>
          <tr>
            <th>Date</th>
            <th>Method</th>
            <th>Reference</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>${paymentsHtml}</tbody>
      </table>
    </div>` : ''}

    <div class="footer">
      ${invoice.notes ? `
        <div class="footer-section">
          <h4>Notes</h4>
          <div>${escape(invoice.notes)}</div>
        </div>
      ` : ''}
      <div class="footer-section">
        <h4>Payment Instructions</h4>
        <div>Please remit payment by ${formatDate(invoice.dueDate)} to avoid late fees. Reference invoice number <strong>${escape(invoice.invoiceNumber)}</strong> on all payments.</div>
      </div>
      <div class="footer-section" style="text-align:center;margin-top:24px;color:#9aa1ad">
        Generated by ${escape(b.name)} · ${formatDate(new Date())}
      </div>
    </div>
  </div>
</body>
</html>`;
};

module.exports = { renderInvoice };
