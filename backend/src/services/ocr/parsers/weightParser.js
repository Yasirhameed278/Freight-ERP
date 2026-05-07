const UNIT_TO_KG = {
  KG: 1, KGS: 1, KILOGRAM: 1, KILOGRAMS: 1,
  LB: 0.45359237, LBS: 0.45359237, POUND: 0.45359237, POUNDS: 0.45359237,
  MT: 1000, TONNE: 1000, TONNES: 1000, TON: 1000, TONS: 1000, T: 1000,
};

const LABEL_PRIORITY = [
  /GROSS\s*WEIGHT|GROSS\s*WT|G\.?W\.?/i,
  /TOTAL\s*WEIGHT|TOTAL\s*WT/i,
  /^WEIGHT$|^WT$/i,
  /NET\s*WEIGHT|NET\s*WT|N\.?W\.?/i,
];

const parseNumber = (raw) => {
  const cleaned = raw.replace(/[,\s](?=\d{3}\b)/g, '').replace(/\s+/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
};

const extractWeights = (text) => {
  if (!text) return [];

  const pattern = new RegExp(
    String.raw`(GROSS\s*WEIGHT|GROSS\s*WT|TOTAL\s*WEIGHT|TOTAL\s*WT|NET\s*WEIGHT|NET\s*WT|G\.?W\.?|N\.?W\.?|WEIGHT|WT)?[\s:.\-]{0,5}` +
      String.raw`([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*` +
      String.raw`(KGS?|KILOGRAMS?|LBS?|POUNDS?|MT|TONNES?|TONS?|T)\b`,
    'gi'
  );

  const results = [];
  let m;
  while ((m = pattern.exec(text)) !== null) {
    const [, label, numStr, unitRaw] = m;
    const value = parseNumber(numStr);
    if (value === null || value <= 0) continue;

    const unit = unitRaw.toUpperCase();
    const factor = UNIT_TO_KG[unit];
    if (!factor) continue;

    results.push({
      label: (label || 'unlabeled').trim().toUpperCase(),
      rawValue: value,
      unit,
      valueKg: +(value * factor).toFixed(2),
    });
  }
  return results;
};

const pickPrimaryWeight = (weights) => {
  if (!weights || weights.length === 0) return null;

  for (const re of LABEL_PRIORITY) {
    const found = weights.find((w) => re.test(w.label));
    if (found) return found;
  }
  return weights.reduce((a, b) => (a.valueKg >= b.valueKg ? a : b));
};

module.exports = { extractWeights, pickPrimaryWeight };
