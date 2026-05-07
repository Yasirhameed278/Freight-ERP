const fs = require('fs/promises');
const pdfParse = require('pdf-parse');

const extractTextFromPdf = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  return {
    text: data.text || '',
    pages: data.numpages,
    info: data.info,
  };
};

module.exports = { extractTextFromPdf };
