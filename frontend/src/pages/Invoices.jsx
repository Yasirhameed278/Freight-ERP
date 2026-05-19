import { useEffect, useState, useMemo } from 'react';
import { invoicesApi, clientsApi } from '../api';
import SendDocumentModal from '../components/SendDocumentModal';

/* ── Helpers ─────────────────────────────────────────────────── */
const fmtMoney = (v, c = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v || 0);

const fmtCompact = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 0 }).format(v || 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

const daysPast = (d) => {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d)) / 86400000);
};

/* ── Status config ───────────────────────────────────────────── */
const STATUS_CFG = {
  draft:          { label: 'Draft',    dot: '#94a3b8', bg: '#f1f5f9', color: '#475569' },
  sent:           { label: 'Sent',     dot: '#3b82f6', bg: '#eff6ff', color: '#1d4ed8' },
  partially_paid: { label: 'Partial',  dot: '#f59e0b', bg: '#fffbeb', color: '#92400e' },
  paid:           { label: 'Paid',     dot: '#10b981', bg: '#f0fdf4', color: '#065f46' },
  overdue:        { label: 'Overdue',  dot: '#ef4444', bg: '#fef2f2', color: '#991b1b' },
  cancelled:      { label: 'Cancelled',dot: '#94a3b8', bg: '#f1f5f9', color: '#475569' },
  written_off:    { label: 'Written Off',dot:'#94a3b8',bg: '#f1f5f9', color: '#475569' },
};

const FILTER_CHIPS = [
  { key: 'all',            label: 'All' },
  { key: 'sent',           label: 'Sent' },
  { key: 'partially_paid', label: 'Partial' },
  { key: 'paid',           label: 'Paid' },
  { key: 'overdue',        label: 'Overdue' },
];

const PAGE_SIZE = 25;

/* ── Status badge ────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  return (
    <span className="inv-status-badge" style={{ background: cfg.bg, color: cfg.color }}>
      <span className="inv-status-dot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
};

/* ── Payment Modal ───────────────────────────────────────────── */
const PaymentModal = ({ invoice, onClose, onSaved }) => {
  const [form, setForm] = useState({
    amount:    invoice.amountDue,
    paidOn:    new Date().toISOString().slice(0, 10),
    method:    'bank_transfer',
    reference: '',
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await invoicesApi.recordPayment(invoice._id, { ...form, amount: Number(form.amount) });
      onSaved();
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Failed to record payment');
    } finally { setSaving(false); }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--surface)', borderRadius: 16, boxShadow: '0 24px 60px rgba(0,0,0,0.28)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--hairline)' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>Record Payment</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{invoice.invoiceNumber} · {invoice.client?.companyName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--muted)', cursor: 'pointer', padding: 4, lineHeight: 1 }}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={submit}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {err && (
              <div className="jf-alert jf-alert-danger">
                <i className="bi bi-exclamation-circle" /> {err}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 10, padding: '12px 16px' }}>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Outstanding balance</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 20, color: '#dc2626' }}>
                {fmtMoney(invoice.amountDue, invoice.currency)}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="jf-field">
                <label className="jf-label">Amount <span className="req">*</span></label>
                <input className="jf-input" type="number" step="0.01" min="0" max={invoice.amountDue}
                  value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div className="jf-field">
                <label className="jf-label">Payment Date <span className="req">*</span></label>
                <input className="jf-input" type="date" value={form.paidOn}
                  onChange={(e) => setForm({ ...form, paidOn: e.target.value })} required />
              </div>
            </div>

            <div className="jf-field">
              <label className="jf-label">Method</label>
              <select className="jf-select" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
              </select>
            </div>

            <div className="jf-field">
              <label className="jf-label">Reference</label>
              <input className="jf-input" placeholder="Wire ref, cheque number…" value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </div>
          </div>

          <div style={{ padding: '0 24px 20px', display: 'flex', gap: 8 }}>
            <button type="submit" className="sd-btn sd-btn-primary" disabled={saving}
              style={{ background: '#16a34a', borderColor: '#16a34a' }}>
              {saving ? 'Saving…' : <><i className="bi bi-check-circle" /> Record Payment</>}
            </button>
            <button type="button" className="sd-btn" onClick={onClose} disabled={saving}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── New Invoice Modal ───────────────────────────────────────── */
const EMPTY_LINE = () => ({ description: '', quantity: 1, unitPrice: '', taxRate: 0 });

const NewInvoiceModal = ({ onClose, onSaved }) => {
  const today = new Date().toISOString().slice(0, 10);
  const net30  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [form, setForm] = useState({
    client:       '',
    type:         'ar',
    currency:     'USD',
    issueDate:    today,
    dueDate:      net30,
    paymentTerms: 'Net 30',
    poNumber:     '',
    notes:        '',
  });
  const [lines,   setLines]   = useState([EMPTY_LINE()]);
  const [clients, setClients] = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  useEffect(() => {
    clientsApi.list({ limit: 200 }).then((d) => setClients(d.items || [])).catch(() => {});
  }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setLine = (i, k, v) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));

  const addLine    = () => setLines((ls) => [...ls, EMPTY_LINE()]);
  const removeLine = (i) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const lineTotal = (l) =>
    ((Number(l.unitPrice) || 0) * (Number(l.quantity) || 1) * (1 + (Number(l.taxRate) || 0) / 100));

  const grandTotal = lines.reduce((s, l) => s + lineTotal(l), 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.client)  { setErr('Select a client'); return; }
    if (!form.dueDate) { setErr('Due date is required'); return; }
    const validLines = lines.filter((l) => l.description.trim() && Number(l.unitPrice) > 0);
    if (!validLines.length) { setErr('Add at least one line item'); return; }

    setSaving(true);
    setErr('');
    try {
      await invoicesApi.create({
        ...form,
        lines: validLines.map((l) => ({
          description: l.description,
          quantity:    Number(l.quantity) || 1,
          unitPrice:   Number(l.unitPrice),
          taxRate:     Number(l.taxRate) || 0,
          amount:      (Number(l.unitPrice) || 0) * (Number(l.quantity) || 1),
          taxAmount:   (Number(l.unitPrice) || 0) * (Number(l.quantity) || 1) * ((Number(l.taxRate) || 0) / 100),
          total:       lineTotal(l),
        })),
      });
      onSaved();
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Failed to create invoice');
      setSaving(false);
    }
  };

  const fmtM = (v) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: form.currency || 'USD', maximumFractionDigits: 2 }).format(v || 0);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: 640, background: 'var(--surface)', borderRadius: 18, boxShadow: '0 24px 80px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--hairline)', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--ink)' }}>New Invoice</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Auto-numbered · saved as draft</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--muted)', cursor: 'pointer', padding: 4, lineHeight: 1 }}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={submit} style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {err && (
              <div className="jf-alert jf-alert-danger"><i className="bi bi-exclamation-circle" /> {err}</div>
            )}

            {/* Row 1: Client + Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12 }}>
              <div className="jf-field">
                <label className="jf-label">Client <span className="req">*</span></label>
                <select className="jf-select" value={form.client} onChange={(e) => setField('client', e.target.value)} required>
                  <option value="">Select client…</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>{c.companyName}</option>
                  ))}
                </select>
              </div>
              <div className="jf-field">
                <label className="jf-label">Type</label>
                <select className="jf-select" value={form.type} onChange={(e) => setField('type', e.target.value)}>
                  <option value="ar">AR (receivable)</option>
                  <option value="ap">AP (payable)</option>
                  <option value="credit_note">Credit Note</option>
                  <option value="debit_note">Debit Note</option>
                </select>
              </div>
            </div>

            {/* Row 2: Issue date + Due date + Currency */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 12 }}>
              <div className="jf-field">
                <label className="jf-label">Issue Date</label>
                <input className="jf-input" type="date" value={form.issueDate} onChange={(e) => setField('issueDate', e.target.value)} />
              </div>
              <div className="jf-field">
                <label className="jf-label">Due Date <span className="req">*</span></label>
                <input className="jf-input" type="date" value={form.dueDate} onChange={(e) => setField('dueDate', e.target.value)} required />
              </div>
              <div className="jf-field">
                <label className="jf-label">Currency</label>
                <select className="jf-select" value={form.currency} onChange={(e) => setField('currency', e.target.value)}>
                  {['USD','EUR','GBP','AED','SAR','SGD','CAD','AUD','PKR'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: PO + Payment terms */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="jf-field">
                <label className="jf-label">PO Number</label>
                <input className="jf-input" placeholder="Optional" value={form.poNumber} onChange={(e) => setField('poNumber', e.target.value)} />
              </div>
              <div className="jf-field">
                <label className="jf-label">Payment Terms</label>
                <select className="jf-select" value={form.paymentTerms} onChange={(e) => setField('paymentTerms', e.target.value)}>
                  {['Net 7','Net 14','Net 30','Net 45','Net 60','Due on Receipt','Custom'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Line items */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label className="jf-label" style={{ margin: 0 }}>Line Items <span className="req">*</span></label>
              </div>

              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px 70px 32px', gap: 6, marginBottom: 4 }}>
                {['Description','Qty','Unit Price','Tax %',''].map((h) => (
                  <span key={h} style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>{h}</span>
                ))}
              </div>

              {lines.map((l, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px 70px 32px', gap: 6, marginBottom: 6 }}>
                  <input className="jf-input" placeholder="e.g. Ocean freight" value={l.description}
                    onChange={(e) => setLine(i, 'description', e.target.value)} style={{ fontSize: 13 }} />
                  <input className="jf-input" type="number" min="1" step="1" value={l.quantity}
                    onChange={(e) => setLine(i, 'quantity', e.target.value)} style={{ fontSize: 13 }} />
                  <input className="jf-input" type="number" min="0" step="0.01" placeholder="0.00" value={l.unitPrice}
                    onChange={(e) => setLine(i, 'unitPrice', e.target.value)} style={{ fontSize: 13 }} />
                  <input className="jf-input" type="number" min="0" max="100" step="0.1" placeholder="0" value={l.taxRate}
                    onChange={(e) => setLine(i, 'taxRate', e.target.value)} style={{ fontSize: 13 }} />
                  <button type="button" onClick={() => removeLine(i)} disabled={lines.length === 1}
                    style={{ background: 'none', border: '1px solid transparent', borderRadius: 7, color: 'var(--muted)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    <i className="bi bi-trash3" />
                  </button>
                </div>
              ))}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <button type="button" onClick={addLine}
                  style={{ background: 'none', border: '1px dashed var(--hairline)', borderRadius: 8, color: 'var(--brand)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, padding: '5px 12px' }}>
                  <i className="bi bi-plus" /> Add line
                </button>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>
                  {fmtM(grandTotal)}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="jf-field">
              <label className="jf-label">Notes</label>
              <textarea className="jf-input" rows={2} placeholder="Payment instructions, terms, etc." value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }} />
            </div>

          </div>

          {/* Footer */}
          <div style={{ padding: '0 24px 20px', display: 'flex', gap: 8, flexShrink: 0 }}>
            <button type="submit" className="sd-btn sd-btn-primary" disabled={saving}>
              {saving ? 'Creating…' : <><i className="bi bi-file-earmark-text" /> Create Invoice</>}
            </button>
            <button type="button" className="sd-btn" onClick={onClose} disabled={saving}>Cancel</button>
          </div>
        </form>

      </div>
    </div>
  );
};

/* ── Invoices page ───────────────────────────────────────────── */
const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');
  const [search,   setSearch]   = useState('');
  const [page,     setPage]     = useState(1);
  const [paying,     setPaying]     = useState(null);
  const [sending,    setSending]    = useState(null);
  const [newInvoice, setNewInvoice] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { items } = await invoicesApi.list({ limit: 200 });
      setInvoices(items || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line
  useEffect(() => { setPage(1); }, [filter, search]);

  /* KPI summary */
  const kpi = useMemo(() => ({
    totalInvoiced: invoices.reduce((s, i) => s + (i.total || 0), 0),
    collected:     invoices.reduce((s, i) => s + (i.amountPaid || 0), 0),
    outstanding:   invoices.reduce((s, i) => s + (i.amountDue || 0), 0),
    overdueAmt:    invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + (i.amountDue || 0), 0),
  }), [invoices]);

  /* Filter counts */
  const counts = useMemo(() => ({
    all:            invoices.length,
    sent:           invoices.filter((i) => i.status === 'sent').length,
    partially_paid: invoices.filter((i) => i.status === 'partially_paid').length,
    paid:           invoices.filter((i) => i.status === 'paid').length,
    overdue:        invoices.filter((i) => i.status === 'overdue').length,
  }), [invoices]);

  /* Filtered + searched */
  const filtered = useMemo(() => {
    let result = filter === 'all' ? invoices : invoices.filter((i) => i.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) =>
        i.invoiceNumber?.toLowerCase().includes(q) ||
        i.client?.companyName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [invoices, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="inv-shell">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="inv-header">
        <div className="inv-header-row">
          <div>
            <h1 className="inv-title">Invoices</h1>
            <p className="inv-subtitle">
              {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} · {fmtCompact(kpi.outstanding)} outstanding
            </p>
          </div>
          <div className="inv-header-actions">
            <button className="sd-btn" type="button"><i className="bi bi-upload" /> Import</button>
            <button className="sd-btn" type="button"><i className="bi bi-download" /> Export</button>
            <button className="sd-btn sd-btn-primary" type="button" onClick={() => setNewInvoice(true)}><i className="bi bi-plus" /> New Invoice</button>
          </div>
        </div>
      </div>

      {/* ── KPI cards ───────────────────────────────────────── */}
      <div className="inv-kpi-row">
        <div className="inv-kpi-card">
          <div className="inv-kpi-label">Total Invoiced</div>
          <div className="inv-kpi-value">{fmtCompact(kpi.totalInvoiced)}</div>
          <div className="inv-kpi-footer">
            <span className="inv-kpi-delta up"><i className="bi bi-arrow-up-short" />9%</span>
            vs last month
          </div>
          <div className="inv-kpi-icon" style={{ background: '#fff7ed', color: 'var(--brand)' }}>
            <i className="bi bi-receipt" />
          </div>
        </div>

        <div className="inv-kpi-card">
          <div className="inv-kpi-label">Collected</div>
          <div className="inv-kpi-value">{fmtCompact(kpi.collected)}</div>
          <div className="inv-kpi-footer">
            <span className="inv-kpi-delta up"><i className="bi bi-arrow-up-short" />14%</span>
            vs last month
          </div>
          <div className="inv-kpi-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <i className="bi bi-check-circle" />
          </div>
        </div>

        <div className="inv-kpi-card">
          <div className="inv-kpi-label">Outstanding</div>
          <div className="inv-kpi-value">{fmtCompact(kpi.outstanding)}</div>
          <div className="inv-kpi-footer">
            <span className="inv-kpi-delta down"><i className="bi bi-arrow-down-short" />3%</span>
            vs last month
          </div>
          <div className="inv-kpi-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <i className="bi bi-clock-history" />
          </div>
        </div>

        <div className="inv-kpi-card">
          <div className="inv-kpi-label">Overdue</div>
          <div className="inv-kpi-value">{fmtCompact(kpi.overdueAmt)}</div>
          <div className="inv-kpi-footer">
            <span className="inv-kpi-delta down"><i className="bi bi-arrow-down-short" />12%</span>
            vs last week
          </div>
          <div className="inv-kpi-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <i className="bi bi-exclamation-triangle" />
          </div>
        </div>
      </div>

      {/* ── Filter row ──────────────────────────────────────── */}
      <div className="inv-filter-row">
        <div className="inv-chips">
          {FILTER_CHIPS.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`inv-chip${filter === c.key ? ' active' : ''}`}
              onClick={() => setFilter(c.key)}
            >
              {c.label}
              <span className="count">{counts[c.key] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="inv-filter-right">
          <div className="inv-search">
            <i className="bi bi-search" />
            <input
              placeholder="Invoice #, client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, fontSize: 13 }}>
                <i className="bi bi-x" />
              </button>
            )}
          </div>
          <button className="sd-btn" type="button" style={{ padding: '7px 12px' }}>
            <i className="bi bi-funnel" />
          </button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="inv-table-wrap">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 16 }}>
            <div className="dashboard-loader">
              <div className="dashboard-loader-ring" />
              <i className="bi bi-receipt dashboard-loader-icon" />
            </div>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Loading invoices…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '60px 20px', color: 'var(--muted)' }}>
            <i className="bi bi-receipt" style={{ fontSize: 36, opacity: 0.2 }} />
            <span style={{ fontSize: 13 }}>No invoices match your filters</span>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="inv-tbl">
                <thead>
                  <tr>
                    <th style={{ width: 36, paddingRight: 0 }}><input type="checkbox" /></th>
                    <th style={{ width: 140 }}>Invoice #</th>
                    <th>Client</th>
                    <th style={{ width: 130 }}>Shipment</th>
                    <th style={{ width: 90 }}>Issued</th>
                    <th style={{ width: 110 }}>Due</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Amount</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Balance</th>
                    <th style={{ width: 110 }}>Status</th>
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((inv) => {
                    const isOverdue  = inv.status === 'overdue';
                    const isPaid     = inv.amountDue === 0 && (inv.amountPaid || 0) > 0;
                    const paidPct    = inv.total > 0 ? Math.min(100, Math.round(((inv.amountPaid || 0) / inv.total) * 100)) : 0;
                    const lateDays   = isOverdue ? daysPast(inv.dueDate) : 0;
                    const shipNum    = inv.shipment?.shipmentNumber || (typeof inv.shipment === 'string' ? '' : null);

                    return (
                      <tr key={inv._id}>
                        <td style={{ paddingRight: 0 }}><input type="checkbox" /></td>

                        {/* Invoice # */}
                        <td>
                          <span className="inv-num">{inv.invoiceNumber}</span>
                          {inv.type && (
                            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2, fontWeight: 500 }}>
                              {inv.type}
                            </div>
                          )}
                        </td>

                        {/* Client */}
                        <td style={{ fontWeight: 600, fontSize: 13.5 }}>{inv.client?.companyName || '—'}</td>

                        {/* Shipment */}
                        <td>
                          {shipNum
                            ? <span className="inv-mono-muted">{shipNum}</span>
                            : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                        </td>

                        {/* Issued */}
                        <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{fmtDate(inv.issueDate)}</td>

                        {/* Due */}
                        <td>
                          <div className={isOverdue ? 'inv-due-overdue' : ''} style={{ fontSize: 12.5 }}>
                            {fmtDate(inv.dueDate)}
                          </div>
                          {lateDays > 0 && (
                            <div className="inv-due-late">{lateDays}d late</div>
                          )}
                        </td>

                        {/* Amount */}
                        <td style={{ textAlign: 'right' }}>
                          <span className="inv-mono">{fmtMoney(inv.total, inv.currency)}</span>
                        </td>

                        {/* Balance */}
                        <td style={{ textAlign: 'right' }}>
                          {isPaid ? (
                            <span className="inv-bal-paid">{fmtMoney(0, inv.currency)}</span>
                          ) : (
                            <>
                              <span className="inv-bal-due">{fmtMoney(inv.amountDue, inv.currency)}</span>
                              {inv.status === 'partially_paid' && (
                                <div className="inv-pay-bar">
                                  <div className="inv-pay-bar-fill" style={{ width: `${paidPct}%` }} />
                                </div>
                              )}
                            </>
                          )}
                        </td>

                        {/* Status */}
                        <td><StatusBadge status={inv.status} /></td>

                        {/* Actions */}
                        <td>
                          <div className="inv-row-actions">
                            <button className="inv-icon-btn" type="button" onClick={() => invoicesApi.previewPdf(inv._id)} title="Preview PDF">
                              <i className="bi bi-eye" />
                            </button>
                            {['sent', 'partially_paid', 'overdue'].includes(inv.status) && (
                              <button className="inv-act-btn inv-act-pay" type="button" onClick={() => setPaying(inv)}>
                                Pay
                              </button>
                            )}
                            {inv.status === 'draft' && (
                              <button className="inv-act-btn inv-act-send" type="button" onClick={() => setSending(inv)}>
                                Send
                              </button>
                            )}
                            <button className="inv-icon-btn" type="button">
                              <i className="bi bi-three-dots" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="inv-table-footer">
              <span style={{ fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                {filtered.length === 0
                  ? '0 results'
                  : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="inv-page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <i className="bi bi-chevron-left" /> Previous
                </button>
                <button className="inv-page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next <i className="bi bi-chevron-right" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────── */}
      {newInvoice && (
        <NewInvoiceModal
          onClose={() => setNewInvoice(false)}
          onSaved={() => { setNewInvoice(false); load(); }}
        />
      )}

      {paying && (
        <PaymentModal
          invoice={paying}
          onClose={() => setPaying(null)}
          onSaved={() => { setPaying(null); load(); }}
        />
      )}

      {sending && (
        <SendDocumentModal
          title={`Send Invoice ${sending.invoiceNumber}`}
          defaultEmail={sending.client?.email || ''}
          onSend={async ({ email, cc }) => { await invoicesApi.send(sending._id, { email, cc }); load(); }}
          onClose={() => setSending(null)}
          onPreview={() => invoicesApi.previewPdf(sending._id)}
        />
      )}
    </div>
  );
};

export default Invoices;
