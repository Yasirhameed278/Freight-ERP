const fs = require('fs/promises');
const path = require('path');
const { getBrowser } = require('./browser');

const htmlToPdf = async (html, { savePath, format = 'A4', margin } = {}) => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    const buffer = await page.pdf({
      format,
      printBackground: true,
      margin: margin || { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });

    if (savePath) {
      await fs.mkdir(path.dirname(savePath), { recursive: true });
      await fs.writeFile(savePath, buffer);
      return { buffer, path: savePath };
    }
    return { buffer };
  } finally {
    await page.close();
  }
};

module.exports = { htmlToPdf };
