import { useState, useMemo } from 'react';

/* ── Static GL data (matching design handoff) ─────────────────── */
const GL_ACCOUNTS = [
  { code: '1000', name: 'Cash & Equivalents',   type: 'asset',     debit: 184200, credit: 0,      balance:  184200 },
  { code: '1100', name: 'Accounts Receivable',  type: 'asset',     debit: 164720, credit: 0,      balance:  164720 },
  { code: '1200', name: 'Inventory in Transit', type: 'asset',     debit:  82400, credit: 0,      balance:   82400 },
  { code: '2000', name: 'Accounts Payable',     type: 'liability', debit:      0, credit: 65560,  balance:  -65560 },
  { code: '2100', name: 'Accrued Freight',      type: 'liability', debit:      0, credit: 28200,  balance:  -28200 },
  { code: '4000', name: 'Freight Revenue',      type: 'revenue',   debit:      0, credit: 412800, balance: -412800 },
  { code: '4100', name: 'Handling Revenue',     type: 'revenue',   debit:      0, credit:  48200, balance:  -48200 },
  { code: '5000', name: 'Carrier Cost',         type: 'expense',   debit: 218400, credit: 0,      balance:  218400 },
  { code: '5100', name: 'Port & Customs',       type: 'expense',   debit:  42800, credit: 0,      balance:   42800 },
  { code: '6000', name: 'Operations Salaries',  type: 'expense',   debit:  64800, credit: 0,      balance:   64800 },
];

const MONTHS_12 = ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'];
const REV_SERIES = MONTHS_12.map((m, i) => {
  const base = 88 + Math.sin(i * 0.7) * 18 + (i / 12) * 30;
  return { month: m, revenue: Math.round(base * 1000), expense: Math.round(base * 760) };
});

const IS_ROWS = [
  { label: 'Freight Revenue',     val:  412800 },
  { label: 'Handling Revenue',    val:   48200 },
  { label: 'Total Revenue',       val:  461000, bold: true, border: true },
  { label: 'Carrier Cost',        val: -218400 },
  { label: 'Port & Customs',      val:  -42800 },
  { label: 'Operations Salaries', val:  -64800 },
  { label: 'Total Cost',          val: -326000, bold: true, border: true },
  { label: 'Gross Profit',        val:  135000, bold: true, green: true },
];

const TYPE_CFG = {
  asset:     { bg: '#dbeafe', color: '#1e40af', label: 'Asset' },
  liability: { bg: '#fee2e2', color: '#991b1b', label: 'Liability' },
  equity:    { bg: '#ede9fe', color: '#5b21b6', label: 'Equity' },
  revenue:   { bg: '#dcfce7', color: '#166534', label: 'Revenue' },
  expense:   { bg: '#fef9c3', color: '#854d0e', label: 'Expense' },
};

const fmtM = (v) => '$' + Math.round(Math.abs(v)).toLocaleString();
const fmtK = (v) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return '$' + (abs / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000)     return '$' + Math.round(abs / 1000) + 'k';
  return '$' + abs;
};

/* ── SVG LineChart ─────────────────────────────────────────────── */
const LC_PAD = { t: 12, r: 8, b: 4, l: 8 };
const LineChart = ({ series = [], height = 160 }) => {
  const n = series[0]?.data.length ?? 0;
  if (n < 2) return null;
  const allVals = series.flatMap((s) => s.data);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const range = maxV - minV || 1;
  const W = 500; const H = height;
  const cw = W - LC_PAD.l - LC_PAD.r;
  const ch = H - LC_PAD.t - LC_PAD.b;
  const xOf = (i) => LC_PAD.l + (i / (n - 1)) * cw;
  const yOf = (v) => LC_PAD.t + ch - ((v - minV) / range) * ch;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height }} aria-hidden>
      <defs>
        {series.map((s, si) => s.fill && (
          <linearGradient key={si} id={`gl-g${si}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
          </linearGradient>
        ))}
      </defs>
      {series.map((s, si) => {
        const pts = s.data.map((v, i) => [xOf(i), yOf(v)]);
        const linePath = pts.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ');
        const fillPath = s.fill
          ? `${linePath} L ${pts[pts.length - 1][0]} ${H - LC_PAD.b} L ${pts[0][0]} ${H - LC_PAD.b} Z`
          : null;
        return (
          <g key={si}>
            {fillPath && <path d={fillPath} fill={`url(#gl-g${si})`} />}
            <path d={linePath} fill="none" stroke={s.color} strokeWidth={s.fill ? 2 : 1.5} strokeLinejoin="round" strokeLinecap="round" />
          </g>
        );
      })}
    </svg>
  );
};

/* ── Voucher Modal ─────────────────────────────────────────────── */
const emptyVoucher = () => ({
  date: new Date().toISOString().slice(0, 10),
  voucherType: 'journal',
  narration: '',
  reference: '',
  lines: [
    { account: '', debit: '', credit: '', description: '' },
    { account: '', debit: '', credit: '', description: '' },
  ],
});

const VoucherModal = ({ onClose }) => {
  const [form, setForm] = useState(emptyVoucher());

  const addLine = () =>
    setForm((f) => ({ ...f, lines: [...f.lines, { account: '', debit: '', credit: '', description: '' }] }));

  const removeLine = (i) =>
    setForm((f) => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));

  const setLine = (i, updates) =>
    setForm((f) => ({ ...f, lines: f.lines.map((l, idx) => (idx === i ? { ...l, ...updates } : l)) }));

  const totalDebit  = form.lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const balanced    = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.001;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, boxShadow: '0 24px 80px rgba(0,0,0,0.22)', width: '100%', maxWidth: 740, display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--hairline)', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>New Journal Entry</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', borderRadius: 6, padding: 4 }}>
            <i className="bi bi-x"></i>
          </button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          <div className="gl-form-grid">
            <div>
              <div className="gl-field-label">Voucher Type</div>
              <select className="gl-select" value={form.voucherType} onChange={(e) => setForm({ ...form, voucherType: e.target.value })}>
                <option value="journal">Journal</option>
                <option value="receipt">Receipt</option>
                <option value="payment">Payment</option>
                <option value="contra">Contra</option>
              </select>
            </div>
            <div>
              <div className="gl-field-label">Date</div>
              <input className="gl-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <div className="gl-field-label">Reference</div>
              <input className="gl-input" placeholder="e.g. INV-2025-001" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </div>
            <div className="gl-form-full">
              <div className="gl-field-label">Narration</div>
              <input className="gl-input" placeholder="Description of this entry" value={form.narration} onChange={(e) => setForm({ ...form, narration: e.target.value })} />
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 8 }}>
            Journal Lines
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  {[['Account', null], ['Description', null], ['Debit', 'right'], ['Credit', 'right'], ['', null]].map(([h, align], i) => (
                    <th key={i} style={{ padding: '8px 10px', textAlign: align || 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', borderBottom: '1px solid var(--hairline)', width: i >= 2 && i <= 3 ? 110 : i === 4 ? 32 : undefined }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.lines.map((line, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--hairline)' }}>
                    <td style={{ padding: '6px 6px' }}>
                      <select className="gl-select" value={line.account} onChange={(e) => setLine(i, { account: e.target.value })}>
                        <option value="">— Account —</option>
                        {GL_ACCOUNTS.map((a) => (
                          <option key={a.code} value={a.code}>{a.code} · {a.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '6px 6px' }}>
                      <input className="gl-input" placeholder="Memo" value={line.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                    </td>
                    <td style={{ padding: '6px 6px' }}>
                      <input className="gl-input mono" type="number" step="0.01" min="0" value={line.debit}
                        onChange={(e) => setLine(i, { debit: e.target.value, credit: e.target.value ? '' : line.credit })} />
                    </td>
                    <td style={{ padding: '6px 6px' }}>
                      <input className="gl-input mono" type="number" step="0.01" min="0" value={line.credit}
                        onChange={(e) => setLine(i, { credit: e.target.value, debit: e.target.value ? '' : line.debit })} />
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <button type="button" onClick={() => removeLine(i)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13, padding: 2 }}>
                        <i className="bi bi-trash3"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--surface-2)', fontWeight: 700 }}>
                  <td colSpan={2} style={{ padding: '8px 10px', fontSize: 12 }}>
                    <button type="button" onClick={addLine} style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      <i className="bi bi-plus me-1"></i>Add Line
                    </button>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
                    {totalDebit ? '$' + totalDebit.toFixed(2) : ''}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
                    {totalCredit ? '$' + totalCredit.toFixed(2) : ''}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {totalDebit > 0 && (
            <div className={`gl-balance-alert ${balanced ? 'ok' : 'err'}`}>
              <i className={`bi ${balanced ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-1`}></i>
              {balanced
                ? 'Entry is balanced.'
                : `Difference: $${Math.abs(totalDebit - totalCredit).toFixed(2)} — Debit and Credit must balance.`}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button className="ss-action-btn" onClick={onClose}>Cancel</button>
          <button className="ss-action-btn ss-action-btn-primary" disabled={!balanced} onClick={onClose}>
            <i className="bi bi-check-lg me-1"></i>Post Voucher
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── GL Page ───────────────────────────────────────────────────── */
const GL = () => {
  const [period,      setPeriod]      = useState('May 2026');
  const [search,      setSearch]      = useState('');
  const [showVoucher, setShowVoucher] = useState(false);

  const totalAssets = GL_ACCOUNTS.filter((a) => a.type === 'asset').reduce((s, a) => s + a.balance, 0);
  const totalLiab   = GL_ACCOUNTS.filter((a) => a.type === 'liability').reduce((s, a) => s + Math.abs(a.balance), 0);
  const totalRev    = GL_ACCOUNTS.filter((a) => a.type === 'revenue').reduce((s, a) => s + Math.abs(a.balance), 0);
  const totalExp    = GL_ACCOUNTS.filter((a) => a.type === 'expense').reduce((s, a) => s + a.balance, 0);
  const netIncome   = totalRev - totalExp;

  const totalDebit  = GL_ACCOUNTS.reduce((s, a) => s + a.debit,  0);
  const totalCredit = GL_ACCOUNTS.reduce((s, a) => s + a.credit, 0);

  const filtered = useMemo(() => {
    if (!search.trim()) return GL_ACCOUNTS;
    const q = search.toLowerCase();
    return GL_ACCOUNTS.filter((a) => a.code.includes(q) || a.name.toLowerCase().includes(q));
  }, [search]);

  const handleExport = () => {
    const rows = [
      ['Code', 'Account', 'Type', 'Debit', 'Credit', 'Balance'],
      ...GL_ACCOUNTS.map((a) => [a.code, a.name, a.type, a.debit, a.credit, a.balance]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const el = document.createElement('a'); el.href = url; el.download = 'trial-balance.csv';
    document.body.appendChild(el); el.click(); el.remove(); URL.revokeObjectURL(url);
  };

  const KPIS = [
    { label: 'Total Assets',      value: fmtK(totalAssets), delta:  6, icon: 'bi-bank',      color: '#16a34a', bg: '#dcfce7' },
    { label: 'Total Liabilities', value: fmtK(totalLiab),   delta: -2, icon: 'bi-cash-stack', color: '#d97706', bg: '#fef9c3' },
    { label: 'Revenue MTD',       value: fmtK(totalRev),    delta: 12, icon: 'bi-graph-up',   color: '#FF7A45', bg: '#FFEFE8' },
    { label: 'Net Income',        value: fmtK(netIncome),   delta: 14, icon: 'bi-coin',       color: '#3b82f6', bg: '#dbeafe' },
  ];

  return (
    <div className="gl-shell">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="gl-header">
        <div>
          <h1 className="gl-title">General Ledger</h1>
          <div className="gl-subtitle">Trial balance · period to date</div>
        </div>
        <div className="gl-header-actions">
          <div className="gl-period-nav">
            {['May 2026', 'YTD', 'FY2026'].map((p) => (
              <button key={p} className={`gl-period-btn${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>
                {p}
              </button>
            ))}
          </div>
          <button className="ss-action-btn" onClick={handleExport}>
            <i className="bi bi-download me-1"></i>Export
          </button>
          <button className="ss-action-btn ss-action-btn-primary" onClick={() => setShowVoucher(true)}>
            <i className="bi bi-journal-plus me-1"></i>Journal Entry
          </button>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────── */}
      <div className="inv-kpi-row" style={{ marginBottom: 24 }}>
        {KPIS.map(({ label, value, delta, icon, color, bg }) => (
          <div key={label} className="inv-kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 16 }}>
                <i className={`bi ${icon}`}></i>
              </div>
              <span className={`inv-kpi-delta ${delta >= 0 ? 'up' : 'down'}`}>
                <i className={`bi bi-arrow-${delta >= 0 ? 'up' : 'down'}`}></i>
                {Math.abs(delta)}%
              </span>
            </div>
            <div className="inv-kpi-value">{value}</div>
            <div className="inv-kpi-label">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Two-column section ───────────────────────────────── */}
      <div className="gl-cards-row">
        {/* Income Statement */}
        <div className="ar-card">
          <div className="ar-card-header">
            <span className="ar-card-title">Income Statement</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>May 2026 · MTD</span>
          </div>
          <div style={{ padding: '4px 20px 20px' }}>
            {IS_ROWS.map((r, i) => (
              <div
                key={i}
                className="gl-is-row"
                style={{ borderTop: r.border ? '1px solid var(--hairline)' : undefined }}
              >
                <span className={`gl-is-label${r.bold ? ' bold' : ''}${r.green ? ' green' : ''}`}>
                  {r.label}
                </span>
                <span className={`gl-is-value${r.bold ? ' bold' : ''}${r.green ? ' green' : ''}`}>
                  {r.val < 0 ? '(' : ''}{fmtM(r.val)}{r.val < 0 ? ')' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue vs Expense Trend */}
        <div className="ar-card">
          <div className="ar-card-header">
            <span className="ar-card-title">Revenue vs Expense Trend</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>12 months</span>
          </div>
          <div style={{ padding: '16px 20px 8px' }}>
            <LineChart
              series={[
                { data: REV_SERIES.map((r) => r.revenue), color: '#FF7A45', fill: true },
                { data: REV_SERIES.map((r) => r.expense), color: 'var(--ink)', fill: false },
              ]}
              height={200}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', margin: '6px 0 0', padding: '0 4px' }}>
              {REV_SERIES.filter((_, i) => i % 2 === 0).map((r) => (
                <span key={r.month}>{r.month}</span>
              ))}
            </div>
            <div className="gl-chart-stats">
              <div>
                <div className="gl-chart-stat-label">YTD Revenue</div>
                <div className="gl-chart-stat-value">$1.24M</div>
              </div>
              <div>
                <div className="gl-chart-stat-label">YTD Expense</div>
                <div className="gl-chart-stat-value">$948k</div>
              </div>
              <div>
                <div className="gl-chart-stat-label">YTD Profit</div>
                <div className="gl-chart-stat-value green">$293k</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Trial Balance ─────────────────────────────────────── */}
      <div className="gl-tb-wrap">
        <div className="gl-tb-header">
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Trial Balance</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="gl-search-wrap">
              <i className="bi bi-search" style={{ fontSize: 12, color: 'var(--muted)' }}></i>
              <input
                placeholder="Account…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="ss-action-btn" style={{ padding: '7px 10px' }}>
              <i className="bi bi-funnel"></i>
            </button>
          </div>
        </div>
        <table className="gl-tb-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Account</th>
              <th>Type</th>
              <th className="ta-r">Debit</th>
              <th className="ta-r">Credit</th>
              <th className="ta-r">Balance</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const tc = TYPE_CFG[a.type] || {};
              return (
                <tr key={a.code}>
                  <td><span className="gl-code">{a.code}</span></td>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</td>
                  <td>
                    <span className="gl-type-chip" style={{ background: tc.bg, color: tc.color }}>
                      {tc.label || a.type}
                    </span>
                  </td>
                  <td className="gl-mono">{a.debit  > 0 ? fmtM(a.debit)  : '—'}</td>
                  <td className="gl-mono">{a.credit > 0 ? fmtM(a.credit) : '—'}</td>
                  <td className="gl-mono">
                    <span style={{ fontWeight: 700 }} className={a.balance < 0 ? 'gl-balance-neg' : ''}>
                      {a.balance < 0 ? '(' : ''}{fmtM(a.balance)}{a.balance < 0 ? ')' : ''}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td></td>
              <td>Totals</td>
              <td></td>
              <td className="ta-r" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{fmtM(totalDebit)}</td>
              <td className="ta-r" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{fmtM(totalCredit)}</td>
              <td className="ta-r" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#16a34a' }}>In balance</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {showVoucher && <VoucherModal onClose={() => setShowVoucher(false)} />}
    </div>
  );
};

export default GL;
