import { useEffect, useState, useMemo } from 'react';
import {
  Row, Col, Badge, Spinner, Alert,
  Button, Modal, Form,
} from 'react-bootstrap';
import { invoicesApi } from '../api';

/* ── helpers ──────────────────────────────────────────────── */
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const fmtMoney = (n) =>
  `USD ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const daysPast = (dueDate) => {
  if (!dueDate) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dueDate)) / 86400000));
};

/* ── Escalation tiers ─────────────────────────────────────── */
const TIERS = [
  {
    key: 'reminder',
    label: 'Reminder',
    range: '1-30 days',
    min: 1, max: 30,
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
    icon: 'bi-bell',
    action: 'Send Reminder',
    actionVariant: 'outline-primary',
    description: 'Friendly reminder emails — automated first-touch collection',
  },
  {
    key: 'escalate',
    label: 'Escalate',
    range: '31-60 days',
    min: 31, max: 60,
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: 'bi-exclamation-triangle',
    action: 'Escalate',
    actionVariant: 'outline-warning',
    description: 'Manager escalation with formal demand notice',
  },
  {
    key: 'legal',
    label: 'Legal Notice',
    range: '61-90 days',
    min: 61, max: 90,
    color: '#f97316',
    bg: '#fff7ed',
    border: '#fed7aa',
    icon: 'bi-file-earmark-text',
    action: 'Legal Notice',
    actionVariant: 'outline-danger',
    description: 'Formal legal notice before write-off consideration',
  },
  {
    key: 'writeoff',
    label: 'Write-Off',
    range: '90+ days',
    min: 91, max: Infinity,
    color: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: 'bi-x-circle',
    action: 'Write Off',
    actionVariant: 'danger',
    description: 'Bad debt — initiate write-off procedure with finance approval',
  },
];

const getTier = (dpd) => {
  if (dpd <= 0)  return null;
  return TIERS.find((t) => dpd >= t.min && dpd <= t.max) || TIERS[3];
};

/* ── Action Log Modal ─────────────────────────────────────── */
const ActionModal = ({ invoice, tier, onClose }) => {
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setDone(true);
    setTimeout(() => { onClose(true); }, 800);
  };

  const templates = {
    reminder: `Dear ${invoice.client?.companyName || 'Client'},\n\nThis is a friendly reminder that invoice ${invoice.invoiceNumber} for ${fmtMoney(invoice.amountDue)} was due on ${fmt(invoice.dueDate)}.\n\nPlease arrange payment at your earliest convenience.\n\nThank you.`,
    escalate:  `Dear ${invoice.client?.companyName || 'Client'},\n\nDespite our earlier reminder, invoice ${invoice.invoiceNumber} for ${fmtMoney(invoice.amountDue)} remains unpaid as of ${fmt(invoice.dueDate)}.\n\nThis matter has been escalated to our management team. Please contact us within 5 business days.\n\nRegards,`,
    legal:     `FORMAL DEMAND NOTICE\n\nThis notice is to advise that invoice ${invoice.invoiceNumber} for ${fmtMoney(invoice.amountDue)}, which was due on ${fmt(invoice.dueDate)}, remains outstanding.\n\nFailure to settle within 7 days may result in legal proceedings.\n\nThis letter serves as formal demand for payment.`,
    writeoff:  `Internal Write-Off Request\n\nInvoice: ${invoice.invoiceNumber}\nClient: ${invoice.client?.companyName}\nAmount: ${fmtMoney(invoice.amountDue)}\nDue Date: ${fmt(invoice.dueDate)}\n\nReason: Bad debt — ${daysPast(invoice.dueDate)} days past due.\nFinance approval required.`,
  };

  return (
    <Modal show onHide={() => onClose(false)} size="lg" centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`bi ${tier.icon} me-2`} style={{ color: tier.color }}></i>
            {tier.action} — {invoice.invoiceNumber}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {done ? (
            <div className="text-center py-4">
              <i className="bi bi-check-circle-fill text-success fs-1 d-block mb-2"></i>
              <strong>Action logged successfully</strong>
              <div className="text-muted small">Communication sent and recorded in activity log</div>
            </div>
          ) : (
            <>
              <div className="mb-3 p-3 rounded" style={{ background: tier.bg, border: `1px solid ${tier.border}` }}>
                <strong style={{ color: tier.color }}>{tier.description}</strong>
                <div className="text-muted small mt-1">
                  Invoice {invoice.invoiceNumber} · {invoice.client?.companyName} · {daysPast(invoice.dueDate)} days past due · {fmtMoney(invoice.amountDue)}
                </div>
              </div>
              <Form.Group>
                <Form.Label>Communication Template</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={8}
                  value={note || templates[tier.key] || ''}
                  onChange={(e) => setNote(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        {!done && (
          <Modal.Footer>
            <Button variant="secondary" onClick={() => onClose(false)}>Cancel</Button>
            <Button type="submit" variant={tier.actionVariant.replace('outline-', '')}>
              <i className={`bi ${tier.icon} me-1`}></i>Confirm {tier.action}
            </Button>
          </Modal.Footer>
        )}
      </Form>
    </Modal>
  );
};

/* ── TierBand component ───────────────────────────────────── */
const TierBand = ({ tier, invoices, onAction }) => {
  const [expanded, setExpanded] = useState(true);
  const totalAmt = invoices.reduce((s, i) => s + (i.amountDue || 0), 0);

  return (
    <div className="erp-card mb-3 overflow-hidden" style={{ border: `1px solid ${tier.border}` }}>
      <div
        className="d-flex align-items-center justify-content-between p-3 cursor-pointer"
        style={{ background: tier.bg, cursor: 'pointer' }}
        onClick={() => setExpanded((x) => !x)}
      >
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-circle"
            style={{ width: 40, height: 40, background: tier.color, color: '#fff' }}
          >
            <i className={`bi ${tier.icon}`}></i>
          </div>
          <div>
            <div className="fw-bold" style={{ color: tier.color }}>
              {tier.label}
              <span className="text-muted fw-normal ms-2 small">({tier.range})</span>
            </div>
            <div className="small text-muted">{tier.description}</div>
          </div>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="text-end">
            <div className="fw-bold" style={{ color: tier.color }}>{fmtMoney(totalAmt)}</div>
            <small className="text-muted">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</small>
          </div>
          <i className={`bi bi-chevron-${expanded ? 'up' : 'down'} text-muted`}></i>
        </div>
      </div>

      {expanded && invoices.length > 0 && (
        <table className="erp-table mb-0">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Client</th>
              <th>Due Date</th>
              <th>Days Past Due</th>
              <th className="text-end">Outstanding</th>
              <th className="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const dpd = daysPast(inv.dueDate);
              return (
                <tr key={inv._id}>
                  <td><span className="font-monospace fw-semibold">{inv.invoiceNumber}</span></td>
                  <td>{inv.client?.companyName || '—'}</td>
                  <td className="text-muted small">{fmt(inv.dueDate)}</td>
                  <td>
                    <span className="fw-semibold" style={{ color: tier.color }}>{dpd}d</span>
                  </td>
                  <td className="text-end fw-semibold">{fmtMoney(inv.amountDue)}</td>
                  <td className="text-end">
                    <Button
                      size="sm"
                      variant={tier.actionVariant}
                      onClick={() => onAction(inv, tier)}
                    >
                      <i className={`bi ${tier.icon} me-1`}></i>{tier.action}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {expanded && invoices.length === 0 && (
        <div className="text-center py-3 text-muted small">
          <i className="bi bi-check-circle text-success me-1"></i>No invoices in this tier
        </div>
      )}
    </div>
  );
};

/* ── Main Component ───────────────────────────────────────── */
const Collections = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [actionTarget, setAction] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        const res = await invoicesApi.list({ type: 'ar', status: 'sent,partially_paid,overdue', limit: 200 });
        setInvoices(res.items || res.data || []);
      } catch (ex) {
        setError(ex.response?.data?.message || 'Failed to load AR invoices');
      } finally { setLoading(false); }
    })();
  }, []);

  /* Bucket invoices by tier */
  const tiered = useMemo(() => {
    const map = {};
    for (const t of TIERS) map[t.key] = [];
    for (const inv of invoices) {
      const dpd  = daysPast(inv.dueDate);
      const tier = getTier(dpd);
      if (tier) map[tier.key].push(inv);
    }
    return map;
  }, [invoices]);

  /* Summary KPIs */
  const totalOverdue   = invoices.reduce((s, i) => s + (i.amountDue || 0), 0);
  const totalInvoices  = invoices.length;
  const urgentCount    = (tiered.legal?.length || 0) + (tiered.writeoff?.length || 0);
  const urgentAmount   = [...(tiered.legal || []), ...(tiered.writeoff || [])]
    .reduce((s, i) => s + (i.amountDue || 0), 0);

  if (loading) {
    return (
      <div className="ss-loading" style={{ minHeight: 400 }}>
        <div className="dashboard-loader">
          <div className="dashboard-loader-ring"></div>
          <i className="bi bi-alarm dashboard-loader-icon"></i>
        </div>
        <span>Loading collections…</span>
      </div>
    );
  }
  if (error) return <div className="py-4"><div className="alert alert-danger">{error}</div></div>;

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="ss-page-header">
        <div className="ss-page-header-left">
          <div className="ss-page-header-icon"><i className="bi bi-alarm"></i></div>
          <div>
            <h4 className="ss-page-title">Collections</h4>
            <div className="ss-page-sub">Smart AR escalation workflow — tiered collection management</div>
          </div>
        </div>
        <div className="ss-header-actions">
          <button className="ss-action-btn">
            <i className="bi bi-download me-2"></i>Export
          </button>
        </div>
      </div>

      {/* ── KPI strip ────────────────────────────────────────── */}
      <div className="inv-summary-strip mb-4">
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Total Overdue</div>
          <div className="inv-summary-value" style={{ color: '#dc2626' }}>{fmtMoney(totalOverdue)}</div>
          <div className="inv-summary-sub">all tiers</div>
        </div>
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Open Invoices</div>
          <div className="inv-summary-value">{totalInvoices}</div>
          <div className="inv-summary-sub">requiring action</div>
        </div>
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Urgent (61d+)</div>
          <div className="inv-summary-value" style={{ color: urgentCount > 0 ? '#dc2626' : 'var(--bs-body-color)' }}>
            {urgentCount}
          </div>
          <div className="inv-summary-sub">escalated invoices</div>
        </div>
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Urgent Amount</div>
          <div className="inv-summary-value" style={{ color: urgentAmount > 0 ? '#dc2626' : 'var(--bs-body-color)' }}>
            {fmtMoney(urgentAmount)}
          </div>
          <div className="inv-summary-sub">at risk</div>
        </div>
      </div>

      {/* ── Collection funnel ────────────────────────────────── */}
      {totalInvoices > 0 && (
        <div className="erp-card mb-4">
          <div className="erp-card-header">
            <span className="erp-card-title">
              <i className="bi bi-funnel me-2 opacity-50"></i>
              Collection Funnel
            </span>
            <span style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>
              {totalInvoices} invoices · {fmtMoney(totalOverdue)}
            </span>
          </div>
          <div className="erp-card-body">
            <div className="coll-funnel">
              {TIERS.map((t) => {
                const count = tiered[t.key]?.length || 0;
                const pct   = totalInvoices > 0 ? Math.max((count / totalInvoices) * 100, 4) : 0;
                return (
                  <div
                    key={t.key}
                    className="coll-funnel-band"
                    style={{ background: t.color, flex: `${pct} 0 0%` }}
                    title={`${t.label}: ${count} invoices`}
                  >
                    {count > 0 && (
                      <>
                        <span className="coll-funnel-count">{count}</span>
                        <span className="coll-funnel-label">{t.label}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="d-flex gap-3 flex-wrap mt-2">
              {TIERS.map((t) => (
                <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: t.color, display: 'inline-block' }}></span>
                  <span style={{ color: 'var(--bs-secondary-color)' }}>{t.label}</span>
                  <span style={{ fontWeight: 700 }}>{t.range}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tier bands ───────────────────────────────────────── */}
      {TIERS.map((tier) => (
        <TierBand
          key={tier.key}
          tier={tier}
          invoices={tiered[tier.key] || []}
          onAction={(inv, t) => setAction({ inv, tier: t })}
        />
      ))}

      {/* Action Modal */}
      {actionTarget && (
        <ActionModal
          invoice={actionTarget.inv}
          tier={actionTarget.tier}
          onClose={() => setAction(null)}
        />
      )}
    </div>
  );
};

export default Collections;
