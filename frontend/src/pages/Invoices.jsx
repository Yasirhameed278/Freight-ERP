import { useEffect, useState, useMemo } from 'react';
import { Row, Col, Badge, Form, Modal, Button, Alert, InputGroup } from 'react-bootstrap';
import { invoicesApi } from '../api';
import SendDocumentModal from '../components/SendDocumentModal';

/* ── Config ──────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  draft:           { label: 'Draft',        color: '#6c757d', bg: '#f8f9fa' },
  sent:            { label: 'Sent',          color: '#0891b2', bg: '#e0f2fe' },
  partially_paid:  { label: 'Part. Paid',    color: '#d97706', bg: '#fef9c3' },
  paid:            { label: 'Paid',          color: '#16a34a', bg: '#dcfce7' },
  overdue:         { label: 'Overdue',       color: '#dc2626', bg: '#fee2e2' },
  cancelled:       { label: 'Cancelled',     color: '#6b7280', bg: '#f3f4f6' },
  written_off:     { label: 'Written Off',   color: '#6b7280', bg: '#f3f4f6' },
};

const FILTER_CHIPS = [
  { key: '',               label: 'All',         dot: '#6c757d' },
  { key: 'draft',          label: 'Draft',       dot: '#6c757d' },
  { key: 'sent',           label: 'Sent',        dot: '#0891b2' },
  { key: 'partially_paid', label: 'Part. Paid',  dot: '#d97706' },
  { key: 'paid',           label: 'Paid',        dot: '#16a34a' },
  { key: 'overdue',        label: 'Overdue',     dot: '#dc2626' },
];

const fmtMoney = (v, c = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v || 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

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
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-cash-coin me-2 text-success"></i>
            Record Payment
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {err && <Alert variant="danger" className="py-2">{err}</Alert>}
          <div
            className="p-3 rounded mb-3"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }}
          >
            <div className="d-flex justify-content-between">
              <div>
                <div className="fw-bold" style={{ fontSize: 14 }}>{invoice.invoiceNumber}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>{invoice.client?.companyName}</div>
              </div>
              <div className="text-end">
                <div className="text-muted" style={{ fontSize: 11 }}>Outstanding</div>
                <div className="fw-bold text-danger" style={{ fontSize: 16 }}>
                  {fmtMoney(invoice.amountDue, invoice.currency)}
                </div>
              </div>
            </div>
          </div>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Amount *</Form.Label>
                <Form.Control
                  type="number" step="0.01" min="0" max={invoice.amountDue}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Payment Date *</Form.Label>
                <Form.Control
                  type="date" value={form.paidOn}
                  onChange={(e) => setForm({ ...form, paidOn: e.target.value })}
                  required
                />
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Method</Form.Label>
                <Form.Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="online">Online</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Reference</Form.Label>
                <Form.Control
                  placeholder="Wire ref, cheque number…"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="success" disabled={saving}>
            {saving ? 'Saving…' : <><i className="bi bi-check-circle me-1"></i>Record Payment</>}
          </Button>
        </Modal.Footer>
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

  const filtered = useMemo(() => {
    if (!search.trim()) return invoices;
    const q = search.toLowerCase();
    return invoices.filter((i) =>
      i.invoiceNumber?.toLowerCase().includes(q) ||
      i.client?.companyName?.toLowerCase().includes(q)
    );
  }, [invoices, search]);

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
          <div>
            <h4 className="ss-page-title">Invoices</h4>
            <div className="ss-page-sub">Manage AR/AP invoices, send to clients, record payments</div>
          </div>
        </div>
        <InputGroup size="sm" style={{ width: 240 }}>
          <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
          <Form.Control
            placeholder="Invoice # or client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
      </div>

      {/* ── Summary strip ────────────────────────────────────── */}
      <div className="inv-summary-strip">
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Total Invoices</div>
          <div className="inv-summary-value">{summary.total}</div>
          <div className="inv-summary-sub">all statuses</div>
        </div>
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Outstanding</div>
          <div className="inv-summary-value" style={{ color: '#d97706' }}>{fmtMoney(summary.outstanding)}</div>
          <div className="inv-summary-sub">unpaid balance</div>
        </div>
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Collected</div>
          <div className="inv-summary-value" style={{ color: '#16a34a' }}>{fmtMoney(summary.collected)}</div>
          <div className="inv-summary-sub">total received</div>
        </div>
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Overdue</div>
          <div className="inv-summary-value" style={{ color: summary.overdue > 0 ? '#dc2626' : 'var(--bs-body-color)' }}>
            {summary.overdue}
          </div>
          <div className="inv-summary-sub">past due date</div>
        </div>
      </div>

      {/* ── Status filter chips ───────────────────────────────── */}
      <div className="inv-status-chips">
        {FILTER_CHIPS.map((c) => (
          <button
            key={c.key}
            className={`inv-status-chip${filter === c.key ? ' active' : ''}`}
            style={{ '--chip-c': c.dot }}
            onClick={() => setFilter(c.key)}
          >
            <span
              className="inv-status-chip-dot"
              style={{ background: filter === c.key ? 'rgba(255,255,255,0.7)' : c.dot }}
            ></span>
            {c.label}
            {c.key === 'overdue' && summary.overdue > 0 && (
              <span
                style={{
                  marginLeft: 4,
                  fontSize: 10,
                  fontWeight: 800,
                  background: filter === c.key ? 'rgba(255,255,255,0.25)' : '#dc262618',
                  color: filter === c.key ? '#fff' : '#dc2626',
                  padding: '1px 6px',
                  borderRadius: 10,
                }}
              >
                {summary.overdue}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="erp-card">
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
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Client</th>
                    <th>Issued</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th className="text-end">Total</th>
                    <th className="text-end">Paid</th>
                    <th className="text-end">Balance</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const sc = STATUS_CONFIG[inv.status] || { label: inv.status, color: '#6c757d', bg: '#f3f4f6' };
                    return (
                      <tr
                        key={inv._id}
                        style={inv.status === 'overdue' ? { background: 'rgba(220,38,38,0.03)' } : undefined}
                      >
                        <td>
                          <div
                            style={{
                              fontFamily: 'monospace',
                              fontSize: 12,
                              fontWeight: 700,
                              color: 'var(--brand)',
                            }}
                          >
                            {inv.invoiceNumber}
                          </div>
                          {inv.type && (
                            <div style={{ fontSize: 10, color: 'var(--bs-secondary-color)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {inv.type}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 13 }}>
                          <div className="fw-semibold">{inv.client?.companyName || '—'}</div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>{fmtDate(inv.issueDate)}</td>
                        <td>
                          <div style={{ fontSize: 12, color: inv.isOverdue ? '#dc2626' : 'var(--bs-secondary-color)', fontWeight: inv.isOverdue ? 700 : 400 }}>
                            {fmtDate(inv.dueDate)}
                          </div>
                          {inv.daysPastDue > 0 && (
                            <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 700 }}>
                              {inv.daysPastDue}d overdue
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 9px',
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              background: sc.bg,
                              color: sc.color,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.color, display: 'inline-block' }}></span>
                            {sc.label}
                          </span>
                        </td>
                        <td className="text-end" style={{ fontFamily: 'monospace', fontSize: 13 }}>
                          {fmtMoney(inv.total, inv.currency)}
                        </td>
                        <td className="text-end" style={{ fontFamily: 'monospace', fontSize: 13, color: '#16a34a' }}>
                          {inv.amountPaid > 0 ? fmtMoney(inv.amountPaid, inv.currency) : <span className="text-muted">—</span>}
                        </td>
                        <td
                          className="text-end"
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 13,
                            fontWeight: 700,
                            color: inv.amountDue > 0 ? '#d97706' : '#16a34a',
                          }}
                        >
                          {fmtMoney(inv.amountDue, inv.currency)}
                        </td>
                        <td>
                          <div className="d-flex gap-1 justify-content-end">
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              style={{ padding: '3px 8px', fontSize: 12 }}
                              onClick={() => invoicesApi.previewPdf(inv._id)}
                              title="Preview PDF"
                            >
                              <i className="bi bi-file-earmark-pdf"></i>
                            </button>
                            {inv.status === 'draft' && (
                              <button
                                className="btn btn-sm btn-primary"
                                style={{ padding: '3px 10px', fontSize: 12 }}
                                onClick={() => setSending(inv)}
                              >
                                <i className="bi bi-send me-1"></i>Send
                              </button>
                            )}
                            {['sent', 'partially_paid', 'overdue'].includes(inv.status) && (
                              <button
                                className="btn btn-sm btn-success"
                                style={{ padding: '3px 10px', fontSize: 12 }}
                                onClick={() => setPaying(inv)}
                              >
                                <i className="bi bi-cash-coin me-1"></i>Pay
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

            {/* Table footer */}
            <div
              style={{
                padding: '10px 16px',
                borderTop: '1px solid var(--border-soft)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 12,
                background: 'var(--surface-2)',
              }}
            >
              <span className="text-muted">
                {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
              </span>
              <div className="d-flex gap-3" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <span>
                  Total:{' '}
                  <strong>{fmtMoney(filtered.reduce((s, i) => s + (i.total || 0), 0))}</strong>
                </span>
                <span>
                  Balance:{' '}
                  <strong style={{ color: '#d97706' }}>
                    {fmtMoney(filtered.reduce((s, i) => s + (i.amountDue || 0), 0))}
                  </strong>
                </span>
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
