/**
 * ISO 6346 container number validation.
 * Format: 3-letter owner code + category letter (U/J/Z) + 6 digit serial + 1 check digit.
 */
const LETTER_VALUES = {
  A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19,
  J: 20, K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29,
  S: 30, T: 31, U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
};

const computeCheckDigit = (firstTen) => {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = firstTen[i];
    const val = /[A-Z]/.test(ch) ? LETTER_VALUES[ch] : Number(ch);
    sum += val * Math.pow(2, i);
  }
  const mod = sum % 11;
  return mod === 10 ? 0 : mod;
};

const isValidContainerNumber = (num) => {
  if (!/^[A-Z]{3}[UJZ]\d{7}$/.test(num)) return false;
  const expected = computeCheckDigit(num.substring(0, 10));
  const actual = Number(num[10]);
  return expected === actual;
};

const extractContainerNumbers = (text) => {
  if (!text) return { valid: [], candidates: [] };

  const upper = text.toUpperCase();
  const matches = upper.match(/[A-Z]{3}[UJZ]\s?\d{6,7}/g) || [];

  const valid = new Set();
  const candidates = new Set();

  for (const raw of matches) {
    const cleaned = raw.replace(/\s+/g, '');
    if (cleaned.length !== 11) continue;

    if (isValidContainerNumber(cleaned)) {
      valid.add(cleaned);
    } else {
      candidates.add(cleaned);
    }
  }

  return {
    valid: Array.from(valid),
    candidates: Array.from(candidates),
  };
};

module.exports = {
  extractContainerNumbers,
  isValidContainerNumber,
  computeCheckDigit,
};
