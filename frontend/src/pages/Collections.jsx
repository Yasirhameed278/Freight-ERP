import { useEffect, useState, useMemo, useCallback } from 'react';
import { invoicesApi } from '../api';

/* ── Formatters ─────────────────────────────────────────────── */
const fmtMoney = (v, compact = false) => {
  if (compact)
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const daysPastDue = (d) =>
  d ? Math.max(0, Math.floor((Date.now() - new Date(d)) / 86400000)) : 0;

/* ── Stage config ────────────────────────────────────────────── */
const getStage = (dpd) => {
  if (dpd <= 0)  return { key: 'new',   label: 'New',          color: '#475569', bg: '#f1f5f9' };
  if (dpd <= 7)  return { key: '1st',   label: '1st reminder', color: '#2563eb', bg: '#eff6ff' };
  if (dpd <= 14) return { key: '2nd',   label: '2nd reminder', color: '#d97706', bg: '#fef9c3' };
  if (dpd <= 30) return { key: 'final', label: 'Final notice', color: '#c2410c', bg: '#fff7ed' };
  return           { key: 'legal', label: 'Legal',         color: '#ffffff', bg: '#1e293b' };
};

const STAGE_CARDS = [
  { key: '1st',   label: '1st Reminder',   border: '#3b82f6' },
  { key: '2nd',   label: '2nd Reminder',   border: '#d97706' },
  { key: 'final', label: 'Final Notice',   border: '#ef4444' },
  { key: 'legal', label: 'Legal Referred', border: '#1e293b' },
];

const AGE_FILTERS = [
  { key: 'all',   label: 'All' },
  { key: '1-30',  label: '1-30d' },
  { key: '30-60', label: '30-60d' },
  { key: '60-90', label: '60-90d' },
  { key: '90+',   label: '90d+' },
];

/* Static activity feed (no backend endpoint) */
const FEED = [
  { icon: 'bi-envelope',          color: '#3b82f6', who: 'You',      action: 'Sent 2nd reminder',     sub: 'INV-2026-0412 · Kestrel Automotive',          time: 'Today 09:42' },
  { icon: 'bi-clock',             color: '#94a3b8', who: 'System',   action: 'Aging snapshot taken',  sub: '11 invoices updated · 3 newly overdue',       time: 'Today 09:15' },
  { icon: 'bi-telephone',         color: '#16a34a', who: 'D. Chen',  action: 'Phone call logged',     sub: 'Driftwood Furniture · Promise to pay May 25', time: 'Yesterday'  },
  { icon: 'bi-exclamation-octagon',color:'#ef4444', who: 'You',      action: 'Final notice sent',     sub: 'INV-2026-0412 · 42 days past due',            time: 'May 16'     },
];

/* ── Modal shell ─────────────────────────────────────────────── */
const ModalShell = ({ title, subtitle, maxWidth = 560, onClose, children }) => (
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

/* ── Send Reminder modal ─────────────────────────────────────── */
const RemindModal = ({ invoice, onClose, onDone }) => {
  const stage = getStage(daysPastDue(invoice.dueDate));
  const templates = {
    new:   `Dear ${invoice.client?.companyName || 'Client'},\n\nThis is a reminder that invoice ${invoice.invoiceNumber} for ${fmtMoney(invoice.amountDue)} is due on ${fmtDate(invoice.dueDate)}.\n\nPlease arrange payment at your earliest convenience.\n\nThank you.`,
    '1st': `Dear ${invoice.client?.companyName || 'Client'},\n\nThis is a friendly reminder that invoice ${invoice.invoiceNumber} for ${fmtMoney(invoice.amountDue)} was due on ${fmtDate(invoice.dueDate)}.\n\nPlease arrange payment at your earliest convenience.\n\nThank you.`,
    '2nd': `Dear ${invoice.client?.companyName || 'Client'},\n\nDespite our earlier reminder, invoice ${invoice.invoiceNumber} for ${fmtMoney(invoice.amountDue)} remains unpaid.\n\nThis matter has been escalated. Please contact us within 5 business days.\n\nRegards.`,
    final: `FORMAL DEMAND NOTICE\n\nInvoice ${invoice.invoiceNumber} for ${fmtMoney(invoice.amountDue)}, due ${fmtDate(invoice.dueDate)}, remains outstanding.\n\nFailure to settle within 7 days may result in legal proceedings.`,
    legal: `Internal Escalation\n\nInvoice: ${invoice.invoiceNumber}\nClient: ${invoice.client?.companyName}\nAmount: ${fmtMoney(invoice.amountDue)}\nDue: ${fmtDate(invoice.dueDate)}\n\nRefer to legal team for recovery.`,
  };

  const [email,   setEmail]   = useState(invoice.client?.email || '');
  const [body,    setBody]    = useState(templates[stage.key] || templates['1st']);
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [err,     setErr]     = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!email) { setErr('Email is required'); return; }
    setSending(true); setErr('');
    try {
      await invoicesApi.send(invoice._id, { email });
      setSent(true);
      setTimeout(onDone, 1200);
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Failed to send');
      setSending(false);
    }
  };

  return (
    <ModalShell title={stage.key === 'legal' ? 'Escalate to Legal' : `Send ${stage.label.charAt(0).toUpperCase() + stage.label.slice(1)}`}
      subtitle={`${invoice.invoiceNumber} · ${invoice.client?.companyName} · ${fmtMoney(invoice.amountDue)} outstanding`}
      onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {err  && <div className="jf-alert jf-alert-danger"><i className="bi bi-exclamation-circle" /> {err}</div>}
          {sent && <div className="jf-alert jf-alert-success"><i className="bi bi-check-circle" /> Sent successfully!</div>}

          <div className="jf-field">
            <label className="jf-label">Recipient Email <span className="req">*</span></label>
            <input className="jf-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={sent} />
          </div>
          <div className="jf-field">
            <label className="jf-label">Message</label>
            <textarea className="jf-input" rows={8} value={body} onChange={(e) => setBody(e.target.value)} disabled={sent}
              style={{ resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="sd-btn sd-btn-primary" disabled={sending || sent}>
              {sending ? 'Sending…' : sent ? 'Sent!' : <><i className="bi bi-send" /> Send</>}
            </button>
            <button type="button" className="sd-btn" onClick={onClose} disabled={sending}>Cancel</button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
};

/* ── Log Call modal ──────────────────────────────────────────── */
const LogCallModal = ({ invoice, onClose }) => {
  const [notes,   setNotes]   = useState('');
  const [promise, setPromise] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => { setSaved(true); setTimeout(onClose, 1000); }, 600);
  };

  return (
    <ModalShell title="Log Phone Call" subtitle={`${invoice.invoiceNumber} · ${invoice.client?.companyName}`} maxWidth={480} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {saved && <div className="jf-alert jf-alert-success"><i className="bi bi-check-circle" /> Call logged!</div>}

          <div className="jf-field">
            <label className="jf-label">Call Notes</label>
            <textarea className="jf-input" rows={4} placeholder="What was discussed…"
              value={notes} onChange={(e) => setNotes(e.target.value)} disabled={saved}
              style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }} />
          </div>
          <div className="jf-field">
            <label className="jf-label">Promise to Pay By</label>
            <input className="jf-input" type="date" value={promise} onChange={(e) => setPromise(e.target.value)} disabled={saved} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="sd-btn sd-btn-primary" disabled={saving || saved}>
              {saving ? 'Logging…' : <><i className="bi bi-telephone-inbound" /> Log Call</>}
            </button>
            <button type="button" className="sd-btn" onClick={onClose} disabled={saving}>Cancel</button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
};

/* ── Bulk Remind modal ───────────────────────────────────────── */
const BulkRemindModal = ({ invoices, onClose, onDone }) => {
  const overdues = invoices.filter((i) => i.dpd > 0);
  const [selected,  setSelected]  = useState(() => new Set(overdues.map((i) => i._id)));
  const [sending,   setSending]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [done,      setDone]      = useState(false);
  const [err,       setErr]       = useState('');

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const sendAll = async () => {
    const batch = overdues.filter((i) => selected.has(i._id) && i.client?.email);
    if (!batch.length) { setErr('No invoices with client emails selected'); return; }
    setSending(true); setErr('');
    let sent = 0;
    for (const inv of batch) {
      try { await invoicesApi.send(inv._id, { email: inv.client.email }); } catch (_) {}
      setProgress(Math.round((++sent / batch.length) * 100));
    }
    setDone(true);
    setTimeout(onDone, 1500);
  };

  return (
    <ModalShell title="Bulk Reminders" subtitle={`${selected.size} invoice${selected.size !== 1 ? 's' : ''} selected`} onClose={onClose}>
      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {err  && <div className="jf-alert jf-alert-danger"><i className="bi bi-exclamation-circle" /> {err}</div>}
        {done && <div className="jf-alert jf-alert-success"><i className="bi bi-check-circle" /> All reminders sent!</div>}

        {overdues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>No overdue invoices</div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Select overdue invoices to remind:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {overdues.map((inv) => (
                <label key={inv._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--hairline)', background: selected.has(inv._id) ? 'color-mix(in oklch, var(--brand) 5%, var(--surface))' : 'var(--surface)', cursor: 'pointer', transition: 'all .15s' }}>
                  <input type="checkbox" checked={selected.has(inv._id)} onChange={() => toggle(inv._id)} disabled={sending || done} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{inv.client?.companyName || '—'}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{inv.invoiceNumber} · {fmtMoney(inv.amountDue)} · {inv.dpd}d late</div>
                  </div>
                  {!inv.client?.email && <span style={{ fontSize: 11, color: '#dc2626' }}>no email</span>}
                </label>
              ))}
            </div>
            {sending && !done && (
              <div>
                <div className="inv-pay-bar"><div className="inv-pay-bar-fill" style={{ width: `${progress}%`, background: 'var(--brand)' }} /></div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Sending… {progress}%</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="sd-btn sd-btn-primary" onClick={sendAll} disabled={sending || done || !selected.size}>
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

/* ── Escalate Selected modal ─────────────────────────────────── */
const EscalateModal = ({ invoices, onClose }) => {
  const targets = invoices.filter((i) => i.dpd > 0);
  const [done, setDone] = useState(false);

  return (
    <ModalShell title="Escalate Selected" subtitle={`${targets.length} invoice${targets.length !== 1 ? 's' : ''} eligible for escalation`} onClose={onClose}>
      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {done && <div className="jf-alert jf-alert-success"><i className="bi bi-check-circle" /> Escalation logged!</div>}
        {targets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>No overdue invoices to escalate</div>
        ) : (
          <>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>The following invoices will be escalated to the next stage:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
              {targets.map((inv) => {
                const nextStage = getStage(Math.min(inv.dpd + 7, 35));
                return (
                  <div key={inv._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--hairline)', background: 'var(--surface)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{inv.client?.companyName || '—'}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }}>{inv.invoiceNumber} · {fmtMoney(inv.amountDue)}</div>
                    </div>
                    <span style={{ background: nextStage.bg, color: nextStage.color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99 }}>
                      {nextStage.label} →
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="sd-btn sd-btn-primary" style={{ background: '#dc2626', borderColor: '#dc2626' }}
                onClick={() => { setDone(true); setTimeout(onClose, 1200); }}>
                <i className="bi bi-megaphone" /> Confirm Escalation
              </button>
              <button className="sd-btn" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
};

/* ── Collections page ────────────────────────────────────────── */
const Collections = () => {
  const [invoices,    setInvoices]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [ageFilter,   setAgeFilter]   = useState('all');
  const [selected,    setSelected]    = useState(new Set());
  const [bulkRemind,  setBulkRemind]  = useState(false);
  const [escalate,    setEscalate]    = useState(false);
  const [reminding,   setReminding]   = useState(null);
  const [calling,     setCalling]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoicesApi.list({ type: 'ar', limit: 200 });
      setInvoices((res.items || []).filter((i) => (i.amountDue || 0) > 0));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Augment with dpd + stage */
  const augmented = useMemo(() =>
    invoices.map((inv) => {
      const dpd = daysPastDue(inv.dueDate);
      return { ...inv, dpd, stage: getStage(dpd) };
    }),
  [invoices]);

  /* Stage funnel counts */
  const stageCounts = useMemo(() => {
    const acc = { '1st': { count: 0, total: 0 }, '2nd': { count: 0, total: 0 }, final: { count: 0, total: 0 }, legal: { count: 0, total: 0 } };
    for (const inv of augmented) {
      const k = inv.stage.key;
      if (acc[k]) { acc[k].count++; acc[k].total += inv.amountDue || 0; }
    }
    return acc;
  }, [augmented]);

  /* Filtered queue */
  const filtered = useMemo(() => {
    if (ageFilter === 'all') return augmented;
    return augmented.filter(({ dpd }) => {
      if (ageFilter === '1-30')  return dpd >= 1  && dpd <= 30;
      if (ageFilter === '30-60') return dpd >= 30 && dpd <= 60;
      if (ageFilter === '60-90') return dpd >= 60 && dpd <= 90;
      if (ageFilter === '90+')   return dpd > 90;
      return true;
    });
  }, [augmented, ageFilter]);

  const overdue    = augmented.filter((i) => i.dpd > 0);
  const overdueAmt = overdue.reduce((s, i) => s + (i.amountDue || 0), 0);

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((i) => i._id)));
  };
  const toggleRow = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <div className="dashboard-loader">
          <div className="dashboard-loader-ring" />
          <i className="bi bi-alarm dashboard-loader-icon" />
        </div>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Loading collections…</span>
      </div>
    );
  }

  return (
    <div className="coll-shell">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="coll-header">
        <div className="coll-header-row">
          <div>
            <h1 className="coll-title">Collections</h1>
            <p className="coll-subtitle">
              {overdue.length} overdue invoice{overdue.length !== 1 ? 's' : ''} · {fmtMoney(overdueAmt, true)} at risk
            </p>
          </div>
          <div className="coll-header-actions">
            <button className="sd-btn" type="button" onClick={() => setBulkRemind(true)}>
              <i className="bi bi-envelope-paper" /> Bulk reminders
            </button>
            <button className="sd-btn sd-btn-primary" type="button"
              style={{ background: 'var(--brand)', borderColor: 'var(--brand)' }}
              onClick={() => setEscalate(true)}>
              <i className="bi bi-megaphone" /> Escalate Selected
            </button>
          </div>
        </div>
      </div>

      {/* ── Stage funnel cards ──────────────────────────────────── */}
      <div className="coll-stage-grid">
        {STAGE_CARDS.map((s) => {
          const d = stageCounts[s.key] || { count: 0, total: 0 };
          return (
            <div key={s.key} className="coll-stage-card" style={{ borderLeft: `3px solid ${s.border}` }}>
              <div className="coll-stage-label">{s.label}</div>
              <div className="coll-stage-count">{d.count}</div>
              <div className="coll-stage-foot">
                <span className="coll-stage-amt">{fmtMoney(d.total, true)}</span>
                <span className="coll-stage-risk"> · at risk</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Recent Activity ─────────────────────────────────────── */}
      <div className="coll-section">
        <div className="ar-card">
          <div className="ar-card-header">
            <span className="ar-card-title">Recent Activity</span>
            <span className="ar-card-link">View all →</span>
          </div>
          <div>
            {FEED.map((a, i) => (
              <div key={i} className="coll-feed-row" style={{ borderBottom: i < FEED.length - 1 ? '1px solid var(--hairline)' : 'none' }}>
                <div className="coll-feed-icon" style={{ background: a.color + '18', color: a.color }}>
                  <i className={`bi ${a.icon}`} />
                </div>
                <div className="coll-feed-body">
                  <div className="coll-feed-title">
                    <span style={{ fontWeight: 700 }}>{a.who}</span> · {a.action}
                  </div>
                  <div className="coll-feed-sub">{a.sub}</div>
                </div>
                <div className="coll-feed-time">{a.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Collection Queue ────────────────────────────────────── */}
      <div className="coll-section" style={{ paddingBottom: 40 }}>
        <div className="ar-card ar-card-flush">
          <div className="coll-queue-header">
            <span className="ar-card-title">Collection Queue</span>
            <div className="coll-age-chips">
              {AGE_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`coll-age-chip${ageFilter === f.key ? ' active' : ''}`}
                  onClick={() => setAgeFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="coll-tbl">
              <thead>
                <tr>
                  <th style={{ width: 36, paddingRight: 0 }}>
                    <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll} />
                  </th>
                  <th style={{ width: 160 }}>Invoice</th>
                  <th>Client</th>
                  <th style={{ width: 110 }}>Days Late</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Balance</th>
                  <th style={{ width: 130 }}>Last Contact</th>
                  <th style={{ width: 130 }}>Stage</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
                      <i className="bi bi-check-circle" style={{ fontSize: 30, display: 'block', opacity: 0.2, marginBottom: 10 }} />
                      No invoices in this bucket
                    </td>
                  </tr>
                ) : filtered.map((inv) => (
                  <tr key={inv._id} className="coll-tbl-row">
                    <td style={{ paddingRight: 0 }}>
                      <input type="checkbox" checked={selected.has(inv._id)} onChange={() => toggleRow(inv._id)} />
                    </td>

                    <td>
                      <span className="inv-num">{inv.invoiceNumber}</span>
                    </td>

                    <td style={{ fontWeight: 600, fontSize: 13.5 }}>
                      {inv.client?.companyName || '—'}
                    </td>

                    <td>
                      {inv.dpd > 0
                        ? <span className="coll-days-late" style={{ color: inv.dpd > 30 ? '#dc2626' : inv.dpd > 14 ? '#d97706' : 'var(--ink)' }}>{inv.dpd}d</span>
                        : <span style={{ fontSize: 12, color: 'var(--muted)' }}>Not yet due</span>}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 14 }}>
                        {fmtMoney(inv.amountDue)}
                      </span>
                    </td>

                    <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                      {inv.dpd > 0 ? '3 days ago' : '—'}
                    </td>

                    <td>
                      <span className="coll-stage-pill"
                        style={{ background: inv.stage.bg, color: inv.stage.color }}>
                        {inv.stage.label}
                      </span>
                    </td>

                    <td>
                      <div className="coll-row-actions">
                        <button className="coll-icon-btn" title="Send reminder" onClick={() => setReminding(inv)}>
                          <i className="bi bi-envelope" />
                        </button>
                        <button className="coll-icon-btn" title="Log call" onClick={() => setCalling(inv)}>
                          <i className="bi bi-telephone" />
                        </button>
                        <button className="coll-icon-btn" title="More actions">
                          <i className="bi bi-three-dots" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      {calling && (
        <LogCallModal
          invoice={calling}
          onClose={() => setCalling(null)}
        />
      )}

      {bulkRemind && (
        <BulkRemindModal
          invoices={augmented}
          onClose={() => setBulkRemind(false)}
          onDone={() => { setBulkRemind(false); load(); }}
        />
      )}

      {escalate && (
        <EscalateModal
          invoices={augmented}
          onClose={() => setEscalate(false)}
        />
      )}

    </div>
  );
};

export default Collections;
