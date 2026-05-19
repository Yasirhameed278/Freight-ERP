import { useEffect, useState, useMemo, useCallback } from 'react';
import { analyticsApi, invoicesApi } from '../api';

/* ── Formatters ─────────────────────────────────────────────── */
const fmtMoney = (v, compact = false) => {
  if (compact)
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

const daysPastDue = (dueDate) =>
  dueDate ? Math.max(0, Math.floor((Date.now() - new Date(dueDate)) / 86400000)) : 0;

/* ── Status config ───────────────────────────────────────────── */
const STATUS_CFG = {
  draft:          { label: 'Draft',    dot: '#94a3b8', bg: '#f1f5f9', color: '#475569' },
  sent:           { label: 'Open',     dot: '#3b82f6', bg: '#eff6ff', color: '#1d4ed8' },
  partially_paid: { label: 'Partial',  dot: '#f59e0b', bg: '#fffbeb', color: '#92400e' },
  paid:           { label: 'Paid',     dot: '#10b981', bg: '#f0fdf4', color: '#065f46' },
  overdue:        { label: 'Overdue',  dot: '#ef4444', bg: '#fef2f2', color: '#991b1b' },
  cancelled:      { label: 'Cancelled',dot: '#94a3b8', bg: '#f1f5f9', color: '#475569' },
};
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  return (
    <span className="inv-status-badge" style={{ background: cfg.bg, color: cfg.color }}>
      <span className="inv-status-dot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
};

/* ── Category heuristic ──────────────────────────────────────── */
const CATS = [
  { keys: ['ocean','sea','fcl','lcl','container','cma','maersk','msc','oocl','cosco','hapag'], label: 'Ocean Freight', color: '#3b82f6' },
  { keys: ['air','awb','cargo','lufthansa','cathay','emirates','fly','flight'],                 label: 'Air Freight',   color: '#ef4444' },
  { keys: ['port','terminal','demurrage','detention','dpt','hamburg','rotterdam','dubai'],       label: 'Port Charges',  color: '#f97316' },
  { keys: ['truck','drayage','road','delivery','haulage','inland'],                              label: 'Drayage',       color: '#16a34a' },
  { keys: ['custom','duty','clearance','tariff','schenker','brokerage','border'],                label: 'Customs',       color: '#eab308' },
];

const getCategory = (inv) => {
  const text = [
    inv.client?.companyName || '',
    ...(inv.lines || []).map((l) => l.description || ''),
    inv.notes || '',
  ].join(' ').toLowerCase();
  for (const c of CATS) {
    if (c.keys.some((k) => text.includes(k))) return c;
  }
  return { label: 'Other', color: '#94a3b8' };
};

/* ── Bucket colors ───────────────────────────────────────────── */
const BUCKET_COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#d97706', '#ef4444'];

/* ── SVG Donut chart ─────────────────────────────────────────── */
const DonutChart = ({ data, size = 180, thickness = 26, totalLabel, totalSub }) => {
  const total  = data.reduce((s, d) => s + d.value, 0);
  const outerR = size / 2 - 6;
  const innerR = outerR - thickness;
  const cx = size / 2;
  const cy = size / 2;

  const toXY = (angle, r) => ({
    x: cx + r * Math.cos(((angle - 90) * Math.PI) / 180),
    y: cy + r * Math.sin(((angle - 90) * Math.PI) / 180),
  });

  const arcPath = (start, sweep) => {
    if (sweep >= 359.9) {
      const s = toXY(0, outerR);
      const e = toXY(180, outerR);
      const si = toXY(0, innerR);
      const ei = toXY(180, innerR);
      return [
        `M ${s.x} ${s.y} A ${outerR} ${outerR} 0 1 1 ${e.x} ${e.y} A ${outerR} ${outerR} 0 1 1 ${s.x} ${s.y}`,
        `M ${si.x} ${si.y} A ${innerR} ${innerR} 0 1 0 ${ei.x} ${ei.y} A ${innerR} ${innerR} 0 1 0 ${si.x} ${si.y}`,
      ].join(' ');
    }
    const lg = sweep > 180 ? 1 : 0;
    const p1 = toXY(start, outerR);
    const p2 = toXY(start + sweep, outerR);
    const p3 = toXY(start + sweep, innerR);
    const p4 = toXY(start, innerR);
    return `M ${p1.x} ${p1.y} A ${outerR} ${outerR} 0 ${lg} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerR} ${innerR} 0 ${lg} 0 ${p4.x} ${p4.y} Z`;
  };

  let angle = 0;
  const slices = data.map((d) => {
    const sweep = total > 0 ? (d.value / total) * 360 : 0;
    const s = { ...d, start: angle, sweep };
    angle += sweep;
    return s;
  });

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={(outerR + innerR) / 2} fill="none" stroke="var(--hairline)" strokeWidth={thickness} />
        ) : (
          slices.map((s, i) =>
            s.sweep > 0.1 && (
              <path key={i} d={arcPath(s.start, s.sweep - 1.5)} fill={s.color} />
            )
          )
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 20, color: 'var(--ink)', letterSpacing: '-0.5px' }}>{totalLabel}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{totalSub}</div>
      </div>
    </div>
  );
};

/* ── Modal shell ─────────────────────────────────────────────── */
const ModalShell = ({ title, subtitle, maxWidth = 480, onClose, children }) => (
  <div
    style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  >
    <div style={{ width: '100%', maxWidth, background: 'var(--surface)', borderRadius: 18, boxShadow: '0 24px 80px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--hairline)', flexShrink: 0 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--ink)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--muted)', cursor: 'pointer', padding: 4 }}>
          <i className="bi bi-x-lg" />
        </button>
      </div>
      <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  </div>
);

/* ── Pay Bill modal ──────────────────────────────────────────── */
const PayBillModal = ({ invoice, onClose, onDone }) => {
  const [amount, setAmount] = useState(invoice?.amountDue ?? '');
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('bank_transfer');
  const [ref,    setRef]    = useState('');
  const [invId,  setInvId]  = useState(invoice?._id || '');
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');
  const isSingle = !!invoice;

  const submit = async (e) => {
    e.preventDefault();
    if (!Number(amount) > 0) { setErr('Enter a valid amount'); return; }
    setSaving(true); setErr('');
    try {
      await invoicesApi.recordPayment(invId || invoice._id, { amount: Number(amount), paidOn, method, reference: ref });
      onDone();
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Payment failed');
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Pay Bill" subtitle={invoice ? `${invoice.invoiceNumber} · ${invoice.client?.companyName}` : 'Record a payment'} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {err && <div className="jf-alert jf-alert-danger"><i className="bi bi-exclamation-circle" /> {err}</div>}

          {invoice && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 10, padding: '10px 14px' }}>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Outstanding balance</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 18, color: '#dc2626' }}>
                {fmtMoney(invoice.amountDue)}
              </span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="jf-field">
              <label className="jf-label">Amount <span className="req">*</span></label>
              <input className="jf-input" type="number" step="0.01" min="0.01"
                value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="jf-field">
              <label className="jf-label">Payment Date <span className="req">*</span></label>
              <input className="jf-input" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} required />
            </div>
          </div>

          <div className="jf-field">
            <label className="jf-label">Method</label>
            <select className="jf-select" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="online">Online</option>
            </select>
          </div>

          <div className="jf-field">
            <label className="jf-label">Reference</label>
            <input className="jf-input" placeholder="Wire ref, cheque number…"
              value={ref} onChange={(e) => setRef(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="sd-btn sd-btn-primary" disabled={saving}
              style={{ background: '#16a34a', borderColor: '#16a34a' }}>
              {saving ? 'Processing…' : <><i className="bi bi-bank" /> Pay Bill</>}
            </button>
            <button type="button" className="sd-btn" onClick={onClose} disabled={saving}>Cancel</button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
};

/* ── Upload Bill modal ───────────────────────────────────────── */
const UploadBillModal = ({ onClose }) => {
  const today  = new Date().toISOString().slice(0, 10);
  const net30  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [form, setForm] = useState({ vendor: '', dueDate: net30, amount: '', notes: '', category: 'Ocean Freight' });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.vendor || !form.amount) { setErr('Vendor and amount are required'); return; }
    setSaving(true); setErr('');
    try {
      await invoicesApi.create({
        type: 'ap',
        client: form.vendor,
        dueDate: form.dueDate,
        notes: `[${form.category}] ${form.notes}`,
        lines: [{ description: form.category, quantity: 1, unitPrice: Number(form.amount), taxRate: 0, amount: Number(form.amount), taxAmount: 0, total: Number(form.amount) }],
      });
      onClose();
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Failed to create bill');
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Upload Bill" subtitle="Create a new payable bill" onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {err && <div className="jf-alert jf-alert-danger"><i className="bi bi-exclamation-circle" /> {err}</div>}

          <div className="jf-field">
            <label className="jf-label">Vendor (Vendor ID) <span className="req">*</span></label>
            <input className="jf-input" placeholder="Paste vendor ID…" value={form.vendor} onChange={(e) => setF('vendor', e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="jf-field">
              <label className="jf-label">Amount <span className="req">*</span></label>
              <input className="jf-input" type="number" step="0.01" min="0" placeholder="0.00"
                value={form.amount} onChange={(e) => setF('amount', e.target.value)} required />
            </div>
            <div className="jf-field">
              <label className="jf-label">Due Date</label>
              <input className="jf-input" type="date" value={form.dueDate} onChange={(e) => setF('dueDate', e.target.value)} />
            </div>
          </div>

          <div className="jf-field">
            <label className="jf-label">Category</label>
            <select className="jf-select" value={form.category} onChange={(e) => setF('category', e.target.value)}>
              {CATS.map((c) => <option key={c.label} value={c.label}>{c.label}</option>)}
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="jf-field">
            <label className="jf-label">Notes</label>
            <textarea className="jf-input" rows={2} placeholder="Bill details, reference number…"
              value={form.notes} onChange={(e) => setF('notes', e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="sd-btn sd-btn-primary" disabled={saving}>
              {saving ? 'Creating…' : <><i className="bi bi-file-earmark-arrow-up" /> Create Bill</>}
            </button>
            <button type="button" className="sd-btn" onClick={onClose} disabled={saving}>Cancel</button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
};

/* ── AP Portal page ──────────────────────────────────────────── */
const APPortal = () => {
  const [invoices,    setInvoices]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [payingInv,   setPayingInv]   = useState(null);   // single bill
  const [payBills,    setPayBills]    = useState(false);   // "Pay Bills" header
  const [uploadBill,  setUploadBill]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoicesApi.list({ type: 'ap', limit: 200 });
      setInvoices(res.items || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── KPI computations ──────────────────────────────────────── */
  const now = new Date();
  const week7 = new Date(Date.now() + 7 * 86400000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const openBills = useMemo(
    () => invoices.filter((i) => ['sent', 'partially_paid', 'overdue'].includes(i.status)),
    [invoices]
  );

  const kpi = useMemo(() => ({
    totalPayables: openBills.reduce((s, i) => s + (i.amountDue || 0), 0),
    dueThisWeek:   openBills.filter((i) => { const d = new Date(i.dueDate); return d >= now && d <= week7; }).reduce((s, i) => s + (i.amountDue || 0), 0),
    overdue:       openBills.filter((i) => i.status === 'overdue').reduce((s, i) => s + (i.amountDue || 0), 0),
    paidThisMonth: invoices.filter((i) => i.status === 'paid' && new Date(i.updatedAt || i.createdAt) >= startOfMonth).reduce((s, i) => s + (i.amountPaid || 0), 0),
  }), [invoices, openBills]); // eslint-disable-line

  /* ── AP Aging (client-side) ────────────────────────────────── */
  const aging = useMemo(() => {
    const b = [
      { label: 'Current',    color: BUCKET_COLORS[0], count: 0, total: 0 },
      { label: '1-30 days',  color: BUCKET_COLORS[1], count: 0, total: 0 },
      { label: '31-60 days', color: BUCKET_COLORS[2], count: 0, total: 0 },
      { label: '61-90 days', color: BUCKET_COLORS[3], count: 0, total: 0 },
      { label: '90+ days',   color: BUCKET_COLORS[4], count: 0, total: 0 },
    ];
    for (const inv of openBills) {
      const dpd = daysPastDue(inv.dueDate);
      const idx = dpd === 0 ? 0 : dpd <= 30 ? 1 : dpd <= 60 ? 2 : dpd <= 90 ? 3 : 4;
      b[idx].count += 1;
      b[idx].total += inv.amountDue || 0;
    }
    return b;
  }, [openBills]);

  const agingTotal = aging.reduce((s, b) => s + b.total, 0);

  /* ── Category breakdown ────────────────────────────────────── */
  const categoryData = useMemo(() => {
    const acc = {};
    for (const inv of openBills) {
      const cat = getCategory(inv);
      if (!acc[cat.label]) acc[cat.label] = { ...cat, value: 0 };
      acc[cat.label].value += inv.total || 0;
    }
    const total = Object.values(acc).reduce((s, c) => s + c.value, 0);
    return Object.values(acc)
      .sort((a, b) => b.value - a.value)
      .map((c) => ({ ...c, pct: total > 0 ? Math.round((c.value / total) * 100) : 0 }));
  }, [openBills]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <div className="dashboard-loader">
          <div className="dashboard-loader-ring" />
          <i className="bi bi-credit-card dashboard-loader-icon" />
        </div>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Loading AP data…</span>
      </div>
    );
  }

  return (
    <div className="ap-shell">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="ap-header">
        <div className="ap-header-row">
          <div>
            <h1 className="ap-title">Accounts Payable</h1>
            <p className="ap-subtitle">
              {fmtMoney(kpi.totalPayables, true)} owed across {openBills.length} bill{openBills.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="ap-header-actions">
            <button className="sd-btn" type="button" onClick={() => setUploadBill(true)}>
              <i className="bi bi-file-earmark-arrow-up" /> Upload Bill
            </button>
            <button className="sd-btn sd-btn-primary" type="button" style={{ background: 'var(--brand)', borderColor: 'var(--brand)' }}
              onClick={() => setPayBills(true)}>
              <i className="bi bi-bank" /> Pay Bills
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI cards ───────────────────────────────────────────── */}
      <div className="inv-kpi-row" style={{ padding: '20px 28px 0' }}>
        <div className="inv-kpi-card">
          <div className="inv-kpi-label">Total Payables</div>
          <div className="inv-kpi-value">{fmtMoney(kpi.totalPayables, true)}</div>
          <div className="inv-kpi-footer">
            <span className="inv-kpi-delta up"><i className="bi bi-arrow-up-short" />4%</span>
            vs last month
          </div>
          <div className="inv-kpi-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <i className="bi bi-credit-card" />
          </div>
        </div>

        <div className="inv-kpi-card">
          <div className="inv-kpi-label">Due This Week</div>
          <div className="inv-kpi-value">{fmtMoney(kpi.dueThisWeek, true)}</div>
          <div className="inv-kpi-footer">
            <span className="inv-kpi-delta down"><i className="bi bi-arrow-down-short" />8%</span>
            vs last week
          </div>
          <div className="inv-kpi-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <i className="bi bi-calendar-week" />
          </div>
        </div>

        <div className="inv-kpi-card">
          <div className="inv-kpi-label">Overdue</div>
          <div className="inv-kpi-value">{fmtMoney(kpi.overdue, true)}</div>
          <div className="inv-kpi-footer">
            <span className="inv-kpi-delta down"><i className="bi bi-arrow-down-short" />15%</span>
            vs last week
          </div>
          <div className="inv-kpi-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <i className="bi bi-exclamation-triangle" />
          </div>
        </div>

        <div className="inv-kpi-card">
          <div className="inv-kpi-label">Paid This Month</div>
          <div className="inv-kpi-value">{fmtMoney(kpi.paidThisMonth, true)}</div>
          <div className="inv-kpi-footer">
            <span className="inv-kpi-delta up"><i className="bi bi-arrow-up-short" />22%</span>
            vs last month
          </div>
          <div className="inv-kpi-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <i className="bi bi-check-circle" />
          </div>
        </div>
      </div>

      {/* ── Two-column: By Category + AP Aging ─────────────────── */}
      <div className="ap-two-col">

        {/* By Category */}
        <div className="ar-card">
          <div className="ar-card-header">
            <span className="ar-card-title">By Category</span>
            <span className="ar-card-sub">Last 90 days</span>
          </div>
          <div className="ap-donut-wrap">
            {categoryData.length === 0 ? (
              <>
                <DonutChart data={[{ value: 1, color: 'var(--hairline)' }]} size={180} thickness={26}
                  totalLabel={fmtMoney(0, true)} totalSub="Open" />
                <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', marginTop: 8 }}>No open bills</div>
              </>
            ) : (
              <DonutChart data={categoryData} size={180} thickness={26}
                totalLabel={fmtMoney(kpi.totalPayables, true)} totalSub="Open" />
            )}
          </div>
          <div className="ap-cat-legend">
            {categoryData.map((c) => (
              <div key={c.label} className="ap-cat-row">
                <span className="ap-cat-dot" style={{ background: c.color }} />
                <span className="ap-cat-label">{c.label}</span>
                <span className="ap-cat-pct">{c.pct}%</span>
              </div>
            ))}
            {categoryData.length === 0 && CATS.slice(0, 4).map((c) => (
              <div key={c.label} className="ap-cat-row">
                <span className="ap-cat-dot" style={{ background: 'var(--hairline)' }} />
                <span className="ap-cat-label" style={{ color: 'var(--muted)' }}>{c.label}</span>
                <span className="ap-cat-pct" style={{ color: 'var(--muted)' }}>—</span>
              </div>
            ))}
          </div>
        </div>

        {/* AP Aging */}
        <div className="ar-card">
          <div className="ar-card-header">
            <span className="ar-card-title">AP Aging</span>
            <span className="ar-card-sub">{fmtMoney(agingTotal, true)} total</span>
          </div>

          {/* 5 bucket tiles */}
          <div className="ap-aging-grid">
            {aging.map((b) => (
              <div key={b.label} className="ap-aging-tile">
                <div className="ap-aging-tile-label">{b.label}</div>
                <div className="ap-aging-tile-value" style={{ color: b.color }}>
                  {fmtMoney(b.total, true)}
                </div>
                <div className="ap-aging-tile-count">{b.count}</div>
              </div>
            ))}
          </div>

          {/* Proportional stacked strip */}
          <div className="ap-aging-strip-wrap">
            <div className="ar-aging-strip" style={{ margin: '0 20px 0' }}>
              {aging.map((b) => {
                const pct = agingTotal > 0 ? (b.total / agingTotal) * 100 : 20;
                return (
                  <div key={b.label} className="ar-strip-seg" style={{ flex: pct, background: b.color }} />
                );
              })}
            </div>
            <div className="ap-aging-strip-labels">
              {aging.map((b) => <span key={b.label}>{b.label}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Open Bills table ────────────────────────────────────── */}
      <div className="ap-section">
        <div className="ar-card ar-card-flush">
          <div className="ar-card-header" style={{ padding: '18px 22px 14px' }}>
            <span className="ar-card-title">Open Bills</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="sd-btn" type="button" style={{ padding: '6px 12px', fontSize: 13 }}>
                <i className="bi bi-funnel" /> Filter
              </button>
              <button className="sd-btn" type="button" style={{ padding: '6px 12px', fontSize: 13 }}>
                <i className="bi bi-sort-down" /> Sort: Due date
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="ap-tbl">
              <thead>
                <tr>
                  <th style={{ width: 36, paddingRight: 0 }}><input type="checkbox" /></th>
                  <th style={{ width: 150 }}>Bill #</th>
                  <th>Vendor</th>
                  <th style={{ width: 140 }}>Category</th>
                  <th style={{ width: 100 }}>Due</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Amount</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Balance</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ width: 70 }}></th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
                      <i className="bi bi-receipt" style={{ fontSize: 32, display: 'block', opacity: 0.2, marginBottom: 10 }} />
                      No bills found
                    </td>
                  </tr>
                ) : invoices.map((inv) => {
                  const isOverdue = inv.status === 'overdue';
                  const isPaid    = inv.amountDue === 0 && (inv.amountPaid || 0) > 0;
                  const cat       = getCategory(inv);
                  return (
                    <tr key={inv._id} className="ap-tbl-row">
                      <td style={{ paddingRight: 0 }}><input type="checkbox" /></td>

                      <td>
                        <span className="inv-num">{inv.invoiceNumber}</span>
                      </td>

                      <td style={{ fontWeight: 600, fontSize: 13.5 }}>
                        {inv.client?.companyName || '—'}
                      </td>

                      <td>
                        <span className="ap-cat-chip" style={{ background: cat.color + '18', color: cat.color, border: `1px solid ${cat.color}28` }}>
                          {cat.label}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: 12.5, fontWeight: isOverdue ? 700 : 400, color: isOverdue ? '#dc2626' : 'var(--ink)' }}>
                          {fmtDate(inv.dueDate)}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <span className="inv-mono">{fmtMoney(inv.total)}</span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        {isPaid
                          ? <span className="inv-bal-paid">{fmtMoney(0)}</span>
                          : <span className="inv-mono">{fmtMoney(inv.amountDue)}</span>}
                      </td>

                      <td><StatusBadge status={inv.status} /></td>

                      <td>
                        {['sent', 'partially_paid', 'overdue'].includes(inv.status) && (
                          <button className="inv-act-btn inv-act-pay" type="button" onClick={() => setPayingInv(inv)}>
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────── */}
      {payingInv && (
        <PayBillModal
          invoice={payingInv}
          onClose={() => setPayingInv(null)}
          onDone={() => { setPayingInv(null); load(); }}
        />
      )}

      {payBills && (
        <ModalShell title="Pay Bills" subtitle="Select a bill to pay" onClose={() => setPayBills(false)}>
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {openBills.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>No open bills</div>
            ) : openBills.map((inv) => (
              <button key={inv._id} type="button"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid var(--hairline)', borderRadius: 10, background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', transition: 'background .1s' }}
                onClick={() => { setPayBills(false); setPayingInv(inv); }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{inv.client?.companyName || '—'}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }}>{inv.invoiceNumber}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 14, color: inv.status === 'overdue' ? '#dc2626' : 'var(--ink)' }}>
                    {fmtMoney(inv.amountDue)}
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
              </button>
            ))}
          </div>
        </ModalShell>
      )}

      {uploadBill && (
        <UploadBillModal
          onClose={() => setUploadBill(false)}
          onDone={() => { setUploadBill(false); load(); }}
        />
      )}

    </div>
  );
};

export default APPortal;
