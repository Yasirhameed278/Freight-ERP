const asyncHandler = require('../utils/asyncHandler');
const Invoice = require('../models/Invoice');
const { generateInvoiceNumber } = require('../utils/numberGenerators');
const activity = require('../services/activityLogger');
const { generateInvoicePdf } = require('../services/pdf');
const { sendEmail } = require('../services/email');
const { invoiceEmail } = require('../services/email/templates');
const documentArchiver = require('../services/documentArchiver');

exports.listInvoices = asyncHandler(async (req, res) => {
  const filter = { ...req.scope };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.clientId) filter.client = req.query.clientId;
  if (req.query.shipmentId) filter.shipment = req.query.shipmentId;
  if (req.query.type) filter.type = req.query.type;

  const items = await Invoice.find(filter)
    .populate('client', 'companyName clientCode')
    .populate('shipment', 'shipmentNumber')
    .sort({ issueDate: -1 })
    .limit(200)
    .lean({ virtuals: true });
  res.json({ success: true, items });
});

exports.getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...req.scope })
    .populate('client')
    .populate('shipment', 'shipmentNumber mode portOfLoading portOfDischarge');
  if (!invoice) { res.status(404); throw new Error('Invoice not found'); }
  res.json({ success: true, invoice });
});

exports.createInvoice = asyncHandler(async (req, res) => {
  const invoiceNumber = await generateInvoiceNumber();
  const invoice = await Invoice.create({
    ...req.body,
    invoiceNumber,
    createdBy: req.user._id,
  });
  activity.log({ req, entityType: 'Invoice', entityId: invoice._id, action: 'create',
    summary: `Invoice ${invoice.invoiceNumber} created — ${invoice.currency} ${invoice.total}` });
  res.status(201).json({ success: true, invoice });
});

exports.sendInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...req.scope })
    .populate('client', 'companyName clientCode email phone taxNumber')
    .populate('shipment', 'shipmentNumber');

  if (!invoice) { res.status(404); throw new Error('Invoice not found'); }
  if (invoice.status === 'cancelled') {
    res.status(400);
    throw new Error('Cannot send a cancelled invoice');
  }

  const recipientEmail = req.body.email || invoice.client?.email;
  if (!recipientEmail) {
    res.status(400);
    throw new Error('No recipient email — provide one in the request body or set client.email');
  }

  const pdfFile = await generateInvoicePdf(invoice);

  const doc = await documentArchiver.archive({
    pdfFile,
    category: 'commercial_invoice',
    name: `Invoice ${invoice.invoiceNumber}.pdf`,
    description: `Invoice for ${invoice.client?.companyName}`,
    entityType: 'Invoice',
    entityId: invoice._id,
    shipmentId: invoice.shipment?._id,
    clientId: invoice.client?._id,
    uploadedBy: req.user._id,
    visibility: 'client',
    req,
  });

  const { subject, html, text } = invoiceEmail({
    invoice,
    customerName: invoice.client?.companyName,
  });

  const emailResult = await sendEmail({
    to: recipientEmail,
    cc: req.body.cc,
    subject,
    html,
    text,
    attachments: [{
      filename: `Invoice-${invoice.invoiceNumber}.pdf`,
      path: pdfFile.path,
      contentType: 'application/pdf',
    }],
  });

  if (invoice.status === 'draft') {
    invoice.status = 'sent';
    invoice.sentAt = new Date();
    await invoice.save();
  }

  activity.log({
    req,
    entityType: 'Invoice',
    entityId: invoice._id,
    action: 'send',
    summary: `Invoice ${invoice.invoiceNumber} sent to ${recipientEmail}`,
    metadata: { documentId: doc._id, emailMessageId: emailResult.messageId },
  });

  res.json({
    success: true,
    invoice,
    document: doc,
    email: emailResult,
  });
});

exports.downloadInvoicePdf = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...req.scope })
    .populate('client', 'companyName clientCode email taxNumber')
    .populate('shipment', 'shipmentNumber');

  if (!invoice) { res.status(404); throw new Error('Invoice not found'); }

  const pdfFile = await generateInvoicePdf(invoice);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
  res.sendFile(pdfFile.path);
});

exports.recordPayment = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...req.scope });
  if (!invoice) { res.status(404); throw new Error('Invoice not found'); }
  if (['cancelled', 'written_off'].includes(invoice.status)) {
    res.status(400);
    throw new Error('Cannot record payment on this invoice');
  }

  const { amount, paidOn, method, reference, notes } = req.body;
  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('Payment amount must be positive');
  }
  if (amount > invoice.amountDue + 0.01) {
    res.status(400);
    throw new Error(`Payment exceeds outstanding balance (${invoice.amountDue})`);
  }

  invoice.payments.push({
    amount, paidOn: paidOn || new Date(), method, reference, notes,
    recordedBy: req.user._id,
  });
  await invoice.save();
  activity.log({ req, entityType: 'Invoice', entityId: invoice._id, action: 'pay',
    summary: `Payment of ${invoice.currency} ${amount} recorded`,
    metadata: { method, reference } });
  res.json({ success: true, invoice });
});

exports.cancelInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...req.scope });
  if (!invoice) { res.status(404); throw new Error('Invoice not found'); }
  invoice.status = 'cancelled';
  await invoice.save();
  activity.log({ req, entityType: 'Invoice', entityId: invoice._id, action: 'cancel',
    summary: `Invoice ${invoice.invoiceNumber} cancelled` });
  res.json({ success: true, invoice });
});
