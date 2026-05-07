const Tesseract = require('tesseract.js');

const ocrImage = async (filePath, lang = 'eng') => {
  const { data } = await Tesseract.recognize(filePath, lang, {
    logger: () => {},
  });
  return {
    text: data.text || '',
    confidence: data.confidence,
    engine: 'tesseract',
  };
};

module.exports = { ocrImage };
