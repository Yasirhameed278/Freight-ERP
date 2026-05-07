const asyncHandler = require('../utils/asyncHandler');
const Shipment = require('../models/Shipment');
const Invoice = require('../models/Invoice');
const Deal = require('../models/Deal');

const startOfDayUTC = (d) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};

exports.overview = asyncHandler(async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 365);
  const since = startOfDayUTC(Date.now() - days * 24 * 60 * 60 * 1000);

  const [shipmentAgg, invoiceAgg, openAR, deliveryStats] = await Promise.all([
    Shipment.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: '$totalRevenue' },
          cost: { $sum: '$totalCost' },
          profit: { $sum: '$profit' },
        }
      },
    ]),
    Invoice.aggregate([
      { $match: { issueDate: { $gte: since }, type: 'ar' } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total' }, paid: { $sum: '$amountPaid' } } },
    ]),
    Invoice.aggregate([
      { $match: { type: 'ar', status: { $in: ['sent', 'partially_paid', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$amountDue' }, count: { $sum: 1 } } },
    ]),
    Shipment.aggregate([
      { $match: { status: { $in: ['delivered', 'completed'] }, eta: { $gte: since } } },
      { $project: { onTime: { $cond: [{ $lte: ['$ata', '$eta'] }, 1, 0] } } },
      { $group: { _id: null, total: { $sum: 1 }, onTime: { $sum: '$onTime' } } },
    ]),
  ]);

  const ship = shipmentAgg[0] || { count: 0, revenue: 0, cost: 0, profit: 0 };
  const inv = invoiceAgg[0] || { count: 0, total: 0, paid: 0 };
  const ar = openAR[0] || { total: 0, count: 0 };
  const deliveryRow = deliveryStats[0] || { total: 0, onTime: 0 };
  const onTimePct = deliveryRow.total > 0 ? +((deliveryRow.onTime / deliveryRow.total) * 100).toFixed(1) : null;

  res.json({
    success: true,
    period: { days, since },
    kpis: {
      shipments: ship.count,
      revenue: +ship.revenue.toFixed(2),
      cost: +ship.cost.toFixed(2),
      profit: +ship.profit.toFixed(2),
      profitMargin: ship.revenue > 0 ? +((ship.profit / ship.revenue) * 100).toFixed(1) : 0,
      invoicesIssued: inv.count,
      invoicedAmount: +inv.total.toFixed(2),
      collectedAmount: +inv.paid.toFixed(2),
      outstandingAR: +ar.total.toFixed(2),
      openInvoices: ar.count,
      onTimeDeliveryPct: onTimePct,
    },
  });
});

exports.revenueByMode = asyncHandler(async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 365);
  const since = startOfDayUTC(Date.now() - days * 24 * 60 * 60 * 1000);

  const data = await Shipment.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: {
        _id: '$mode',
        shipments: { $sum: 1 },
        revenue: { $sum: '$totalRevenue' },
        profit: { $sum: '$profit' },
      }
    },
    { $sort: { revenue: -1 } },
  ]);
  res.json({ success: true, data });
});

exports.shipmentsTrend = asyncHandler(async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 365);
  const since = startOfDayUTC(Date.now() - days * 24 * 60 * 60 * 1000);

  const data = await Shipment.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        revenue: { $sum: '$totalRevenue' },
      }
    },
    { $sort: { _id: 1 } },
  ]);
  res.json({ success: true, data });
});

exports.topCustomers = asyncHandler(async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 90, 365);
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const since = startOfDayUTC(Date.now() - days * 24 * 60 * 60 * 1000);

  const data = await Shipment.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: {
        _id: '$customer',
        shipments: { $sum: 1 },
        revenue: { $sum: '$totalRevenue' },
        profit: { $sum: '$profit' },
      }
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
    { $lookup: { from: 'clients', localField: '_id', foreignField: '_id', as: 'client' } },
    { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
    { $project: {
        clientId: '$_id',
        companyName: { $ifNull: ['$client.companyName', 'Unknown'] },
        clientCode: '$client.clientCode',
        shipments: 1, revenue: 1, profit: 1,
      }
    },
  ]);
  res.json({ success: true, data });
});

exports.pipeline = asyncHandler(async (req, res) => {
  const data = await Deal.aggregate([
    { $group: {
        _id: '$stage',
        count: { $sum: 1 },
        totalValue: { $sum: '$estimatedValue' },
        weightedValue: { $sum: '$weightedValue' },
      }
    },
  ]);
  res.json({ success: true, data });
});

exports.arAging = asyncHandler(async (req, res) => {
  const now = new Date();
  const data = await Invoice.aggregate([
    { $match: { type: 'ar', status: { $in: ['sent', 'partially_paid', 'overdue'] } } },
    { $project: {
        amountDue: 1,
        client: 1,
        daysPastDue: {
          $max: [0, { $floor: { $divide: [{ $subtract: [now, '$dueDate'] }, 1000 * 60 * 60 * 24] } }],
        },
      }
    },
    { $bucket: {
        groupBy: '$daysPastDue',
        boundaries: [0, 1, 31, 61, 91, 99999],
        default: 'unknown',
        output: { count: { $sum: 1 }, total: { $sum: '$amountDue' } },
      }
    },
  ]);
  const labels = ['Current', '1–30', '31–60', '61–90', '90+'];
  const formatted = data.map((b, i) => ({
    bucket: labels[i] || `bucket-${b._id}`,
    count: b.count,
    total: +b.total.toFixed(2),
  }));
  res.json({ success: true, data: formatted });
});

/* ── NEW: Operational KPIs (mode × direction job counts + financials) ── */
exports.operationalKPIs = asyncHandler(async (req, res) => {
  const [modeData, arSummary, apSummary, collectedSummary] = await Promise.all([
    Shipment.aggregate([
      { $match: { status: { $nin: ['cancelled'] } } },
      {
        $group: {
          _id: { mode: '$mode', direction: '$direction' },
          jobCount: { $sum: 1 },
          teuCount: { $sum: { $size: { $ifNull: ['$containers', []] } } },
          totalVolume: { $sum: { $ifNull: ['$totalVolume', 0] } },
          totalGrossWeight: { $sum: { $ifNull: ['$totalGrossWeight', 0] } },
        },
      },
      { $sort: { '_id.mode': 1, '_id.direction': 1 } },
    ]),

    Invoice.aggregate([
      { $match: { type: 'ar', status: { $in: ['sent', 'partially_paid', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$amountDue' } } },
    ]),

    Invoice.aggregate([
      { $match: { type: 'ap', status: { $in: ['sent', 'partially_paid', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$amountDue' } } },
    ]),

    Invoice.aggregate([
      { $match: { type: 'ar', status: { $in: ['paid', 'partially_paid'] } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } },
    ]),
  ]);

  res.json({
    success: true,
    byMode: modeData,
    financials: {
      outstandingAR: +(arSummary[0]?.total || 0).toFixed(2),
      outstandingAP: +(apSummary[0]?.total || 0).toFixed(2),
      totalCollected: +(collectedSummary[0]?.total || 0).toFixed(2),
    },
  });
});

/* ── NEW: Management Sales Summary (Today / MTD / QTD / YTD × mode) ── */
exports.salesSummary = asyncHandler(async (req, res) => {
  const now = new Date();

  const todayStart = startOfDayUTC(now);
  const mtdStart   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const quarter    = Math.floor(now.getUTCMonth() / 3);
  const qtdStart   = new Date(Date.UTC(now.getUTCFullYear(), quarter * 3, 1));
  const ytdStart   = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  const periods = [
    { key: 'today', start: todayStart },
    { key: 'mtd',   start: mtdStart },
    { key: 'qtd',   start: qtdStart },
    { key: 'ytd',   start: ytdStart },
  ];

  const modeDefs = [
    { key: 'sea_export', match: { mode: 'sea',  direction: 'export' } },
    { key: 'sea_import', match: { mode: 'sea',  direction: 'import' } },
    { key: 'air_export', match: { mode: 'air',  direction: 'export' } },
    { key: 'air_import', match: { mode: 'air',  direction: 'import' } },
    { key: 'logistics',  match: { mode: { $in: ['road', 'rail', 'multimodal', 'courier'] } } },
  ];

  const tasks = modeDefs.flatMap((md) =>
    periods.map((p) =>
      Shipment.aggregate([
        { $match: { ...md.match, status: { $nin: ['cancelled'] }, createdAt: { $gte: p.start } } },
        { $group: {
            _id: null,
            count:   { $sum: 1 },
            revenue: { $sum: { $ifNull: ['$totalRevenue', 0] } },
            cost:    { $sum: { $ifNull: ['$totalCost', 0] } },
            profit:  { $sum: { $ifNull: ['$profit', 0] } },
          },
        },
      ]).then((rows) => {
        const d = rows[0] || { count: 0, revenue: 0, cost: 0, profit: 0 };
        return {
          mode: md.key,
          period: p.key,
          count:   d.count,
          revenue: +d.revenue.toFixed(2),
          cost:    +d.cost.toFixed(2),
          profit:  +d.profit.toFixed(2),
          margin:  d.revenue > 0 ? +((d.profit / d.revenue) * 100).toFixed(1) : 0,
        };
      })
    )
  );

  const results = await Promise.all(tasks);

  // Roll up YTD totals across all modes for summary KPI cards
  const ytdRows = results.filter((r) => r.period === 'ytd');
  const totals  = ytdRows.reduce(
    (acc, r) => {
      acc.count   += r.count;
      acc.revenue += r.revenue;
      acc.cost    += r.cost;
      acc.profit  += r.profit;
      return acc;
    },
    { count: 0, revenue: 0, cost: 0, profit: 0 }
  );
  totals.margin = totals.revenue > 0 ? +((totals.profit / totals.revenue) * 100).toFixed(1) : 0;

  // Build summary[mode][period] = { count, revenue, cost, profit, margin }
  const summary = {};
  for (const r of results) {
    if (!summary[r.mode]) summary[r.mode] = {};
    summary[r.mode][r.period] = { count: r.count, revenue: r.revenue, cost: r.cost, profit: r.profit, margin: r.margin };
  }

  res.json({ success: true, summary, ytdTotals: totals });
});

/* ── NEW: AP breakdown by vendor for AP Portal ── */
exports.apByVendor = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  const data = await Invoice.aggregate([
    { $match: { type: 'ap', status: { $in: ['sent', 'partially_paid', 'overdue'] } } },
    {
      $group: {
        _id: '$client',
        outstanding: { $sum: '$amountDue' },
        invoiceCount: { $sum: 1 },
        oldestDue: { $min: '$dueDate' },
      },
    },
    { $sort: { outstanding: -1 } },
    { $limit: limit },
    { $lookup: { from: 'clients', localField: '_id', foreignField: '_id', as: 'vendor' } },
    { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        vendorId: '$_id',
        companyName: { $ifNull: ['$vendor.companyName', 'Unknown Vendor'] },
        outstanding: { $round: ['$outstanding', 2] },
        invoiceCount: 1,
        oldestDue: 1,
      },
    },
  ]);

  const total = data.reduce((s, r) => s + r.outstanding, 0);
  res.json({ success: true, data, total: +total.toFixed(2) });
});

/* ── NEW: AR breakdown by customer for AR Portal ── */
exports.arByCustomer = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  const data = await Invoice.aggregate([
    { $match: { type: 'ar', status: { $in: ['sent', 'partially_paid', 'overdue'] } } },
    {
      $group: {
        _id: '$client',
        outstanding: { $sum: '$amountDue' },
        invoiceCount: { $sum: 1 },
        oldestDue: { $min: '$dueDate' },
      },
    },
    { $sort: { outstanding: -1 } },
    { $limit: limit },
    { $lookup: { from: 'clients', localField: '_id', foreignField: '_id', as: 'client' } },
    { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        clientId: '$_id',
        companyName: { $ifNull: ['$client.companyName', 'Unknown'] },
        outstanding: { $round: ['$outstanding', 2] },
        invoiceCount: 1,
        oldestDue: 1,
      },
    },
  ]);

  const total = data.reduce((s, r) => s + r.outstanding, 0);

  res.json({ success: true, data, total: +total.toFixed(2) });
});

