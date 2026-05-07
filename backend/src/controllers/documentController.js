const fs = require('fs/promises');
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const Document = require('../models/Document');
const Shipment = require('../models/Shipment');
const { processDocument } = require('../services/documentProcessor');
const { generateDocumentNumber } = require('../utils/numberGenerators');

exports.uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded (field name must be "file")');
  }

  const cleanup = async () => fs.unlink(req.file.path).catch(() => {});

  const {
    name, description, category,
    shipmentId, dealId, clientId,
    autoOcr = 'true',
    autoApply = 'true',
  } = req.body;

  if (!category) {
    await cleanup();
    res.status(400);
    throw new Error('category is required');
  }

  if (shipmentId) {
    const allowed = await Shipment.findOne({ _id: shipmentId, ...req.scope }).select('_id');
    if (!allowed) {
      await cleanup();
      res.status(404);
      throw new Error('Shipment not found or access denied');
    }
  }

  // Auto-inherit client from shipment.customer if not provided
  let resolvedClientId = clientId;
  if (shipmentId && !resolvedClientId) {
    const ship = await Shipment.findById(shipmentId).select('customer');
    resolvedClientId = ship?.customer?.toString();
  }

  const customerVisibleCategories = new Set([
    'proof_of_delivery', 'arrival_notice', 'delivery_order',
    'house_bl', 'house_awb', 'commercial_invoice', 'packing_list',
  ]);
  const visibility = req.body.visibility ||
    (customerVisibleCategories.has(category) ? 'client' : 'internal');

  const documentNumber = await generateDocumentNumber();

  const doc = await Document.create({
    documentNumber,
    name: name || req.file.originalname,
    originalName: req.file.originalname,
    description,
    category,
    visibility,
    fileUrl: req.file.path,
    storageKey: req.file.filename,
    storageProvider: 'local',
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    fileExtension: path.extname(req.file.originalname).toLowerCase(),
    shipment: shipmentId || undefined,
    deal: dealId || undefined,
    client: resolvedClientId || undefined,
    relatedTo: shipmentId
      ? { entityType: 'Shipment', entityId: shipmentId }
      : dealId
      ? { entityType: 'Deal', entityId: dealId }
      : resolvedClientId
      ? { entityType: 'Client', entityId: resolvedClientId }
      : undefined,
    uploadedBy: req.user._id,
    status: 'draft',
  });

  let processResult = null;
  let processError = null;

  if (autoOcr !== 'false') {
    try {
      processResult = await processDocument(doc._id, {
        autoApply: autoApply !== 'false',
      });
    } catch (err) {
      processError = err.message;
      doc.extractedData = { error: err.message, processedAt: new Date() };
      doc.isOcrProcessed = false;
      await doc.save();
    }
  }

  const fresh = await Document.findById(doc._id);

  res.status(201).json({
    success: true,
    document: fresh,
    ocr: processResult?.extracted || null,
    shipmentUpdate: processResult?.shipmentUpdate || null,
    error: processError,
  });
});

exports.reprocessDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) {
    res.status(404);
    throw new Error('Document not found');
  }

  if (doc.shipment) {
    const allowed = await Shipment.findOne({ _id: doc.shipment, ...req.scope }).select('_id');
    if (!allowed) {
      res.status(403);
      throw new Error('Access denied');
    }
  }

  const result = await processDocument(doc._id, {
    autoApply: req.body.autoApply !== false,
  });

  res.json({
    success: true,
    document: result.document,
    ocr: result.extracted,
    shipmentUpdate: result.shipmentUpdate,
  });
});

exports.getDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id).select('+ocrText');
  if (!doc) {
    res.status(404);
    throw new Error('Document not found');
  }
  res.json({ success: true, document: doc });
});

exports.listDocuments = asyncHandler(async (req, res) => {
  const filter = { ...req.scope };
  if (req.query.shipmentId) filter.shipment = req.query.shipmentId;
  if (req.query.dealId)     filter.deal     = req.query.dealId;
  if (req.query.clientId)   filter.client   = req.query.clientId;
  if (req.query.category)   filter.category = req.query.category;

  const items = await Document.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.json({ success: true, items });
});

exports.downloadDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) {
    res.status(404);
    throw new Error('Document not found');
  }
  doc.downloadCount += 1;
  doc.lastAccessedAt = new Date();
  await doc.save({ validateBeforeSave: false });
  res.download(doc.fileUrl, doc.originalName || doc.name);
});
