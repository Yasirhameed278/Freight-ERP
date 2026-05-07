const puppeteer = require('puppeteer');
const fs = require('fs');

/* Find a usable Chrome executable — system install takes priority on Windows
   because the puppeteer-bundled Chromium may have spawn issues. */
const findChrome = () => {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ];
    const found = candidates.find((p) => fs.existsSync(p));
    if (found) return found;
  }
  return puppeteer.executablePath();
};

let browserPromise = null;

const getBrowser = () => {
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({
        headless: true,
        executablePath: findChrome(),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-extensions',
          '--no-first-run',
          '--window-size=1280,800',
        ],
      })
      .catch((err) => {
        browserPromise = null;
        throw err;
      });
  }
  return browserPromise;
};

const closeBrowser = async () => {
  if (browserPromise) {
    try {
      const browser = await browserPromise;
      await browser.close();
    } catch (_) {}
    browserPromise = null;
  }
};

process.on('SIGTERM', closeBrowser);
process.on('SIGINT', closeBrowser);

module.exports = { getBrowser, closeBrowser };
