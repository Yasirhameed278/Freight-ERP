const { extractTextFromFile } = require('./ocr');
const { extractContainerNumbers } = require('./ocr/parsers/containerParser');
const { extractWeights, pickPrimaryWeight } = require('./ocr/parsers/weightParser');
const Document = require('../models/Document');
const Shipment = require('../models/Shipment');

const processDocument = async (documentId, { autoApply = true } = {}) => {
  const doc = await Document.findById(documentId);
  if (!doc) throw new Error('Document not found');

  const ocr = await extractTextFromFile(doc.fileUrl);

  const containers = extractContainerNumbers(ocr.text);
  const weights = extractWeights(ocr.text);
  const primaryWeight = pickPrimaryWeight(weights);

  const extracted = {
    containers: containers.valid,
    containerCandidates: containers.candidates,
    weights,
    primaryWeight,
    engine: ocr.engine,
    confidence: ocr.confidence,
    processedAt: new Date(),
  };

  doc.ocrText = ocr.text;
  doc.extractedData = extracted;
  doc.isOcrProcessed = true;
  await doc.save();

  let shipmentUpdate = null;
  if (autoApply && doc.shipment) {
    shipmentUpdate = await applyToShipment(doc.shipment, extracted);
  }

  return { document: doc, extracted, shipmentUpdate };
};

const applyToShipment = async (shipmentId, extracted) => {
  const shipment = await Shipment.findById(shipmentId);
  if (!shipment) return null;

  const changes = [];
  const primaryKg = extracted.primaryWeight?.valueKg;

  for (const num of extracted.containers || []) {
    const existing = shipment.containers.find((c) => c.containerNumber === num);
    if (existing) {
      if (primaryKg && !existing.grossWeight) {
        existing.grossWeight = primaryKg;
        changes.push(`Set gross weight on ${num} → ${primaryKg} KG`);
      }
    } else {
      shipment.containers.push({
        containerNumber: num,
        grossWeight: primaryKg,
      });
      changes.push(`Added container ${num}${primaryKg ? ` (${primaryKg} KG)` : ''}`);
    }
  }

  if (primaryKg && !shipment.totalGrossWeight) {
    shipment.totalGrossWeight = primaryKg;
    changes.push(`Set total gross weight → ${primaryKg} KG`);
  }

  if (changes.length > 0) {
    await shipment.save();
  }

  return { shipmentId, changes, applied: changes.length > 0 };
};

module.exports = { processDocument, applyToShipment };
