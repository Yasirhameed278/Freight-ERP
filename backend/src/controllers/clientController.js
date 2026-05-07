const asyncHandler = require('../utils/asyncHandler');
const Client = require('../models/Client');
const Shipment = require('../models/Shipment');
const Invoice = require('../models/Invoice');
const Deal = require('../models/Deal');
const { generateClientCode } = require('../utils/numberGenerators');
const activity = require('../services/activityLogger');

exports.listClients = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 25, 100);
  const filter = { ...req.scope };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.search) filter.$text = { $search: req.query.search };

  const [items, total] = await Promise.all([
    Client.find(filter)
      .populate('accountManager', 'firstName lastName')
      .populate('salesRep', 'firstName lastName')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean({ virtuals: true }),
    Client.countDocuments(filter),
  ]);
  res.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

exports.getClient = asyncHandler(async (req, res) => {
  const client = await Client.findOne({ _id: req.params.id, ...req.scope })
    .populate('accountManager', 'firstName lastName email')
    .populate('salesRep', 'firstName lastName email');
  if (!client) { res.status(404); throw new Error('Client not found'); }
  res.json({ success: true, client });
});

exports.getClient360 = asyncHandler(async (req, res) => {
  const client = await Client.findOne({ _id: req.params.id, ...req.scope });
  if (!client) { res.status(404); throw new Error('Client not found'); }

  const [recentShipments, openInvoices, activeDeals, shipmentStats] = await Promise.all([
    Shipment.find({ customer: client._id })
      .sort({ createdAt: -1 }).limit(10)
      .select('shipmentNumber status mode portOfLoading portOfDischarge etd eta totalRevenue')
      .lean(),
    Invoice.find({ client: client._id, status: { $in: ['sent', 'partially_paid', 'overdue'] } })
      .sort({ dueDate: 1 }).limit(20)
      .select('invoiceNumber status total amountDue currency dueDate')
      .lean({ virtuals: true }),
    Deal.find({ client: client._id, stage: { $in: ['inquiry', 'quoted', 'confirmed'] } })
      .sort({ updatedAt: -1 }).limit(10)
      .select('dealCode title stage estimatedValue currency expectedCloseDate')
      .lean(),
    Shipment.aggregate([
      { $match: { customer: client._id } },
      { $group: {
          _id: null,
          totalShipments: { $sum: 1 },
          totalRevenue: { $sum: '$totalRevenue' },
          totalProfit: { $sum: '$profit' },
        }
      },
    ]),
  ]);

  const stats = shipmentStats[0] || { totalShipments: 0, totalRevenue: 0, totalProfit: 0 };
  const outstandingAR = openInvoices.reduce((s, inv) => s + (inv.amountDue || 0), 0);

  res.json({
    success: true,
    client,
    stats: {
      ...stats,
      outstandingAR: +outstandingAR.toFixed(2),
      openInvoiceCount: openInvoices.length,
      activeDealCount: activeDeals.length,
    },
    recentShipments,
    openInvoices,
    activeDeals,
  });
});

exports.createClient = asyncHandler(async (req, res) => {
  const clientCode = req.body.clientCode || (await generateClientCode());
  const client = await Client.create({ ...req.body, clientCode, createdBy: req.user._id });
  activity.log({ req, entityType: 'Client', entityId: client._id, action: 'create',
    summary: `Client ${client.companyName} (${client.clientCode}) created` });
  res.status(201).json({ success: true, client });
});

exports.updateClient = asyncHandler(async (req, res) => {
  const client = await Client.findOne({ _id: req.params.id, ...req.scope });
  if (!client) { res.status(404); throw new Error('Client not found'); }
  delete req.body.clientCode;
  Object.assign(client, req.body);
  await client.save();
  activity.log({ req, entityType: 'Client', entityId: client._id, action: 'update',
    summary: `Client ${client.companyName} updated` });
  res.json({ success: true, client });
});

exports.deleteClient = asyncHandler(async (req, res) => {
  const client = await Client.findOneAndDelete({ _id: req.params.id, ...req.scope });
  if (!client) { res.status(404); throw new Error('Client not found'); }
  activity.log({ req, entityType: 'Client', entityId: req.params.id, action: 'delete',
    summary: `Client ${client.companyName} deleted` });
  res.json({ success: true });
});
