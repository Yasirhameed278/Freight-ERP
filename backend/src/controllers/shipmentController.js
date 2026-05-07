const asyncHandler = require('../utils/asyncHandler');
const Shipment = require('../models/Shipment');
const generateShipmentNumber = require('../utils/generateShipmentNumber');
const { buildDefaultMilestones } = require('../utils/defaultMilestones');

const CUSTOMER_HIDDEN_FIELDS = [
  'charges', 'totalCost', 'profit', 'profitMargin', 'totalRevenue',
  'internalNotes', 'team', 'salesRep', 'operationsManager',
  'customsAgent', 'customsBroker',
];

const serializeForRole = (shipment, role) => {
  const obj = shipment.toObject ? shipment.toObject({ virtuals: true }) : shipment;
  if (role === 'customer') {
    for (const f of CUSTOMER_HIDDEN_FIELDS) delete obj[f];
  }
  return obj;
};

const ACTIVE_STATUSES = [
  'quote', 'booked', 'pickup_scheduled', 'cargo_received',
  'customs_export', 'loaded', 'in_transit', 'transhipment',
  'arrived', 'customs_import', 'cleared', 'out_for_delivery',
];

exports.listShipments = asyncHandler(async (req, res) => {
  const page  = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 25, 100);
  const skip  = (page - 1) * limit;

  const filter = { ...req.scope };

  if (req.query.status && req.query.status !== 'all') {
    if (req.query.status === 'active') {
      filter.status = { $in: ACTIVE_STATUSES };
    } else {
      filter.status = req.query.status;
    }
  } else if (req.user.role === 'customer' && !req.query.status) {
    filter.status = { $in: ACTIVE_STATUSES };
  }

  if (req.query.mode) filter.mode = req.query.mode;
  if (req.query.search) filter.$text = { $search: req.query.search };

  const populate = [
    { path: 'shipper',   select: 'companyName clientCode' },
    { path: 'consignee', select: 'companyName clientCode' },
    { path: 'customer',  select: 'companyName clientCode' },
  ];

  const [docs, total] = await Promise.all([
    Shipment.find(filter).populate(populate)
      .sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Shipment.countDocuments(filter),
  ]);

  res.json({
    success: true,
    items: docs.map((s) => serializeForRole(s, req.user.role)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.getShipment = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findOne({ _id: req.params.id, ...req.scope })
    .populate('shipper',   'companyName clientCode email phone')
    .populate('consignee', 'companyName clientCode email phone')
    .populate('customer',  'companyName clientCode email phone')
    .populate('milestones.updatedBy', 'firstName lastName');

  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found or access denied');
  }
  res.json({ success: true, shipment: serializeForRole(shipment, req.user.role) });
});

exports.createShipment = asyncHandler(async (req, res) => {
  const shipmentNumber = await generateShipmentNumber(req.body.mode);

  const milestones = req.body.milestones?.length
    ? req.body.milestones
    : buildDefaultMilestones({ mode: req.body.mode, direction: req.body.direction });

  const shipment = await Shipment.create({
    ...req.body,
    shipmentNumber,
    milestones,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, shipment });
});

exports.updateShipment = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findOne({ _id: req.params.id, ...req.scope });
  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found or access denied');
  }

  ['shipmentNumber', '_id', 'createdBy'].forEach((k) => delete req.body[k]);

  Object.assign(shipment, req.body);
  await shipment.save();
  res.json({ success: true, shipment });
});

exports.updateMilestone = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findOne({ _id: req.params.id, ...req.scope });
  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found or access denied');
  }
  const milestone = shipment.milestones.id(req.params.milestoneId);
  if (!milestone) {
    res.status(404);
    throw new Error('Milestone not found');
  }

  const { status, actualDate, plannedDate, remarks, location } = req.body;
  if (status) milestone.status = status;
  if (actualDate !== undefined) milestone.actualDate = actualDate;
  if (plannedDate !== undefined) milestone.plannedDate = plannedDate;
  if (remarks !== undefined) milestone.remarks = remarks;
  if (location !== undefined) milestone.location = location;
  milestone.updatedBy = req.user._id;

  if (status === 'completed') {
    const ev = (milestone.event || '').toLowerCase();
    if (ev.includes('delivered'))                 shipment.status = 'delivered';
    else if (ev.includes('out for delivery'))     shipment.status = 'out_for_delivery';
    else if (ev.includes('customs import'))       shipment.status = 'cleared';
    else if (ev.includes('arrived') || ev.includes('discharged')) shipment.status = 'arrived';
    else if (ev.includes('departed') || ev.includes('in transit')) shipment.status = 'in_transit';
    else if (ev.includes('loaded'))               shipment.status = 'loaded';
    else if (ev.includes('customs export'))       shipment.status = 'customs_export';
    else if (ev.includes('cargo received'))       shipment.status = 'cargo_received';
    else if (ev.includes('booking'))              shipment.status = 'booked';
  }

  await shipment.save();
  res.json({ success: true, shipment });
});

exports.addMilestone = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findOne({ _id: req.params.id, ...req.scope });
  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found or access denied');
  }
  shipment.milestones.push({ ...req.body, updatedBy: req.user._id });
  await shipment.save();
  res.json({ success: true, shipment });
});

exports.approveShipment = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) { res.status(404); throw new Error('Shipment not found'); }

  shipment.approvalStatus = 'approved';
  shipment.approvedBy     = req.user._id;
  shipment.approvedAt     = new Date();
  shipment.approvalNote   = req.body.note || '';
  if (shipment.status === 'quote') shipment.status = 'booked';
  await shipment.save();
  res.json({ success: true, shipment });
});

exports.rejectShipment = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) { res.status(404); throw new Error('Shipment not found'); }

  shipment.approvalStatus = 'rejected';
  shipment.approvedBy     = req.user._id;
  shipment.approvedAt     = new Date();
  shipment.approvalNote   = req.body.note || '';
  await shipment.save();
  res.json({ success: true, shipment });
});

exports.generateBL = asyncHandler(async (req, res) => {
  const path = require('path');
  const fs   = require('fs/promises');

  const shipment = await Shipment.findById(req.params.id)
    .populate('shipper',     'companyName addresses contactPersons')
    .populate('consignee',   'companyName addresses contactPersons')
    .populate('notifyParty', 'companyName addresses contactPersons')
    .populate('customer',    'companyName');

  if (!shipment) { res.status(404); throw new Error('Shipment not found'); }

  const { renderBL } = require('../services/pdf/templates/blTemplate');
  const { htmlToPdf } = require('../services/pdf/htmlToPdf');

  const html = renderBL(shipment);

  const UPLOAD_DIR    = path.resolve(process.env.UPLOAD_DIR || './uploads');
  const GENERATED_DIR = path.join(UPLOAD_DIR, 'generated');
  await fs.mkdir(GENERATED_DIR, { recursive: true });

  const filename = `BL-${shipment.shipmentNumber}-${Date.now()}.pdf`;
  const fullPath = path.join(GENERATED_DIR, filename);

  await htmlToPdf(html, { savePath: fullPath });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  const buffer = await fs.readFile(fullPath);
  res.send(buffer);

  fs.unlink(fullPath).catch(() => {});
});

exports.deleteShipment = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findOneAndDelete({ _id: req.params.id, ...req.scope });
  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found or access denied');
  }
  res.json({ success: true, message: 'Shipment deleted' });
});
