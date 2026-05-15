import { useEffect, useState, useMemo } from 'react';
import { Row, Col, Form, Modal } from 'react-bootstrap';
import { invoicesApi } from '../api';
import SendDocumentModal from '../components/SendDocumentModal';

/* ── Config — subtle pill badges ───────────────────────────────── */
const STATUS_CONFIG = {
  draft:           { label: 'Draft',        color: '#475569', bg: '#f1f5f9' },
  sent:            { label: 'Sent',         color: '#1d4ed8', bg: '#eff6ff' },
  partially_paid:  { label: 'Part. Paid',   color: '#92400e', bg: '#fef3c7' },
  paid:            { label: 'Paid',         color: '#15803d', bg: '#f0fdf4' },
  overdue:         { label: 'Overdue',      color: '#991b1b', bg: '#fef2f2' },
  cancelled:       { label: 'Cancelled',    color: '#475569', bg: '#f1f5f9' },
  written_off:     { label: 'Written Off',  color: '#475569', bg: '#f1f5f9' },
};

const FILTER_CHIPS = [
  { key: '',               label: 'All' },
  { key: 'draft',          label: 'Draft' },
  { key: 'sent',           label: 'Sent' },
  { key: 'partially_paid', label: 'Part. Paid' },
  { key: 'paid',           label: 'Paid' },
  { key: 'overdue',        label: 'Overdue' },
];

const PAGE_SIZE  = 25;
const NEG_AMBER  = '#92400e';
const POS_GREEN  = '#15803d';

const fmtMoney = (v, c = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v || 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const pmField = { fontSize: 13, background: 'var(--surface-2)', border: '1.5px solid var(--border-soft)', borderRadius: 8 };
const pmLabel = { fontSize: 11.5, fontWeight: 600, color: 'var(--bs-secondary-color)', marginBottom: 5 };

/* ── Payment Modal ───────────────────────────────────────────── */
const PaymentModal = ({ invoice, onClose, onSaved }) => {
  const [form, setForm] = useState({
    amount: invoice.amountDue,
    paidOn: new Date().toISOString().slice(0, 10),
    method: 'bank_transfer',
    reference: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

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
    <Modal show onHide={onClose} centered>
      <Form onSubmit={submit}>
        <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>Record Payment</div>
            <div style={{ fontSize: 12.5, color: 'var(--bs-secondary-color)', marginTop: 2 }}>{invoice.invoiceNumber} · {invoice.client?.companyName}</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--bs-secondary-color)', cursor: 'pointer', padding: '3px 4px', lineHeight: 1 }}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        <Modal.Body style={{ padding: '18px 24px' }}>
          {err && <div style={{ fontSize: 12.5, color: '#dc2626', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}><i className="bi bi-exclamation-circle me-2"></i>{err}</div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '12px 14px', marginBottom: 18 }}>
            <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>Outstanding balance</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 18, color: '#dc2626' }}>
              {fmtMoney(invoice.amountDue, invoice.currency)}
            </div>
          </div>
          <Row className="g-3">
            <Col md={6}>
              <div style={pmLabel}>Amount *</div>
              <Form.Control type="number" step="0.01" min="0" max={invoice.amountDue} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required style={pmField} />
            </Col>
            <Col md={6}>
              <div style={pmLabel}>Payment Date *</div>
              <Form.Control type="date" value={form.paidOn} onChange={(e) => setForm({ ...form, paidOn: e.target.value })} required style={pmField} />
            </Col>
            <Col xs={12}>
              <div style={pmLabel}>Method</div>
              <Form.Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} style={pmField}>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
              </Form.Select>
            </Col>
            <Col xs={12}>
              <div style={pmLabel}>Reference</div>
              <Form.Control placeholder="Wire ref, cheque number…" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} style={pmField} />
            </Col>
          </Row>
        </Modal.Body>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="ss-action-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="ss-action-btn" style={{ background: '#16a34a', borderColor: '#16a34a', color: '#fff' }} disabled={saving}>
            {saving ? 'Saving…' : <><i className="bi bi-check-circle me-1"></i>Record Payment</>}
          </button>
        </div>
      </Form>
    </Modal>
  );
};

/* ── Invoices page ───────────────────────────────────────────── */
const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('');
  const [search,   setSearch]   = useState('');
  const [page,     setPage]     = useState(1);
  const [paying,   setPaying]   = useState(null);
  const [sending,  setSending]  = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = filter ? { status: filter } : {};
      const { items } = await invoicesApi.list(params);
      setInvoices(items);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);
  useEffect(() => { setPage(1); }, [filter, search]);

  const filtered = useMemo(() => {
    if (!search.trim()) return invoices;
    const q = search.toLowerCase();
    return invoices.filter((i) =>
      i.invoiceNumber?.toLowerCase().includes(q) ||
      i.client?.companyName?.toLowerCase().includes(q)
    );
  }, [invoices, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* Summary tiles */
  const summary = useMemo(() => ({
    total:      invoices.length,
    overdue:    invoices.filter((i) => i.status === 'overdue').length,
    outstanding: invoices.reduce((s, i) => s + (i.amountDue || 0), 0),
    collected:  invoices.reduce((s, i) => s + (i.amountPaid || 0), 0),
  }), [invoices]);

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="ss-page-header">
        <div className="ss-page-header-left">
          <div className="ss-page-header-icon"><i className="bi bi-receipt"></i></div>
          <h4 className="ss-page-title" style={{ margin: 0 }}>Invoices</h4>
        </div>
      </div>

      {/* ── Stat bar ─────────────────────────────────────────── */}
      <div className="inv-stat-bar">
        <div className="inv-stat-item">
          <span className="inv-stat-value">{summary.total}</span>
          <span className="inv-stat-label">Total</span>
        </div>
        <div className="inv-stat-divider" />
        <div className="inv-stat-item">
          <span className="inv-stat-value" style={{ color: NEG_AMBER }}>{fmtMoney(summary.outstanding)}</span>
          <span className="inv-stat-label">Outstanding</span>
        </div>
        <div className="inv-stat-divider" />
        <div className="inv-stat-item">
          <span className="inv-stat-value">{fmtMoney(summary.collected)}</span>
          <span className="inv-stat-label">Collected</span>
        </div>
        <div className="inv-stat-divider" />
        <div className="inv-stat-item">
          <span className="inv-stat-value" style={{ color: summary.overdue > 0 ? '#991b1b' : 'var(--bs-body-color)' }}>{summary.overdue}</span>
          <span className="inv-stat-label">Overdue</span>
        </div>
      </div>

      {/* ── Tabs + search ────────────────────────────────────── */}
      <div className="inv-toolbar">
        <div className="inv-tabs">
          {FILTER_CHIPS.map((c) => (
            <button
              key={c.key}
              className={`inv-tab${filter === c.key ? ' active' : ''}`}
              onClick={() => setFilter(c.key)}
            >
              {c.label}
              {c.key === 'overdue' && summary.overdue > 0 && (
                <span className="inv-tab-badge">{summary.overdue}</span>
              )}
            </button>
          ))}
        </div>
        <div className="inv-search-box">
          <i className="bi bi-search"></i>
          <input
            placeholder="Search invoice or client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')}><i className="bi bi-x"></i></button>
          )}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="erp-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="ss-loading" style={{ minHeight: 240 }}>
            <div className="dashboard-loader">
              <div className="dashboard-loader-ring"></div>
              <i className="bi bi-receipt dashboard-loader-icon"></i>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="dash-empty-state" style={{ padding: '48px 20px' }}>
            <i className="bi bi-receipt" style={{ fontSize: 36, opacity: 0.2 }}></i>
            <span>No invoices match your filters</span>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="erp-table inv-table">
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>Invoice</th>
                    <th>Client</th>
                    <th style={{ width: 110 }}>Issued</th>
                    <th style={{ width: 120 }}>Due</th>
                    <th style={{ width: 120 }}>Status</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Total</th>
                    <th style={{ width: 130, textAlign: 'right' }}>Paid</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Balance</th>
                    <th style={{ width: 120 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((inv) => {
                    const sc = STATUS_CONFIG[inv.status] || { label: inv.status, color: '#475569', bg: '#f1f5f9' };
                    const isOverdue = inv.status === 'overdue';
                    const isSettled = inv.amountDue === 0 && inv.amountPaid > 0;
                    const paidPct   = inv.total > 0 ? Math.min(100, Math.round((inv.amountPaid / inv.total) * 100)) : 0;

                    return (
                      <tr key={inv._id} className={`inv-row${isOverdue ? ' inv-row-overdue' : ''}`}>
                        <td>
                          <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5, fontWeight: 600, color: 'var(--bs-body-color)', letterSpacing: '0.01em' }}>
                            {inv.invoiceNumber}
                          </div>
                          {inv.type && (
                            <div style={{ fontSize: 10, color: 'var(--bs-secondary-color)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2, fontWeight: 500 }}>
                              {inv.type}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--bs-body-color)' }}>{inv.client?.companyName || '—'}</div>
                        </td>
                        <td style={{ fontSize: 12.5, color: 'var(--bs-secondary-color)' }}>{fmtDate(inv.issueDate)}</td>
                        <td>
                          <div style={{ fontSize: 12.5, color: isOverdue ? '#991b1b' : 'var(--bs-secondary-color)', fontWeight: isOverdue ? 500 : 400 }}>
                            {fmtDate(inv.dueDate)}
                          </div>
                          {inv.daysPastDue > 0 && (
                            <div style={{ fontSize: 10.5, color: '#991b1b', fontWeight: 500, marginTop: 2, letterSpacing: '0.01em' }}>
                              {inv.daysPastDue} days past due
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="inv-badge" style={{ background: sc.bg, color: sc.color }}>
                            {sc.label}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, color: 'var(--bs-body-color)', fontVariantNumeric: 'tabular-nums' }}>
                          {fmtMoney(inv.total, inv.currency)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {inv.amountPaid > 0 ? (
                            <>
                              <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, color: 'var(--bs-body-color)', fontVariantNumeric: 'tabular-nums' }}>
                                {fmtMoney(inv.amountPaid, inv.currency)}
                              </div>
                              {inv.status === 'partially_paid' && (
                                <div className="inv-pay-bar" style={{ marginLeft: 'auto' }}>
                                  <div className="inv-pay-bar-fill" style={{ width: `${paidPct}%` }}></div>
                                </div>
                              )}
                            </>
                          ) : (
                            <span style={{ color: 'var(--bs-secondary-color)', fontSize: 13 }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: isSettled ? 'var(--bs-secondary-color)' : (inv.amountDue > 0 ? NEG_AMBER : 'var(--bs-body-color)') }}>
                          {fmtMoney(inv.amountDue, inv.currency)}
                        </td>
                        <td>
                          <div className="inv-row-actions">
                            <button className="inv-icon-btn" onClick={() => invoicesApi.previewPdf(inv._id)} title="Preview PDF">
                              <i className="bi bi-file-earmark-pdf"></i>
                            </button>
                            {inv.status === 'draft' && (
                              <button className="inv-act-btn inv-act-send" onClick={() => setSending(inv)}>
                                <i className="bi bi-send"></i>Send
                              </button>
                            )}
                            {['sent', 'partially_paid', 'overdue'].includes(inv.status) && (
                              <button className="inv-act-btn inv-act-pay" onClick={() => setPaying(inv)}>
                                Record payment
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer — count + pagination */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--bs-secondary-color)', fontVariantNumeric: 'tabular-nums' }}>
                {filtered.length === 0 ? '0 results' : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="inv-page-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <i className="bi bi-chevron-left"></i> Previous
                </button>
                <button
                  className="inv-page-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

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
          onSend={async ({ email, cc }) => {
            await invoicesApi.send(sending._id, { email, cc });
            load();
          }}
          onClose={() => setSending(null)}
          onPreview={() => invoicesApi.previewPdf(sending._id)}
        />
      )}
    </div>
  );
};

export default Invoices;
