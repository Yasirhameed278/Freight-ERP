const path = require('path');
const tesseract = require('./tesseractEngine');
const cloud = require('./cloudVisionEngine');
const { extractTextFromPdf } = require('../pdfTextExtractor');

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.webp']);
const ENGINE = (process.env.OCR_ENGINE || 'tesseract').toLowerCase();

const getImageEngine = () => (ENGINE === 'cloud' ? cloud : tesseract);

const extractTextFromFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    const { text, pages } = await extractTextFromPdf(filePath);
    if (text && text.replace(/\s/g, '').length >= 50) {
      return { text, pages, engine: 'pdf-text', confidence: 1.0 };
    }
    throw new Error(
      'Scanned PDF detected (no embedded text). To support scanned PDFs, ' +
      'install pdf2pic + GraphicsMagick and rasterize pages before OCR.'
    );
  }

  if (IMAGE_EXTS.has(ext)) {
    const engine = getImageEngine();
    return await engine.ocrImage(filePath);
  }

  throw new Error(`Unsupported extension for OCR: ${ext}`);
};

module.exports = { extractTextFromFile };
