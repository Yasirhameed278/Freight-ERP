const formatMoney = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

const escape = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const brand = () => ({
  name:    process.env.BRAND_NAME    || 'Freight ERP',
  address: process.env.BRAND_ADDRESS || '',
  email:   process.env.BRAND_EMAIL   || '',
  phone:   process.env.BRAND_PHONE   || '',
  website: process.env.BRAND_WEBSITE || '',
  color:   process.env.BRAND_COLOR   || '#0b5ed7',
});

const baseStyles = (color) => `
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #1a1d23;
    font-size: 12px;
    line-height: 1.5;
    margin: 0;
    padding: 0;
  }
  .doc { max-width: 210mm; padding: 0; }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid ${color};
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .brand-name {
    font-size: 22px;
    font-weight: 700;
    color: ${color};
    margin: 0 0 4px 0;
  }
  .brand-meta { font-size: 10px; color: #5a6270; line-height: 1.4; }
  .doc-title { text-align: right; }
  .doc-title h1 {
    font-size: 28px;
    font-weight: 300;
    color: ${color};
    margin: 0;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .doc-title .number { font-size: 14px; font-weight: 600; margin-top: 4px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
  .meta-block h3 {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #5a6270;
    margin: 0 0 6px 0;
    font-weight: 600;
  }
  .meta-block .value { font-size: 12px; }
  .meta-block .value strong { display: block; font-size: 13px; margin-bottom: 2px; }
  table.lines { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  table.lines th {
    background: ${color};
    color: #fff;
    padding: 10px 12px;
    text-align: left;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }
  table.lines th.right, table.lines td.right { text-align: right; }
  table.lines td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 11px; vertical-align: top; }
  table.lines tr:last-child td { border-bottom: 2px solid #1a1d23; }
  .totals { margin-left: auto; width: 280px; }
  .totals table { width: 100%; }
  .totals td { padding: 6px 0; font-size: 12px; }
  .totals td.label { color: #5a6270; }
  .totals td.value { text-align: right; font-weight: 500; }
  .totals tr.grand td {
    border-top: 2px solid #1a1d23;
    padding-top: 10px;
    font-size: 15px;
    font-weight: 700;
    color: ${color};
  }
  .footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
    font-size: 10px;
    color: #5a6270;
    line-height: 1.6;
  }
  .footer h4 {
    font-size: 11px;
    color: #1a1d23;
    margin: 0 0 4px 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .footer-section { margin-bottom: 12px; }
  .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .badge-status { background: ${color}; color: #fff; }
  .badge-paid { background: #198754; color: #fff; }
  .badge-overdue { background: #dc3545; color: #fff; }
  .badge-draft { background: #6c757d; color: #fff; }
`;

module.exports = { formatMoney, formatDate, escape, brand, baseStyles };
