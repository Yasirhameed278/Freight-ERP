const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const { htmlToPdf } = require('./htmlToPdf');
const { renderQuote } = require('./templates/quoteTemplate');
const { renderInvoice } = require('./templates/invoiceTemplate');

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');
const GENERATED_DIR = path.join(UPLOAD_DIR, 'generated');

const ensureDir = async () => {
  await fs.mkdir(GENERATED_DIR, { recursive: true });
};

const filenameFor = (prefix, identifier) => {
  const stamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}-${identifier}-${stamp}-${random}.pdf`;
};

const generateQuotePdf = async (quote) => {
  await ensureDir();
  const html = renderQuote(quote);
  const filename = filenameFor('quote', quote.quoteNumber);
  const fullPath = path.join(GENERATED_DIR, filename);
  await htmlToPdf(html, { savePath: fullPath });

  const stat = await fs.stat(fullPath);
  return {
    filename,
    path: fullPath,
    size: stat.size,
    mimeType: 'application/pdf',
  };
};

const generateInvoicePdf = async (invoice) => {
  await ensureDir();
  const html = renderInvoice(invoice);
  const filename = filenameFor('invoice', invoice.invoiceNumber);
  const fullPath = path.join(GENERATED_DIR, filename);
  await htmlToPdf(html, { savePath: fullPath });

  const stat = await fs.stat(fullPath);
  return {
    filename,
    path: fullPath,
    size: stat.size,
    mimeType: 'application/pdf',
  };
};

module.exports = { generateQuotePdf, generateInvoicePdf };
