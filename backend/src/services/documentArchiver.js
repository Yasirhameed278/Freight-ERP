const Document = require('../models/Document');
const { generateDocumentNumber } = require('../utils/numberGenerators');
const activity = require('./activityLogger');

const archive = async ({
  pdfFile,
  category,
  name,
  description,
  entityType,
  entityId,
  shipmentId,
  clientId,
  uploadedBy,
  visibility = 'client',
  req,
}) => {
  const documentNumber = await generateDocumentNumber();

  const doc = await Document.create({
    documentNumber,
    name,
    originalName: pdfFile.filename,
    description,
    category,
    fileUrl: pdfFile.path,
    storageKey: pdfFile.filename,
    storageProvider: 'local',
    fileSize: pdfFile.size,
    mimeType: 'application/pdf',
    fileExtension: '.pdf',
    visibility,
    shipment: shipmentId,
    client: clientId,
    relatedTo: entityType ? { entityType, entityId } : undefined,
    uploadedBy,
    status: 'approved',
    isOcrProcessed: false,
  });

  if (req) {
    activity.log({
      req,
      entityType: 'Document',
      entityId: doc._id,
      action: 'create',
      summary: `System-generated ${category}: ${name}`,
    });
  }

  return doc;
};

module.exports = { archive };
