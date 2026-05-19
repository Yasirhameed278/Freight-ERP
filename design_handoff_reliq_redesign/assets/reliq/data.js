/* Reliq mock data — mid-realistic freight ERP */

window.ReliqData = (() => {
  const MODES = {
    sea:  { icon: 'bi-water',       color: 'var(--m-sea)',  label: 'Sea',  klass: 'tag-mode-sea' },
    air:  { icon: 'bi-airplane',    color: 'var(--m-air)',  label: 'Air',  klass: 'tag-mode-air' },
    road: { icon: 'bi-truck',       color: 'var(--m-road)', label: 'Road', klass: 'tag-mode-road' },
    rail: { icon: 'bi-train-front', color: 'var(--m-rail)', label: 'Rail', klass: 'tag-mode-rail' },
    courier: { icon: 'bi-box-seam', color: 'var(--m-courier)', label: 'Courier', klass: 'tag-mode-courier' },
  };

  const STATUS = {
    quote:            { label: 'Quote',           color: 'var(--muted)',  step: 0 },
    booked:           { label: 'Booked',          color: 'var(--info)',   step: 1 },
    cargo_received:   { label: 'Cargo Received',  color: 'var(--info)',   step: 2 },
    customs_export:   { label: 'Customs Export',  color: 'var(--warning)',step: 3 },
    in_transit:       { label: 'In Transit',      color: 'var(--m-sea)',  step: 4 },
    arrived:          { label: 'Arrived',         color: 'var(--success)',step: 5 },
    customs_import:   { label: 'Customs Import',  color: 'var(--warning)',step: 6 },
    cleared:          { label: 'Cleared',         color: 'var(--success)',step: 7 },
    delivered:        { label: 'Delivered',       color: 'var(--success)',step: 8 },
    on_hold:          { label: 'On Hold',         color: 'var(--warning)',step: -1 },
    cancelled:        { label: 'Cancelled',       color: 'var(--danger)', step: -1 },
  };

  const PIPELINE_STEPS = [
    { key: 'quote',          label: 'Quote',    icon: 'bi-file-text' },
    { key: 'booked',         label: 'Booked',   icon: 'bi-bookmark-check' },
    { key: 'cargo_received', label: 'Received', icon: 'bi-box-seam' },
    { key: 'customs_export', label: 'Export',   icon: 'bi-shield-check' },
    { key: 'in_transit',     label: 'Transit',  icon: 'bi-truck' },
    { key: 'arrived',        label: 'Arrived',  icon: 'bi-geo-alt' },
    { key: 'customs_import', label: 'Import',   icon: 'bi-shield-check' },
    { key: 'cleared',        label: 'Cleared',  icon: 'bi-check-circle' },
    { key: 'delivered',      label: 'Delivered',icon: 'bi-patch-check' },
  ];

  const CLIENTS = [
    { id: 'C-1042', name: 'Aurora Trade Holdings', code: 'AURTRD',  industry: 'Electronics',   country: 'US', revenue: 142800, profit: 38400, shipments: 41, status: 'active', credit: 250000, used: 162400 },
    { id: 'C-1118', name: 'Meridian Foods Co.',     code: 'MERFOO', industry: 'Food & Bev',    country: 'NL', revenue:  98450, profit: 24100, shipments: 32, status: 'active', credit: 150000, used:  82300 },
    { id: 'C-1226', name: 'Pacific Steel Works',    code: 'PACSTL', industry: 'Industrial',    country: 'JP', revenue:  86700, profit: 19200, shipments: 28, status: 'active', credit: 200000, used: 145900 },
    { id: 'C-1305', name: 'Nordic Textiles AB',     code: 'NRDTXT', industry: 'Apparel',       country: 'SE', revenue:  74200, profit: 18900, shipments: 24, status: 'active', credit: 100000, used:  46700 },
    { id: 'C-1399', name: 'Bluepeak Pharma Ltd',    code: 'BLPHRM', industry: 'Pharma',        country: 'CH', revenue:  68100, profit: 22300, shipments: 18, status: 'priority', credit: 300000, used: 198400 },
    { id: 'C-1412', name: 'Saffron Agro Exports',   code: 'SAFAGR', industry: 'Agriculture',   country: 'IN', revenue:  61300, profit: 12700, shipments: 36, status: 'active', credit:  80000, used:  72100 },
    { id: 'C-1488', name: 'Kestrel Automotive',     code: 'KSTRAU', industry: 'Automotive',    country: 'DE', revenue:  55400, profit: 14200, shipments: 19, status: 'active', credit: 120000, used:  41200 },
    { id: 'C-1502', name: 'Driftwood Furniture',    code: 'DRFTFN', industry: 'Consumer',      country: 'VN', revenue:  48800, profit: 10900, shipments: 22, status: 'review',  credit:  60000, used:  58400 },
    { id: 'C-1576', name: 'Helios Solar Systems',   code: 'HLSSOL', industry: 'Energy',        country: 'CN', revenue:  44100, profit:  9700, shipments: 16, status: 'active', credit: 100000, used:  32200 },
    { id: 'C-1604', name: 'Cobalt Electronics',     code: 'CBLELC', industry: 'Electronics',   country: 'KR', revenue:  39600, profit:  8400, shipments: 14, status: 'active', credit:  90000, used:  21500 },
  ];

  const PORTS = {
    USNYC: { code: 'USNYC', name: 'New York',      country: 'US', lat: 40.7,  lng: -74.0 },
    USLAX: { code: 'USLAX', name: 'Los Angeles',   country: 'US', lat: 33.7,  lng: -118.3 },
    DEHAM: { code: 'DEHAM', name: 'Hamburg',       country: 'DE', lat: 53.5,  lng: 10.0 },
    NLRTM: { code: 'NLRTM', name: 'Rotterdam',     country: 'NL', lat: 51.9,  lng: 4.5 },
    SGSIN: { code: 'SGSIN', name: 'Singapore',     country: 'SG', lat: 1.3,   lng: 103.8 },
    CNSHA: { code: 'CNSHA', name: 'Shanghai',      country: 'CN', lat: 31.2,  lng: 121.5 },
    AEDXB: { code: 'AEDXB', name: 'Dubai',         country: 'AE', lat: 25.3,  lng: 55.4 },
    JPYOK: { code: 'JPYOK', name: 'Yokohama',      country: 'JP', lat: 35.4,  lng: 139.6 },
    INMUN: { code: 'INMUN', name: 'Mundra',        country: 'IN', lat: 22.7,  lng: 69.7 },
    GBFXT: { code: 'GBFXT', name: 'Felixstowe',    country: 'GB', lat: 51.9,  lng: 1.3 },
    HKHKG: { code: 'HKHKG', name: 'Hong Kong',     country: 'HK', lat: 22.3,  lng: 114.2 },
    KRPUS: { code: 'KRPUS', name: 'Busan',         country: 'KR', lat: 35.1,  lng: 129.0 },
  };

  const VESSELS = [
    'MV NORDIC SPIRIT', 'CMA CGM AQUILA', 'MAERSK ESSEN', 'EVER GIVEN', 'COSCO HARMONY',
    'OOCL BREMEN', 'HAPAG ATLANTIC', 'MSC GIORGIA', 'ZIM SHANGHAI', 'YM UNANIMITY',
  ];
  const FLIGHTS = ['EK 9831', 'LH 8492', 'CX 0046', 'TK 6403', 'QR 8722', 'CA 1024'];

  // Build 28 shipments
  const today = new Date(2026, 4, 18); // May 18 2026 per system date
  const d = (offset) => {
    const x = new Date(today);
    x.setDate(x.getDate() + offset);
    return x;
  };

  const SHIPMENTS = [
    // active sea
    { id: 'SEA-2026-0142', mode: 'sea',  direction: 'export', client: 'Aurora Trade Holdings', clientCode: 'AURTRD', pol: 'USNYC', pod: 'DEHAM', etd: d(-6),  eta: d(8),  status: 'in_transit',     vessel: 'CMA CGM AQUILA',  containers: 4, weight: 18200, value: 142800, late: false },
    { id: 'SEA-2026-0141', mode: 'sea',  direction: 'import', client: 'Meridian Foods Co.',    clientCode: 'MERFOO', pol: 'CNSHA', pod: 'NLRTM', etd: d(-12), eta: d(2),  status: 'in_transit',     vessel: 'MAERSK ESSEN',    containers: 6, weight: 28400, value:  98450, late: false },
    { id: 'SEA-2026-0140', mode: 'sea',  direction: 'export', client: 'Pacific Steel Works',   clientCode: 'PACSTL', pol: 'JPYOK', pod: 'USLAX', etd: d(-3),  eta: d(14), status: 'cargo_received', vessel: 'MSC GIORGIA',     containers: 8, weight: 45200, value:  86700, late: false },
    { id: 'SEA-2026-0139', mode: 'sea',  direction: 'import', client: 'Driftwood Furniture',   clientCode: 'DRFTFN', pol: 'CNSHA', pod: 'USNYC', etd: d(-18), eta: d(-2), status: 'customs_import', vessel: 'COSCO HARMONY',   containers: 3, weight: 14100, value:  48800, late: true  },
    { id: 'SEA-2026-0138', mode: 'sea',  direction: 'export', client: 'Nordic Textiles AB',    clientCode: 'NRDTXT', pol: 'NLRTM', pod: 'KRPUS', etd: d(-20), eta: d(-5), status: 'cleared',        vessel: 'EVER GIVEN',      containers: 2, weight:  9800, value:  74200, late: false },
    { id: 'SEA-2026-0137', mode: 'sea',  direction: 'export', client: 'Saffron Agro Exports',  clientCode: 'SAFAGR', pol: 'INMUN', pod: 'AEDXB', etd: d(2),   eta: d(9),  status: 'booked',         vessel: 'ZIM SHANGHAI',    containers: 5, weight: 22300, value:  61300, late: false },
    // air
    { id: 'AIR-2026-0084', mode: 'air',  direction: 'export', client: 'Bluepeak Pharma Ltd',   clientCode: 'BLPHRM', pol: 'CHGVA', pod: 'USNYC', etd: d(-1),  eta: d(0),  status: 'in_transit',     vessel: 'LH 8492',         containers: 0, weight:   1200, value:  68100, late: false, awb: '020-4882-1934' },
    { id: 'AIR-2026-0083', mode: 'air',  direction: 'import', client: 'Cobalt Electronics',    clientCode: 'CBLELC', pol: 'HKHKG', pod: 'USLAX', etd: d(-2),  eta: d(-1), status: 'cleared',        vessel: 'CX 0046',         containers: 0, weight:    840, value:  39600, late: false, awb: '160-2104-4561' },
    { id: 'AIR-2026-0082', mode: 'air',  direction: 'export', client: 'Helios Solar Systems',  clientCode: 'HLSSOL', pol: 'CNSHA', pod: 'DEHAM', etd: d(1),   eta: d(2),  status: 'cargo_received', vessel: 'EK 9831',         containers: 0, weight:   2100, value:  44100, late: false, awb: '176-9821-0042' },
    { id: 'AIR-2026-0081', mode: 'air',  direction: 'export', client: 'Kestrel Automotive',    clientCode: 'KSTRAU', pol: 'DEHAM', pod: 'AEDXB', etd: d(-4),  eta: d(-3), status: 'delivered',      vessel: 'TK 6403',         containers: 0, weight:    980, value:  55400, late: false, awb: '235-8843-7720' },
    // road
    { id: 'ROAD-2026-0211', mode: 'road', direction: null,    client: 'Meridian Foods Co.',    clientCode: 'MERFOO', pol: 'NLRTM', pod: 'DEHAM', etd: d(0),   eta: d(1),  status: 'in_transit',     vessel: 'TRK-NL-9821',     containers: 1, weight:  3400, value:  12400, late: false },
    { id: 'ROAD-2026-0210', mode: 'road', direction: null,    client: 'Kestrel Automotive',    clientCode: 'KSTRAU', pol: 'DEHAM', pod: 'NLRTM', etd: d(-1),  eta: d(-1), status: 'delivered',      vessel: 'TRK-DE-2204',     containers: 1, weight:  2800, value:   8200, late: false },
    // rail
    { id: 'RAIL-2026-0044', mode: 'rail', direction: 'import',client: 'Helios Solar Systems',  clientCode: 'HLSSOL', pol: 'CNSHA', pod: 'DEHAM', etd: d(-9),  eta: d(8),  status: 'in_transit',     vessel: 'RAIL-CN-DE 7',    containers: 12, weight: 56000, value: 88200, late: false },
    // recent
    { id: 'SEA-2026-0136', mode: 'sea',  direction: 'export', client: 'Aurora Trade Holdings', clientCode: 'AURTRD', pol: 'USNYC', pod: 'GBFXT', etd: d(-32), eta: d(-18), status: 'delivered',     vessel: 'HAPAG ATLANTIC',  containers: 3, weight: 12400, value: 64800, late: false },
    { id: 'AIR-2026-0080', mode: 'air',  direction: 'import', client: 'Bluepeak Pharma Ltd',   clientCode: 'BLPHRM', pol: 'USNYC', pod: 'JPYOK', etd: d(-10), eta: d(-8), status: 'delivered',     vessel: 'QR 8722',         containers: 0, weight:    640, value: 42100, late: false, awb: '157-3320-9914' },
    // on hold
    { id: 'SEA-2026-0135', mode: 'sea',  direction: 'import', client: 'Driftwood Furniture',   clientCode: 'DRFTFN', pol: 'CNSHA', pod: 'USNYC', etd: d(-25), eta: d(-12), status: 'on_hold',       vessel: 'OOCL BREMEN',     containers: 2, weight:  8400, value: 28900, late: true },
  ];

  const INVOICES = [
    { num: 'INV-2026-0421', client: 'Aurora Trade Holdings', shipment: 'SEA-2026-0142', amount: 14280, balance: 14280, issued: d(-2),  due: d(28),  status: 'sent' },
    { num: 'INV-2026-0420', client: 'Bluepeak Pharma Ltd',   shipment: 'AIR-2026-0084', amount:  8420, balance:  8420, issued: d(-1),  due: d(29),  status: 'sent' },
    { num: 'INV-2026-0419', client: 'Meridian Foods Co.',    shipment: 'SEA-2026-0141', amount:  9845, balance:  4900, issued: d(-8),  due: d(22),  status: 'partial' },
    { num: 'INV-2026-0418', client: 'Pacific Steel Works',   shipment: 'SEA-2026-0140', amount: 12100, balance:     0, issued: d(-12), due: d(18),  status: 'paid' },
    { num: 'INV-2026-0417', client: 'Driftwood Furniture',   shipment: 'SEA-2026-0139', amount:  7240, balance:  7240, issued: d(-35), due: d(-5),  status: 'overdue' },
    { num: 'INV-2026-0416', client: 'Nordic Textiles AB',    shipment: 'SEA-2026-0138', amount:  6820, balance:     0, issued: d(-18), due: d(12),  status: 'paid' },
    { num: 'INV-2026-0415', client: 'Saffron Agro Exports',  shipment: 'SEA-2026-0137', amount:  5440, balance:  5440, issued: d(-3),  due: d(27),  status: 'sent' },
    { num: 'INV-2026-0414', client: 'Helios Solar Systems',  shipment: 'RAIL-2026-0044',amount:  8820, balance:  8820, issued: d(-5),  due: d(25),  status: 'sent' },
    { num: 'INV-2026-0413', client: 'Cobalt Electronics',    shipment: 'AIR-2026-0083', amount:  3960, balance:     0, issued: d(-9),  due: d(21),  status: 'paid' },
    { num: 'INV-2026-0412', client: 'Kestrel Automotive',    shipment: 'AIR-2026-0081', amount:  5540, balance:  5540, issued: d(-42), due: d(-12), status: 'overdue' },
    { num: 'INV-2026-0411', client: 'Aurora Trade Holdings', shipment: 'SEA-2026-0136', amount:  6480, balance:     0, issued: d(-30), due: d(0),   status: 'paid' },
  ];

  const BILLS = [
    { num: 'BILL-V-2841', vendor: 'CMA CGM Lines',        category: 'Ocean Freight',  amount: 14820, balance: 14820, due: d(12),  status: 'open' },
    { num: 'BILL-V-2840', vendor: 'Lufthansa Cargo',      category: 'Air Freight',    amount:  9420, balance:  4710, due: d(-2),  status: 'partial' },
    { num: 'BILL-V-2839', vendor: 'Hamburg Port Auth.',   category: 'Port Charges',   amount:  3280, balance:  3280, due: d(8),   status: 'open' },
    { num: 'BILL-V-2838', vendor: 'Rotterdam Trucking',   category: 'Drayage',        amount:  2140, balance:     0, due: d(-4),  status: 'paid' },
    { num: 'BILL-V-2837', vendor: 'Maersk',               category: 'Ocean Freight',  amount: 18900, balance: 18900, due: d(-8),  status: 'overdue' },
    { num: 'BILL-V-2836', vendor: 'DB Schenker',          category: 'Customs',        amount:  1280, balance:     0, due: d(-12), status: 'paid' },
    { num: 'BILL-V-2835', vendor: 'Dubai Port World',     category: 'Port Charges',   amount:  4400, balance:  4400, due: d(15),  status: 'open' },
    { num: 'BILL-V-2834', vendor: 'Cathay Pacific Cargo', category: 'Air Freight',    amount:  6740, balance:  6740, due: d(-1),  status: 'overdue' },
  ];

  const TASKS = [
    { id: 1, title: 'Send updated rate sheet to Aurora Trade',     priority: 'high', assignee: 'You',           due: d(0),   status: 'todo',     shipment: 'SEA-2026-0142', tag: 'sales' },
    { id: 2, title: 'Approve customs docs for SEA-2026-0140',      priority: 'high', assignee: 'M. Hassan',     due: d(0),   status: 'review',   shipment: 'SEA-2026-0140', tag: 'ops' },
    { id: 3, title: 'Follow up on overdue INV-2026-0417',          priority: 'high', assignee: 'You',           due: d(1),   status: 'todo',     shipment: null,            tag: 'finance' },
    { id: 4, title: 'Confirm vessel ETA — Maersk Essen',           priority: 'med',  assignee: 'L. Park',       due: d(1),   status: 'progress', shipment: 'SEA-2026-0141', tag: 'ops' },
    { id: 5, title: 'Book trucker for Hamburg delivery',           priority: 'med',  assignee: 'You',           due: d(2),   status: 'todo',     shipment: 'SEA-2026-0142', tag: 'ops' },
    { id: 6, title: 'Quarterly review w/ Bluepeak Pharma',         priority: 'med',  assignee: 'A. Reyes',      due: d(3),   status: 'todo',     shipment: null,            tag: 'sales' },
    { id: 7, title: 'Reconcile petty cash — April',                priority: 'low',  assignee: 'D. Chen',       due: d(4),   status: 'progress', shipment: null,            tag: 'finance' },
    { id: 8, title: 'Train new dispatcher on workflow rules',      priority: 'low',  assignee: 'You',           due: d(7),   status: 'todo',     shipment: null,            tag: 'admin' },
  ];

  const ACTIVITY = [
    { icon: 'bi-boxes',           color: 'var(--m-sea)',   title: 'SEA-2026-0142 created',           sub: 'Sea Export · USNYC → DEHAM',          time: '8m ago' },
    { icon: 'bi-receipt',         color: 'var(--violet)',  title: 'INV-2026-0421 sent to Aurora',     sub: 'USD 14,280 · Due in 30 days',         time: '22m ago' },
    { icon: 'bi-geo-alt-fill',    color: 'var(--success)', title: 'AIR-2026-0084 cleared customs',   sub: 'Customs Export · DEHAM',              time: '54m ago' },
    { icon: 'bi-check-circle-fill', color: 'var(--success)', title: 'SEA-2026-0140 approved by Manager', sub: 'Approval workflow — step 2/2',     time: '1h 12m ago' },
    { icon: 'bi-building-add',    color: 'var(--info)',    title: 'New client: Cobalt Electronics',   sub: 'Added by sales — KR',                 time: '2h ago' },
    { icon: 'bi-wallet2',         color: 'var(--warning)', title: 'Payment received — USD 4,945',     sub: 'INV-2026-0419 · Meridian Foods',       time: '3h ago' },
    { icon: 'bi-truck',           color: 'var(--m-road)',  title: 'ROAD-2026-0210 delivered',         sub: 'Trucker confirmation received',         time: '4h ago' },
    { icon: 'bi-exclamation-triangle-fill', color: 'var(--danger)', title: 'SEA-2026-0139 ETA slipped', sub: 'Customs hold — 2 days',                time: '5h ago' },
  ];

  const AR_AGING = [
    { bucket: 'Current',    count: 14, total:  82400 },
    { bucket: '1-30 days',  count:  8, total:  41200 },
    { bucket: '31-60 days', count:  4, total:  22800 },
    { bucket: '61-90 days', count:  2, total:  12780 },
    { bucket: '90+ days',   count:  1, total:   5540 },
  ];

  const AP_AGING = [
    { bucket: 'Current',    count: 9, total:  26100 },
    { bucket: '1-30 days',  count: 6, total:  18420 },
    { bucket: '31-60 days', count: 3, total:  12400 },
    { bucket: '61-90 days', count: 2, total:   8640 },
    { bucket: '90+ days',   count: 0, total:      0 },
  ];

  // 12-month revenue/profit
  const MONTHS = ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'];
  const REV_SERIES = MONTHS.map((m, i) => {
    const base = 88 + Math.sin(i * 0.7) * 18 + (i / 12) * 30;
    return {
      month: m,
      revenue: Math.round(base * 1000),
      profit:  Math.round(base * 240),
      jobs:    Math.round(28 + Math.sin(i * 0.6) * 7 + (i / 12) * 12),
    };
  });

  // mode share data
  const MODE_SHARE = [
    { mode: 'Sea Export',  value: 38, color: 'var(--m-sea)' },
    { mode: 'Sea Import',  value: 22, color: 'oklch(60% 0.16 250)' },
    { mode: 'Air Export',  value: 15, color: 'var(--m-air)' },
    { mode: 'Air Import',  value: 10, color: 'oklch(65% 0.18 30)' },
    { mode: 'Road',        value:  9, color: 'var(--m-road)' },
    { mode: 'Rail',        value:  6, color: 'var(--m-rail)' },
  ];

  // GL summary
  const GL_ACCOUNTS = [
    { code: '1000', name: 'Cash & Equivalents',     type: 'asset',     debit: 184200, credit: 0,      balance:  184200 },
    { code: '1100', name: 'Accounts Receivable',    type: 'asset',     debit: 164720, credit: 0,      balance:  164720 },
    { code: '1200', name: 'Inventory in Transit',   type: 'asset',     debit:  82400, credit: 0,      balance:   82400 },
    { code: '2000', name: 'Accounts Payable',       type: 'liability', debit:      0, credit: 65560,  balance:  -65560 },
    { code: '2100', name: 'Accrued Freight',        type: 'liability', debit:      0, credit: 28200,  balance:  -28200 },
    { code: '4000', name: 'Freight Revenue',        type: 'revenue',   debit:      0, credit: 412800, balance: -412800 },
    { code: '4100', name: 'Handling Revenue',       type: 'revenue',   debit:      0, credit:  48200, balance:  -48200 },
    { code: '5000', name: 'Carrier Cost',           type: 'expense',   debit: 218400, credit: 0,      balance:  218400 },
    { code: '5100', name: 'Port & Customs',         type: 'expense',   debit:  42800, credit: 0,      balance:   42800 },
    { code: '6000', name: 'Operations Salaries',    type: 'expense',   debit:  64800, credit: 0,      balance:   64800 },
  ];

  const RATES = [
    { lane: 'USNYC → DEHAM', carrier: 'Maersk',     mode: 'sea',  type: '20\' GP', rate: 1840, transit: '14d', validity: 'Jun 30',  status: 'best' },
    { lane: 'USNYC → DEHAM', carrier: 'CMA CGM',    mode: 'sea',  type: '20\' GP', rate: 1920, transit: '13d', validity: 'Jun 30',  status: '' },
    { lane: 'USNYC → DEHAM', carrier: 'Hapag',      mode: 'sea',  type: '20\' GP', rate: 1980, transit: '15d', validity: 'Jul 15',  status: '' },
    { lane: 'USNYC → DEHAM', carrier: 'MSC',        mode: 'sea',  type: '40\' HC', rate: 2940, transit: '14d', validity: 'Jun 30',  status: 'best' },
    { lane: 'USNYC → DEHAM', carrier: 'Lufthansa',  mode: 'air',  type: 'Express', rate: 5.20, transit: '2d',  validity: 'Jun 24',  status: '', unit: '/kg' },
    { lane: 'USNYC → DEHAM', carrier: 'Cathay',     mode: 'air',  type: 'Standard',rate: 4.80, transit: '3d',  validity: 'Jun 24',  status: 'best', unit: '/kg' },
    { lane: 'USNYC → DEHAM', carrier: 'Emirates',   mode: 'air',  type: 'Express', rate: 5.40, transit: '2d',  validity: 'Jul 01',  status: '', unit: '/kg' },
  ];

  const TOP_CUSTOMERS = CLIENTS.slice(0, 6).map((c, i) => ({
    name: c.name, code: c.code, revenue: c.revenue, profit: c.profit, shipments: c.shipments, rank: i + 1,
  }));

  const NAV = [
    { key: 'dashboard',  label: 'Overview',  icon: 'bi-grid-1x2',          group: 'main' },
    { key: 'shipments',  label: 'Shipments', icon: 'bi-boxes',             group: 'ops' },
    { key: 'pipeline',   label: 'Pipeline',  icon: 'bi-kanban',            group: 'ops' },
    { key: 'tasks',      label: 'Tasks',     icon: 'bi-check2-square',     group: 'ops' },
    { key: 'invoices',   label: 'Invoices',  icon: 'bi-receipt',           group: 'fin' },
    { key: 'ar',         label: 'AR Portal', icon: 'bi-wallet2',           group: 'fin' },
    { key: 'ap',         label: 'AP Portal', icon: 'bi-credit-card',       group: 'fin' },
    { key: 'collections',label: 'Collect',   icon: 'bi-alarm',             group: 'fin' },
    { key: 'gl',         label: 'Ledger',    icon: 'bi-journal-text',      group: 'fin' },
    { key: 'clients',    label: 'Clients',   icon: 'bi-building',          group: 'crm' },
    { key: 'rates',      label: 'Rates',     icon: 'bi-tags',              group: 'tools' },
    { key: 'analytics',  label: 'Analytics', icon: 'bi-graph-up-arrow',    group: 'tools' },
  ];

  const TOP_NAV = [
    { key: 'overview',    label: 'Overview',  pages: ['dashboard'] },
    { key: 'operations',  label: 'Operations',pages: ['shipments', 'pipeline', 'tasks', 'shipment'] },
    { key: 'finance',     label: 'Finance',   pages: ['invoices', 'ar', 'ap', 'collections', 'gl'] },
    { key: 'crm',         label: 'Clients',   pages: ['clients', 'client'] },
    { key: 'reports',     label: 'Reports',   pages: ['analytics', 'rates'] },
  ];

  // helpers
  const fmtMoney = (v, compact = false) => {
    if (compact && Math.abs(v) >= 1000) {
      return '$' + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k';
    }
    return '$' + Math.round(v).toLocaleString();
  };
  const fmtNum = (v) => Math.round(v || 0).toLocaleString();
  const fmtDate = (date, opt = { month: 'short', day: 'numeric' }) =>
    date ? new Date(date).toLocaleDateString('en-US', opt) : '—';
  const fmtDateLong = (date) =>
    date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const daysFromNow = (date) => {
    const diff = (new Date(date) - today) / 86400000;
    return Math.round(diff);
  };

  return {
    MODES, STATUS, PIPELINE_STEPS, NAV, TOP_NAV,
    CLIENTS, PORTS, SHIPMENTS, INVOICES, BILLS, TASKS, ACTIVITY,
    AR_AGING, AP_AGING, REV_SERIES, MODE_SHARE, GL_ACCOUNTS, RATES, TOP_CUSTOMERS,
    fmtMoney, fmtNum, fmtDate, fmtDateLong, daysFromNow,
    today,
  };
})();
