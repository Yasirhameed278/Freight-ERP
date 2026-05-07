const Rate = require('../models/Rate');

const searchRates = async ({
  mode, type, originCode, destinationCode, originCountry, destinationCountry,
  carrier, clientId, weight, volume, asOf, includeExpired = false,
}) => {
  const now = asOf ? new Date(asOf) : new Date();

  const filter = {};
  if (mode) filter.mode = mode;
  if (type) filter.type = type;
  if (carrier) filter.carrier = new RegExp(`^${carrier}`, 'i');

  if (originCode) filter['origin.code'] = originCode.toUpperCase();
  if (destinationCode) filter['destination.code'] = destinationCode.toUpperCase();
  if (originCountry) filter['origin.country'] = originCountry;
  if (destinationCountry) filter['destination.country'] = destinationCountry;

  if (!includeExpired) {
    filter.status = 'active';
    filter.validFrom = { $lte: now };
    filter.validTo = { $gte: now };
  }

  if (volume) {
    filter.$and = filter.$and || [];
    filter.$and.push(
      { $or: [{ minVolume: { $exists: false } }, { minVolume: null }, { minVolume: { $lte: volume } }] },
      { $or: [{ maxVolume: { $exists: false } }, { maxVolume: null }, { maxVolume: { $gte: volume } }] },
    );
  }
  if (weight) {
    filter.$and = filter.$and || [];
    filter.$and.push(
      { $or: [{ minWeight: { $exists: false } }, { minWeight: null }, { minWeight: { $lte: weight } }] },
      { $or: [{ maxWeight: { $exists: false } }, { maxWeight: null }, { maxWeight: { $gte: weight } }] },
    );
  }

  if (clientId) {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { appliesToClients: { $exists: false } },
        { appliesToClients: { $size: 0 } },
        { appliesToClients: clientId },
      ],
    });
  }

  const rates = await Rate.find(filter).populate('vendor', 'companyName').lean();

  const enriched = rates.map((r) => {
    const totalBuy = (r.charges || []).reduce((s, c) => s + (c.amount || 0), 0);
    let totalSell;
    if (r.markupType === 'absolute_sell') {
      totalSell = r.markupValue;
    } else if (r.markupType === 'flat') {
      totalSell = totalBuy + (r.markupValue || 0);
    } else {
      totalSell = totalBuy * (1 + (r.markupValue || 0) / 100);
    }
    return {
      ...r,
      totalBuy: +totalBuy.toFixed(2),
      totalSell: +totalSell.toFixed(2),
      margin: +(totalSell - totalBuy).toFixed(2),
      marginPct: totalSell > 0 ? +(((totalSell - totalBuy) / totalSell) * 100).toFixed(2) : 0,
    };
  });

  enriched.sort((a, b) => {
    if (a.totalSell !== b.totalSell) return a.totalSell - b.totalSell;
    if ((a.transitTimeDays || 999) !== (b.transitTimeDays || 999))
      return (a.transitTimeDays || 999) - (b.transitTimeDays || 999);
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  return enriched;
};

module.exports = { searchRates };
