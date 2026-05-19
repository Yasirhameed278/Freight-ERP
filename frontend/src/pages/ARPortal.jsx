import { useEffect, useState, useMemo, useCallback } from 'react';
import { analyticsApi, invoicesApi, clientsApi } from '../api';

/* ── Formatters ─────────────────────────────────────────────── */
const fmtMoney = (v, compact = false) => {
  if (compact) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

/* ── Status config ───────────────────────────────────────────── */
const STATUS_CFG = {
  draft:          { label: 'Draft',   dot: '#94a3b8', bg: '#f1f5f9', color: '#475569' },
  sent:           { label: 'Sent',    dot: '#3b82f6', bg: '#eff6ff', color: '#1d4ed8' },
  partially_paid: { label: 'Partial', dot: '#f59e0b', bg: '#fffbeb', color: '#92400e' },
  paid:           { label: 'Paid',    dot: '#10b981', bg: '#f0fdf4', color: '#065f46' },
  overdue:        { label: 'Overdue', dot: '#ef4444', bg: '#fef2f2', color: '#991b1b' },
  cancelled:      { label: 'Cancelled', dot: '#94a3b8', bg: '#f1f5f9', color: '#475569' },
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

/* ── Bucket colors ───────────────────────────────────────────── */
const BUCKET_COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#d97706', '#ef4444'];

/* ── Simple SVG line chart ───────────────────────────────────── */
const LineChart = ({ series = [], labels = [], height = 160 }) => {
  const W = 480;
  const H = height;
  const PAD = { t: 12, r: 8, b: 4, l: 8 };
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;

  const allVals = series.flatMap((s) => s.data);
  const minV = Math.min(...allVals) * 0.85;
  const maxV = Math.max(...allVals) * 1.05;
  const range = maxV - minV || 1;

  const xOf = (i) => PAD.l + (i / (labels.length - 1)) * cw;
  const yOf = (v) => PAD.t + ch - ((v - minV) / range) * ch;

  const pathOf = (data) =>
    data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`).join(' ');

  const fillOf = (data, color) => {
    const pts = data.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
    const last = data.length - 1;
    return `M ${xOf(0).toFixed(1)},${(PAD.t + ch).toFixed(1)} L ${pts} L ${xOf(last).toFixed(1)},${(PAD.t + ch).toFixed(1)} Z`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      {series.map((s, si) => (
        <g key={si}>
          {s.fill && (
            <path d={fillOf(s.data, s.color)} fill={s.color} fillOpacity={0.12} />
          )}
          <path d={pathOf(s.data)} fill="none" stroke={s.color} strokeWidth={s.fill ? 2 : 1.5}
            strokeLinejoin="round" strokeLinecap="round" />
          {s.data.map((v, i) => (
            <circle key={i} cx={xOf(i)} cy={yOf(v)} r={3.5} fill="var(--surface)" stroke={s.color} strokeWidth={2} />
          ))}
        </g>
      ))}
    </svg>
  );
};

/* ── Shared modal shell ──────────────────────────────────────── */
const ModalShell = ({ title, subtitle, onClose, children, footer }) => (
  <div
    style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  >
    <div style={{ width: '100%', maxWidth: 480, background: 'var(--surface)', borderRadius: 18, boxShadow: '0 24px 80px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--hairline)', flexShrink: 0 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--ink)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--muted)', cursor: 'pointer', padding: 4, lineHeight: 1 }}>
          <i className="bi bi-x-lg" />
        </button>
      </div>
      <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
        {children}
      </div>
      {footer && (
        <div style={{ padding: '0 24px 20px', display: 'flex', gap: 8, flexShrink: 0 }}>
          {footer}
        </div>
      )}
    </div>
  </div>
);

/* ── Remind modal (per-invoice) ──────────────────────────────── */
const RemindModal = ({ invoice, onClose, onDone }) => {
  const [email,     setEmail]     = useState(invoice.client?.email || '');
  const [cc,        setCc]        = useState('');
  const [sending,   setSending]   = useState(false);
  const [err,       setErr]       = useState('');
  const [sent,      setSent]      = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) { setErr('Recipient email is required'); return; }
    setSending(true); setErr('');
    try {
      await invoicesApi.send(invoice._id, { email, cc: cc || undefined });
      setSent(true);
      setTimeout(onDone, 1200);
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Failed to send reminder');
      setSending(false);
    }
  };

  return (
    <ModalShell
      title="Send Reminder"
      subtitle={`${invoice.invoiceNumber} · ${fmtMoney(invoice.amountDue)} outstanding`}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {err  && <div className="jf-alert jf-alert-danger"><i className="bi bi-exclamation-circle" /> {err}</div>}
          {sent && <div className="jf-alert jf-alert-success"><i className="bi bi-check-circle" /> Reminder sent!</div>}

          <div className="jf-field">
            <label className="jf-label">Recipient Email <span className="req">*</span></label>
            <input className="jf-input" type="email" required placeholder="client@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} disabled={sent} />
          </div>
          <div className="jf-field">
            <label className="jf-label">Cc <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
            <input className="jf-input" type="email" placeholder="accounts@yourcompany.com"
              value={cc} onChange={(e) => setCc(e.target.value)} disabled={sent} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="sd-btn sd-btn-primary" disabled={sending || sent}>
              {sending ? 'Sending…' : <><i className="bi bi-send" /> Send Reminder</>}
            </button>
            <button type="button" className="sd-btn" onClick={onClose} disabled={sending}>Cancel</button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
};

/* ── Bulk reminders modal ────────────────────────────────────── */
const BulkRemindModal = ({ invoices, onClose, onDone }) => {
  const overdue = invoices.filter((i) => i.status === 'overdue' && i.amountDue > 0);
  const open    = invoices.filter((i) => i.status !== 'overdue' && i.amountDue > 0);
  const targets = overdue.length > 0 ? overdue : open;

  const [selected,  setSelected]  = useState(() => new Set(targets.map((i) => i._id)));
  const [sending,   setSending]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [err,       setErr]       = useState('');
  const [done,      setDone]      = useState(false);

  const toggle = (id) => setSelected((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const sendAll = async () => {
    const batch = targets.filter((i) => selected.has(i._id) && i.client?.email);
    if (!batch.length) { setErr('No invoices with client emails selected'); return; }
    setSending(true); setErr('');
    let sent = 0;
    for (const inv of batch) {
      try {
        await invoicesApi.send(inv._id, { email: inv.client.email });
      } catch (_) { /* skip failed */ }
      sent++;
      setProgress(Math.round((sent / batch.length) * 100));
    }
    setDone(true);
    setTimeout(onDone, 1500);
  };

  return (
    <ModalShell title="Send Reminders" subtitle={`${selected.size} invoice${selected.size !== 1 ? 's' : ''} selected`} onClose={onClose}>
      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {err  && <div className="jf-alert jf-alert-danger"><i className="bi bi-exclamation-circle" /> {err}</div>}
        {done && <div className="jf-alert jf-alert-success"><i className="bi bi-check-circle" /> All reminders sent!</div>}

        {targets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
            No open invoices to remind
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
              {overdue.length > 0 ? 'Overdue invoices' : 'Open invoices'} — select which clients to remind:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {targets.map((inv) => (
                <label key={inv._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--hairline)', background: selected.has(inv._id) ? 'color-mix(in oklch, var(--brand) 5%, var(--surface))' : 'var(--surface)', cursor: 'pointer', transition: 'all .15s' }}>
                  <input type="checkbox" checked={selected.has(inv._id)} onChange={() => toggle(inv._id)} disabled={sending || done} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{inv.client?.companyName || '—'}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{inv.invoiceNumber} · {fmtMoney(inv.amountDue)} due</div>
                  </div>
                  {!inv.client?.email && <span style={{ fontSize: 11, color: '#dc2626' }}>no email</span>}
                </label>
              ))}
            </div>

            {sending && !done && (
              <div style={{ marginTop: 4 }}>
                <div className="inv-pay-bar"><div className="inv-pay-bar-fill" style={{ width: `${progress}%`, background: 'var(--brand)' }} /></div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Sending… {progress}%</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="sd-btn sd-btn-primary" onClick={sendAll} disabled={sending || done || selected.size === 0}>
                {sending && !done ? 'Sending…' : <><i className="bi bi-send" /> Send {selected.size} Reminder{selected.size !== 1 ? 's' : ''}</>}
              </button>
              <button className="sd-btn" onClick={onClose} disabled={sending}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
};

/* ── Record Payment modal ────────────────────────────────────── */
const RecordPaymentModal = ({ openInvoices, onClose, onDone }) => {
  const [invId,  setInvId]  = useState(openInvoices[0]?._id || '');
  const [amount, setAmount] = useState('');
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('bank_transfer');
  const [ref,    setRef]    = useState('');
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const selectedInv = openInvoices.find((i) => i._id === invId);

  useEffect(() => {
    setAmount(selectedInv?.amountDue ?? '');
  }, [invId, selectedInv]);

  const submit = async (e) => {
    e.preventDefault();
    if (!invId)  { setErr('Select an invoice'); return; }
    if (!amount || Number(amount) <= 0) { setErr('Enter a valid amount'); return; }
    setSaving(true); setErr('');
    try {
      await invoicesApi.recordPayment(invId, { amount: Number(amount), paidOn, method, reference: ref });
      onDone();
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Failed to record payment');
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Record Payment" subtitle="Applied to a specific open invoice" onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {err && <div className="jf-alert jf-alert-danger"><i className="bi bi-exclamation-circle" /> {err}</div>}

          <div className="jf-field">
            <label className="jf-label">Invoice <span className="req">*</span></label>
            <select className="jf-select" value={invId} onChange={(e) => setInvId(e.target.value)} required>
              <option value="">Select invoice…</option>
              {openInvoices.map((i) => (
                <option key={i._id} value={i._id}>
                  {i.invoiceNumber} — {i.client?.companyName} ({fmtMoney(i.amountDue)} due)
                </option>
              ))}
            </select>
          </div>

          {selectedInv && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 10, padding: '10px 14px' }}>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Outstanding balance</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 18, color: '#dc2626' }}>
                {fmtMoney(selectedInv.amountDue)}
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
              {saving ? 'Saving…' : <><i className="bi bi-check-circle" /> Record Payment</>}
            </button>
            <button type="button" className="sd-btn" onClick={onClose} disabled={saving}>Cancel</button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
};

/* ── AR Portal page ──────────────────────────────────────────── */
const ARPortal = () => {
  const [arAging,       setArAging]       = useState([]);
  const [arCustomers,   setArCustomers]   = useState([]);
  const [clients,       setClients]       = useState([]);
  const [invoices,      setInvoices]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [reminding,     setReminding]     = useState(null);   // single invoice
  const [bulkRemind,    setBulkRemind]    = useState(false);
  const [recordPayment, setRecordPayment] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [agingRes, custRes, invRes, cliRes] = await Promise.all([
        analyticsApi.arAging(),
        analyticsApi.arByCustomer({ limit: 6 }),
        invoicesApi.list({ type: 'ar', limit: 200 }),
        clientsApi.list({ limit: 200 }),
      ]);
      setArAging(agingRes.data || []);
      setArCustomers(custRes.data || []);
      setInvoices(invRes.items || []);
      setClients(cliRes.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalAR    = arAging.reduce((s, b) => s + b.total, 0);
  const totalCount = arAging.reduce((s, b) => s + b.count, 0);

  const topCustomers = useMemo(() =>
    arCustomers.map((c) => {
      const cli = clients.find((cl) => String(cl._id) === String(c.clientId));
      return {
        ...c,
        creditLimit: cli?.creditLimit || 0,
        code:        cli?.clientCode  || '',
        industry:    cli?.industry    || '',
      };
    }),
  [arCustomers, clients]);

  const openInvoices = useMemo(
    () => invoices.filter((i) => (i.amountDue || 0) > 0),
    [invoices]
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <div className="dashboard-loader">
          <div className="dashboard-loader-ring" />
          <i className="bi bi-wallet2 dashboard-loader-icon" />
        </div>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Loading AR data…</span>
      </div>
    );
  }

  return (
    <div className="ar-shell">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="ar-header">
        <div className="ar-header-row">
          <div>
            <h1 className="ar-title">Accounts Receivable</h1>
            <p className="ar-subtitle">
              {fmtMoney(totalAR, true)} outstanding across {totalCount} invoice{totalCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="ar-header-actions">
            <button className="sd-btn" type="button" onClick={() => setBulkRemind(true)}>
              <i className="bi bi-envelope" /> Send reminders
            </button>
            <button className="sd-btn sd-btn-primary" type="button"
              style={{ background: 'var(--brand)', borderColor: 'var(--brand)' }}
              onClick={() => setRecordPayment(true)}>
              <i className="bi bi-cash-coin" /> Record Payment
            </button>
          </div>
        </div>
      </div>

      {/* ── AR Aging Distribution ──────────────────────────────── */}
      <div className="ar-section">
        <div className="ar-card">
          <div className="ar-card-header">
            <span className="ar-card-title">AR Aging Distribution</span>
            <span className="ar-card-sub">As of {today}</span>
          </div>

          {/* 5 bucket KPI mini-cards */}
          <div className="ar-aging-grid">
            {arAging.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--muted)', padding: '32px 0', fontSize: 13 }}>
                No outstanding AR
              </div>
            ) : (
              arAging.map((b, i) => {
                const color = BUCKET_COLORS[i] || '#94a3b8';
                const pct   = totalAR > 0 ? (b.total / totalAR) * 100 : 0;
                return (
                  <div key={b.bucket} className="ar-bucket-card" style={{ borderTop: `3px solid ${color}` }}>
                    <div className="ar-bucket-label">{b.bucket}</div>
                    <div className="ar-bucket-value">{fmtMoney(b.total, true)}</div>
                    <div className="ar-bucket-sub">{b.count} invoice{b.count !== 1 ? 's' : ''} · {pct.toFixed(0)}%</div>
                    <div className="ar-bucket-bar">
                      <div className="ar-bucket-bar-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Proportional horizontal stacked bar */}
          {arAging.length > 0 && (
            <div className="ar-aging-strip">
              {arAging.map((b, i) => {
                const color = BUCKET_COLORS[i] || '#94a3b8';
                const pct   = totalAR > 0 ? (b.total / totalAR) * 100 : 0;
                return (
                  <div key={b.bucket} className="ar-strip-seg" style={{ flex: pct, background: color }}>
                    <div className="ar-strip-label">{b.bucket}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Two-column: Top Customers + Cash Forecast ─────────── */}
      <div className="ar-two-col">

        {/* Top Receivables by Customer */}
        <div className="ar-card ar-card-flush">
          <div className="ar-card-header" style={{ padding: '18px 22px 8px' }}>
            <span className="ar-card-title">Top Receivables by Customer</span>
            <span className="ar-card-link">All →</span>
          </div>
          <table className="ar-tbl">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Open</th>
                <th style={{ width: 200 }}>Credit Used</th>
                <th style={{ width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 0', fontSize: 13 }}>No outstanding receivables</td></tr>
              ) : topCustomers.map((c) => {
                const pct = c.creditLimit > 0 ? Math.min(100, (c.outstanding / c.creditLimit) * 100) : 0;
                const barColor = pct > 100 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#16a34a';
                return (
                  <tr key={c.clientId} className="ar-tbl-row">
                    <td>
                      <div className="ar-customer-name">{c.companyName}</div>
                      <div className="ar-customer-meta">{c.code}{c.industry ? ` · ${c.industry}` : ''}</div>
                    </td>
                    <td>
                      <span className="ar-open-amt">{fmtMoney(c.outstanding, true)}</span>
                    </td>
                    <td>
                      {c.creditLimit > 0 ? (
                        <>
                          <div className="ar-credit-bar">
                            <div className="ar-credit-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                          </div>
                          <div className="ar-credit-meta">
                            {fmtMoney(c.outstanding, true)} / {fmtMoney(c.creditLimit, true)}
                          </div>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <i className="bi bi-arrow-right-short" style={{ color: 'var(--muted)', fontSize: 18 }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Cash Inflow Forecast */}
        <div className="ar-card">
          <div className="ar-card-header">
            <span className="ar-card-title">Cash Inflow Forecast</span>
            <span className="ar-card-sub">Next 4 weeks</span>
          </div>

          <div style={{ marginTop: 8 }}>
            <LineChart
              height={160}
              labels={['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5']}
              series={[
                { data: [22, 42, 28, 56, 41], color: 'var(--brand)', fill: true },
                { data: [18, 32, 26, 38, 36], color: 'var(--ink)',   fill: false },
              ]}
            />
          </div>

          <div className="ar-forecast-labels">
            {['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5'].map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>

          <div className="ar-forecast-stats">
            <div>
              <div className="ar-forecast-stat-label">Expected (4wk)</div>
              <div className="ar-forecast-stat-value">$189k</div>
            </div>
            <div>
              <div className="ar-forecast-stat-label">Confirmed</div>
              <div className="ar-forecast-stat-value" style={{ color: '#16a34a' }}>$112k</div>
            </div>
            <div>
              <div className="ar-forecast-stat-label">At risk</div>
              <div className="ar-forecast-stat-value" style={{ color: '#dc2626' }}>$24k</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Open Invoices ──────────────────────────────────────── */}
      <div className="ar-section" style={{ paddingBottom: 40 }}>
        <div className="ar-card ar-card-flush">
          <div className="ar-card-header" style={{ padding: '18px 22px 8px' }}>
            <span className="ar-card-title">Open Invoices</span>
            <span className="ar-card-link">All invoices →</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="ar-tbl ar-tbl-full">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {openInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0', fontSize: 13 }}>
                      <i className="bi bi-check-circle" style={{ fontSize: 28, opacity: 0.2, display: 'block', marginBottom: 8 }} />
                      All invoices settled
                    </td>
                  </tr>
                ) : openInvoices.map((inv) => {
                  const isOverdue = inv.status === 'overdue';
                  return (
                    <tr key={inv._id} className="ar-tbl-row">
                      <td><span className="inv-num">{inv.invoiceNumber}</span></td>
                      <td style={{ fontWeight: 600, fontSize: 13.5 }}>{inv.client?.companyName || '—'}</td>
                      <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{fmtDate(inv.issueDate)}</td>
                      <td>
                        <span style={{ fontSize: 12.5, fontWeight: isOverdue ? 700 : 400, color: isOverdue ? '#dc2626' : 'var(--ink)' }}>
                          {fmtDate(inv.dueDate)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="inv-mono">{fmtMoney(inv.total)}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="inv-mono">{fmtMoney(inv.amountDue)}</span>
                      </td>
                      <td><StatusBadge status={inv.status} /></td>
                      <td>
                        <button className="ar-remind-btn" type="button" onClick={() => setReminding(inv)}>Remind</button>
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
      {reminding && (
        <RemindModal
          invoice={reminding}
          onClose={() => setReminding(null)}
          onDone={() => { setReminding(null); load(); }}
        />
      )}

      {bulkRemind && (
        <BulkRemindModal
          invoices={openInvoices}
          onClose={() => setBulkRemind(false)}
          onDone={() => { setBulkRemind(false); load(); }}
        />
      )}

      {recordPayment && (
        <RecordPaymentModal
          openInvoices={openInvoices}
          onClose={() => setRecordPayment(false)}
          onDone={() => { setRecordPayment(false); load(); }}
        />
      )}

    </div>
  );
};

export default ARPortal;
