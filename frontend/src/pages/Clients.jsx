import { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Row, Col, Form, Modal } from 'react-bootstrap';
import { clientsApi } from '../api';

/* ── Formatters ──────────────────────────────────────────────────── */
const fmtMoney = (v, c = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v || 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const fmtK = (v) => {
  const abs = Math.abs(v || 0);
  if (abs >= 1_000_000) return '$' + (abs / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000)     return '$' + Math.round(abs / 1000) + 'k';
  return '$' + abs;
};

/* ── Config ──────────────────────────────────────────────────────── */
const TYPE_COLOR = {
  shipper:   '#1a56db', consignee: '#059669', agent:   '#7c3aed',
  broker:    '#d97706', vendor:    '#dc2626', other:   '#6c757d',
  carrier:   '#0891b2', trucker:   '#6b7280', both:    '#FF7A45',
};

const STATUS_BADGE = {
  active:    { bg: '#dcfce7', color: '#16a34a' },
  priority:  { bg: '#FFEFE8', color: '#FF7A45' },
  review:    { bg: '#fef9c3', color: '#ca8a04' },
  inactive:  { bg: '#f3f4f6', color: '#6b7280' },
  suspended: { bg: '#fee2e2', color: '#dc2626' },
};

const AVATAR_PAL = [
  { bg: '#FFEFE8', fg: '#FF7A45' },
  { bg: '#EDE9FE', fg: '#7C3AED' },
  { bg: '#DBEAFE', fg: '#1D4ED8' },
  { bg: '#DCFCE7', fg: '#16A34A' },
  { bg: '#FEF9C3', fg: '#CA8A04' },
  { bg: '#FEE2E2', fg: '#DC2626' },
  { bg: '#E0F2FE', fg: '#0891B2' },
];

const avatarPal = (name = '') => AVATAR_PAL[(name.charCodeAt(0) || 0) % AVATAR_PAL.length];
const barColor  = (pct) => pct > 100 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#10b981';

const initials = (name) =>
  (name || '?').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const STATUS_FILTER_CHIPS = [
  { key: 'all',      label: 'All' },
  { key: 'active',   label: 'Active' },
  { key: 'priority', label: 'Priority' },
  { key: 'review',   label: 'Review' },
];

const CLIENT_TYPE_OPTIONS = [
  { value: 'shipper',   label: 'Shipper',   icon: 'bi-box-seam' },
  { value: 'consignee', label: 'Consignee', icon: 'bi-building-down' },
  { value: 'agent',     label: 'Agent',     icon: 'bi-person-badge' },
  { value: 'vendor',    label: 'Vendor',    icon: 'bi-shop' },
  { value: 'broker',    label: 'Broker',    icon: 'bi-briefcase' },
  { value: 'both',      label: 'Both',      icon: 'bi-arrow-left-right' },
  { value: 'carrier',   label: 'Carrier',   icon: 'bi-truck' },
  { value: 'trucker',   label: 'Trucker',   icon: 'bi-truck-flatbed' },
];

const EMPTY_CLIENT = { companyName: '', clientCode: '', type: 'both', email: '', phone: '', country: '', status: 'active' };

const fieldStyle = {
  fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--hairline)',
  borderRadius: 8, padding: '8px 10px', width: '100%', outline: 'none', color: 'var(--ink)', fontFamily: 'inherit', boxSizing: 'border-box',
};

/* ── New Client Modal (inline, no Bootstrap) ─────────────────────── */
const NewClientModal = ({ onHide, onCreated }) => {
  const [form,       setForm]       = useState(EMPTY_CLIENT);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const payload = { ...form };
      if (form.country) { payload.primaryAddress = [{ country: form.country, isPrimary: true }]; }
      delete payload.country;
      const res = await clientsApi.create(payload);
      onCreated(res.client || res);
      setForm(EMPTY_CLIENT);
      onHide();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create client');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, boxShadow: '0 24px 80px rgba(0,0,0,0.22)', width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--hairline)', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em', color: 'var(--ink)' }}>New Client</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>Add a new company to your client directory</div>
          </div>
          <button onClick={onHide} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ fontSize: 12, color: '#dc2626', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px' }}>
              <i className="bi bi-exclamation-circle me-2"></i>{error}
            </div>
          )}

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 5 }}>
              Company Name <span style={{ color: '#ef4444' }}>*</span>
            </div>
            <input style={fieldStyle} value={form.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="e.g. ACME Logistics Ltd" required />
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 5 }}>
              Client Code <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.65 }}>— leave blank to auto-generate</span>
            </div>
            <input style={{ ...fieldStyle, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}
              value={form.clientCode} onChange={(e) => set('clientCode', e.target.value.toUpperCase())} placeholder="ACM001" maxLength={20} />
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 8 }}>Client Type</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {CLIENT_TYPE_OPTIONS.map((t) => {
                const active = form.type === t.value;
                return (
                  <button key={t.value} type="button" onClick={() => set('type', t.value)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: active ? '1.5px solid var(--brand)' : '1.5px solid var(--hairline)', background: active ? '#FFEFE8' : 'var(--surface-2)', color: active ? 'var(--brand)' : 'var(--muted)', transition: 'all 0.12s' }}>
                    <i className={`bi ${t.icon}`} style={{ fontSize: 12 }}></i>{t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 5 }}>Country</div>
            <input style={fieldStyle} value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="e.g. United Arab Emirates" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 5 }}>Email</div>
              <input style={fieldStyle} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="ops@company.com" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 5 }}>Phone</div>
              <input style={fieldStyle} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+971 4 000 0000" />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button type="button" className="ss-action-btn" onClick={onHide} disabled={submitting}>Cancel</button>
          <button type="submit" form="" className="ss-action-btn ss-action-btn-primary" disabled={submitting} onClick={handleSubmit}>
            {submitting
              ? <><span className="spinner-border spinner-border-sm me-2" style={{ width: 12, height: 12, borderWidth: 2 }}></span>Creating…</>
              : <><i className="bi bi-plus-lg me-2"></i>Create Client</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── ClientsList ─────────────────────────────────────────────────── */
export const ClientsList = () => {
  const [clients,      setClients]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode,     setViewMode]     = useState('card');
  const [showNew,      setShowNew]      = useState(false);
  const [searchParams]                  = useSearchParams();

  useEffect(() => {
    if (searchParams.get('new') === '1') setShowNew(true);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = {};
        if (search.trim()) params.search = search.trim();
        const { items } = await clientsApi.list(params);
        if (!cancelled) setClients(items);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [search]);

  const handleCreated = (c) => { if (c?._id) setClients((prev) => [c, ...prev]); };

  const counts = useMemo(() => ({
    all:      clients.length,
    active:   clients.filter((c) => c.status === 'active').length,
    priority: clients.filter((c) => c.status === 'priority').length,
    review:   clients.filter((c) => c.status === 'review').length,
  }), [clients]);

  const displayed = useMemo(() =>
    statusFilter === 'all' ? clients : clients.filter((c) => c.status === statusFilter),
  [clients, statusFilter]);

  const totalRevenue = useMemo(() =>
    clients.reduce((s, c) => s + (c.revenue || 0), 0),
  [clients]);

  return (
    <div className="cl-shell">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="cl-header">
        <div>
          <h1 className="cl-title">Clients</h1>
          <div className="cl-subtitle">
            {clients.length} active clients{totalRevenue > 0 ? ` · ${fmtK(totalRevenue)} YTD revenue` : ''}
          </div>
        </div>
        <div className="cl-header-actions">
          <div className="cl-view-toggle">
            <button className={`cl-view-btn${viewMode === 'card' ? ' active' : ''}`} onClick={() => setViewMode('card')} title="Card view">
              <i className="bi bi-grid-3x3-gap"></i>
            </button>
            <button className={`cl-view-btn${viewMode === 'table' ? ' active' : ''}`} onClick={() => setViewMode('table')} title="Table view">
              <i className="bi bi-list-ul"></i>
            </button>
          </div>
          <button className="ss-action-btn" onClick={() => {}}>
            <i className="bi bi-download me-1"></i>Export
          </button>
          <button className="ss-action-btn ss-action-btn-primary" onClick={() => setShowNew(true)}>
            <i className="bi bi-plus-lg me-1"></i>New Client
          </button>
        </div>
      </div>

      {/* ── Filter row ─────────────────────────────────────────── */}
      <div className="cl-filter-row">
        {STATUS_FILTER_CHIPS.map((f) => (
          <button
            key={f.key}
            className={`cl-filter-chip${statusFilter === f.key ? ' active' : ''}`}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
            <span className="cl-chip-count">{counts[f.key] ?? 0}</span>
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <div className="cl-search-wrap">
            <i className="bi bi-search" style={{ fontSize: 13, color: 'var(--muted)' }}></i>
            <input
              placeholder="Client, code, industry…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      {loading ? (
        <div className="ss-loading" style={{ minHeight: 300 }}>
          <div className="dashboard-loader">
            <div className="dashboard-loader-ring"></div>
            <i className="bi bi-building dashboard-loader-icon"></i>
          </div>
          <span>Loading clients…</span>
        </div>
      ) : displayed.length === 0 ? (
        <div className="cl-empty">
          <i className="bi bi-building" style={{ fontSize: 40, opacity: 0.18 }}></i>
          <span style={{ fontSize: 14, fontWeight: 600 }}>No clients found</span>
          {statusFilter === 'all' && search === '' && (
            <button className="ss-action-btn ss-action-btn-primary" onClick={() => setShowNew(true)}>
              <i className="bi bi-plus-lg me-2"></i>Add First Client
            </button>
          )}
        </div>
      ) : viewMode === 'card' ? (
        <div className="cl-grid">
          {displayed.map((c) => {
            const pal  = avatarPal(c.companyName);
            const sb   = STATUS_BADGE[c.status] || STATUS_BADGE.inactive;
            const country    = c.primaryAddress?.country || c.addresses?.[0]?.country || '';
            const meta = [c.clientCode, country, c.industry].filter(Boolean).join(' · ');
            const creditLimit = c.creditLimit || 0;
            const revenue     = c.revenue || 0;
            const margin      = c.margin || null;
            const used        = c.creditUsed || 0;
            const creditPct   = creditLimit > 0 ? Math.min((used / creditLimit) * 100, 120) : 0;

            return (
              <Link key={c._id} to={`/clients/${c._id}`} className="cl-card">
                {/* Top */}
                <div className="cl-card-top">
                  <div className="cl-avatar" style={{ background: pal.bg, color: pal.fg }}>
                    {initials(c.companyName)}
                  </div>
                  <div className="cl-card-info">
                    <div className="cl-card-name">{c.companyName}</div>
                    <div className="cl-card-meta">{meta}</div>
                  </div>
                  <span className="cl-status-badge" style={{ background: sb.bg, color: sb.color }}>
                    {c.status}
                  </span>
                </div>

                {/* Stats: Revenue + Margin */}
                <div className="cl-stats-row">
                  <div>
                    <div className="cl-stat-label">Revenue YTD</div>
                    <div className="cl-stat-value brand">
                      {revenue > 0 ? fmtK(revenue) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="cl-stat-label">Margin</div>
                    <div className="cl-stat-value success">
                      {margin !== null ? margin.toFixed(1) + '%' : '—'}
                    </div>
                  </div>
                </div>

                {/* Credit utilization */}
                <div className="cl-credit-label-row">
                  <span>Credit utilization</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                    {used > 0 ? `${fmtK(used)} / ${fmtK(creditLimit)}` : creditLimit > 0 ? fmtK(creditLimit) : '—'}
                  </span>
                </div>
                <div className="cl-credit-bar-track">
                  <div
                    className="cl-credit-bar-fill"
                    style={{ width: creditPct + '%', background: barColor(creditPct) }}
                  ></div>
                </div>

                {/* Footer */}
                <div className="cl-card-footer">
                  <span className="cl-card-ships">
                    {c.totalShipments != null ? `${c.totalShipments} shipments YTD` : c.type}
                  </span>
                  <i className="bi bi-arrow-right" style={{ color: 'var(--muted)', fontSize: 13 }}></i>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* Table view */
        <div className="cl-table-wrap">
          <table className="cl-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Industry</th>
                <th>Country</th>
                <th>Status</th>
                <th>Credit Limit</th>
                <th>Email</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((c) => {
                const pal = avatarPal(c.companyName);
                const sb  = STATUS_BADGE[c.status] || STATUS_BADGE.inactive;
                return (
                  <tr key={c._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: pal.bg, color: pal.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                          {initials(c.companyName)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{c.companyName}</div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--muted)' }}>{c.clientCode}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--muted)' }}>{c.industry || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted)' }}>{c.primaryAddress?.country || '—'}</td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, background: sb.bg, color: sb.color, padding: '3px 9px', borderRadius: 99 }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
                      {c.creditLimit > 0 ? fmtK(c.creditLimit) : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{c.email || '—'}</td>
                    <td>
                      <Link to={`/clients/${c._id}`} style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        360 View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <NewClientModal onHide={() => setShowNew(false)} onCreated={handleCreated} />}
    </div>
  );
};

/* ── Edit Client Modal (unchanged — uses Bootstrap) ──────────────── */
const FieldLabel = ({ children, hint }) => (
  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--bs-secondary-color)', marginBottom: 6, letterSpacing: '0.02em', display: 'flex', alignItems: 'baseline', gap: 6 }}>
    {children}
    {hint && <span style={{ fontSize: 10.5, fontWeight: 400, opacity: 0.65 }}>{hint}</span>}
  </div>
);

const bsFieldStyle = {
  fontSize: 13.5, background: 'var(--surface-2)',
  border: '1.5px solid var(--border-soft)', borderRadius: 8,
};

const EditClientModal = ({ client, show, onHide, onSaved }) => {
  const [form, setForm] = useState({
    companyName: client.companyName || '',
    type:        client.type || 'both',
    email:       client.email || '',
    phone:       client.phone || '',
    country:     client.primaryAddress?.country || '',
    status:      client.status || 'active',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const payload = { ...form };
      if (form.country) { payload.addresses = [{ country: form.country, isPrimary: true }]; }
      delete payload.country;
      const res = await clientsApi.update(client._id, payload);
      onSaved(res.client || res);
      onHide();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update client');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="md">
      <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16.5, letterSpacing: '-0.01em' }}>Edit Client</div>
          <div style={{ fontSize: 13, color: 'var(--bs-secondary-color)', marginTop: 3, fontFamily: 'monospace' }}>{client.clientCode}</div>
        </div>
        <button type="button" onClick={onHide} style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--bs-secondary-color)', cursor: 'pointer', padding: '3px 4px', lineHeight: 1, marginTop: 2 }}>
          <i className="bi bi-x-lg"></i>
        </button>
      </div>
      <Form onSubmit={handleSubmit}>
        <Modal.Body style={{ padding: '20px 24px' }}>
          {error && (
            <div style={{ fontSize: 12.5, color: '#dc2626', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
              <i className="bi bi-exclamation-circle me-2"></i>{error}
            </div>
          )}
          <Row className="g-3">
            <Col md={8}>
              <FieldLabel>Company Name <span style={{ color: '#ef4444' }}>*</span></FieldLabel>
              <Form.Control value={form.companyName} onChange={(e) => set('companyName', e.target.value)} required style={bsFieldStyle} />
            </Col>
            <Col md={4}>
              <FieldLabel>Status</FieldLabel>
              <Form.Select value={form.status} onChange={(e) => set('status', e.target.value)} style={bsFieldStyle}>
                <option value="active">Active</option>
                <option value="priority">Priority</option>
                <option value="review">Review</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </Form.Select>
            </Col>
            <Col xs={12}>
              <FieldLabel>Client Type</FieldLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {CLIENT_TYPE_OPTIONS.map((t) => {
                  const active = form.type === t.value;
                  return (
                    <button key={t.value} type="button" onClick={() => set('type', t.value)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: active ? '1.5px solid var(--brand)' : '1.5px solid var(--border-soft)', background: active ? 'color-mix(in srgb, var(--brand) 8%, var(--surface-2))' : 'var(--surface-2)', color: active ? 'var(--brand)' : 'var(--bs-secondary-color)', transition: 'all 0.12s' }}>
                      <i className={`bi ${t.icon}`} style={{ fontSize: 12 }}></i>{t.label}
                    </button>
                  );
                })}
              </div>
            </Col>
            <Col xs={12}>
              <FieldLabel>Country</FieldLabel>
              <Form.Control value={form.country} onChange={(e) => set('country', e.target.value)} style={bsFieldStyle} />
            </Col>
            <Col md={6}>
              <FieldLabel>Email</FieldLabel>
              <Form.Control type="email" value={form.email} onChange={(e) => set('email', e.target.value)} style={bsFieldStyle} />
            </Col>
            <Col md={6}>
              <FieldLabel>Phone</FieldLabel>
              <Form.Control value={form.phone} onChange={(e) => set('phone', e.target.value)} style={bsFieldStyle} />
            </Col>
          </Row>
        </Modal.Body>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="ss-action-btn" onClick={onHide} disabled={submitting}>Cancel</button>
          <button type="submit" className="ss-action-btn ss-action-btn-primary" disabled={submitting}>
            {submitting
              ? <><span className="spinner-border spinner-border-sm me-2" style={{ width: 12, height: 12, borderWidth: 2 }}></span>Saving…</>
              : <><i className="bi bi-check-lg me-2"></i>Save Changes</>}
          </button>
        </div>
      </Form>
    </Modal>
  );
};

/* ── Client 360 (unchanged) ──────────────────────────────────────── */
export const Client360 = () => {
  const { id }             = useParams();
  const [data,         setData]        = useState(null);
  const [loading,      setLoading]     = useState(true);
  const [showEdit,     setShowEdit]    = useState(false);
  const [localClient,  setLocalClient] = useState(null);

  useEffect(() => {
    (async () => {
      const d = await clientsApi.get360(id);
      setData(d);
      setLoading(false);
    })();
  }, [id]);

  if (loading || !data) {
    return (
      <div className="ss-loading" style={{ minHeight: 400 }}>
        <div className="dashboard-loader">
          <div className="dashboard-loader-ring"></div>
          <i className="bi bi-building dashboard-loader-icon"></i>
        </div>
        <span>Loading client profile…</span>
      </div>
    );
  }

  const displayClient = localClient || data?.client;
  const { stats, recentShipments, openInvoices, activeDeals } = data;
  const client    = displayClient;
  const typeColor = TYPE_COLOR[client.type] || '#6c757d';
  const sc        = STATUS_BADGE[client.status] || { bg: '#f3f4f6', color: '#6b7280' };

  return (
    <div>
      <div className="mb-3">
        <Link to="/clients" style={{ fontSize: 13, textDecoration: 'none', color: 'var(--brand)' }}>
          <i className="bi bi-arrow-left me-1"></i>All Clients
        </Link>
      </div>

      {/* ── Identity card ─────────────────────────────────────── */}
      <div className="erp-card mb-4">
        <div className="erp-card-body">
          <div className="d-flex align-items-start gap-3 flex-wrap">
            <div className="client-avatar" style={{ background: typeColor, width: 56, height: 56, fontSize: 20 }}>
              {initials(client.companyName)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                <h4 className="mb-0" style={{ fontWeight: 800 }}>{client.companyName}</h4>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--bs-secondary-color)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 6 }}>
                  {client.clientCode}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: 20 }}>
                  {client.status}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: typeColor, background: `${typeColor}15`, padding: '2px 8px', borderRadius: 20 }}>
                  {client.type}
                </span>
              </div>
              <div className="d-flex gap-3 flex-wrap" style={{ fontSize: 13, color: 'var(--bs-secondary-color)' }}>
                {client.email && <span><i className="bi bi-envelope me-1"></i>{client.email}</span>}
                {client.phone && <span><i className="bi bi-telephone me-1"></i>{client.phone}</span>}
                {client.primaryAddress?.country && <span><i className="bi bi-geo-alt me-1"></i>{client.primaryAddress.country}</span>}
              </div>
            </div>
            <button className="ss-action-btn" onClick={() => setShowEdit(true)}>
              <i className="bi bi-pencil me-2"></i>Edit
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────── */}
      <div className="inv-summary-strip mb-4">
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Total Shipments</div>
          <div className="inv-summary-value">{stats.totalShipments || 0}</div>
          <div className="inv-summary-sub">all time</div>
        </div>
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Total Revenue</div>
          <div className="inv-summary-value" style={{ color: '#16a34a' }}>{fmtMoney(stats.totalRevenue)}</div>
          <div className="inv-summary-sub">lifetime value</div>
        </div>
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Outstanding AR</div>
          <div className="inv-summary-value" style={{ color: stats.outstandingAR > 0 ? '#d97706' : 'var(--bs-body-color)' }}>
            {fmtMoney(stats.outstandingAR)}
          </div>
          <div className="inv-summary-sub">unpaid invoices</div>
        </div>
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Active Deals</div>
          <div className="inv-summary-value">{stats.activeDealCount || 0}</div>
          <div className="inv-summary-sub">in pipeline</div>
        </div>
      </div>

      {/* ── Panels ───────────────────────────────────────────── */}
      <Row className="g-3">
        <Col lg={6}>
          <div className="erp-card">
            <div className="erp-card-header">
              <span className="erp-card-title"><i className="bi bi-boxes me-2 opacity-50"></i>Recent Shipments</span>
            </div>
            {recentShipments.length === 0 ? (
              <div className="dash-empty-state" style={{ padding: '32px 20px' }}>
                <i className="bi bi-boxes" style={{ opacity: 0.2 }}></i>
                <span>No shipments yet</span>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="erp-table">
                  <thead>
                    <tr><th>Job #</th><th>Lane</th><th>Status</th><th className="text-end">Revenue</th></tr>
                  </thead>
                  <tbody>
                    {recentShipments.map((s) => (
                      <tr key={s._id}>
                        <td>
                          <Link to={`/shipments/${s._id}`} style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--brand)', textDecoration: 'none' }}>
                            {s.shipmentNumber}
                          </Link>
                        </td>
                        <td style={{ fontSize: 12 }}>{s.portOfLoading?.code || '—'} → {s.portOfDischarge?.code || '—'}</td>
                        <td>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#0891b2', background: '#e0f2fe', padding: '2px 7px', borderRadius: 10, textTransform: 'uppercase' }}>
                            {s.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="text-end" style={{ fontSize: 12, fontWeight: 600 }}>{fmtMoney(s.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Col>

        <Col lg={6}>
          <div className="erp-card">
            <div className="erp-card-header">
              <span className="erp-card-title"><i className="bi bi-receipt me-2 opacity-50"></i>Open Invoices</span>
              {openInvoices.length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#d97706' }}>
                  {fmtMoney(openInvoices.reduce((s, i) => s + (i.amountDue || 0), 0))} outstanding
                </span>
              )}
            </div>
            {openInvoices.length === 0 ? (
              <div className="dash-empty-state" style={{ padding: '32px 20px' }}>
                <i className="bi bi-check-circle" style={{ color: '#16a34a', opacity: 0.5 }}></i>
                <span>All invoices cleared</span>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="erp-table">
                  <thead>
                    <tr><th>Invoice</th><th>Due</th><th>Status</th><th className="text-end">Balance</th></tr>
                  </thead>
                  <tbody>
                    {openInvoices.map((inv) => (
                      <tr key={inv._id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{inv.invoiceNumber}</td>
                        <td style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>{fmtDate(inv.dueDate)}</td>
                        <td>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: inv.status === 'overdue' ? '#fee2e2' : '#fef9c3', color: inv.status === 'overdue' ? '#dc2626' : '#d97706' }}>
                            {inv.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="text-end" style={{ fontWeight: 700, fontSize: 13, color: '#d97706' }}>{fmtMoney(inv.amountDue, inv.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Col>

        {activeDeals.length > 0 && (
          <Col xs={12}>
            <div className="erp-card">
              <div className="erp-card-header">
                <span className="erp-card-title"><i className="bi bi-kanban me-2 opacity-50"></i>Active Deals</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="erp-table">
                  <thead>
                    <tr><th>Code</th><th>Title</th><th>Stage</th><th>Close Date</th><th className="text-end">Value</th></tr>
                  </thead>
                  <tbody>
                    {activeDeals.map((d) => (
                      <tr key={d._id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--brand)' }}>{d.dealCode}</td>
                        <td style={{ fontSize: 13 }}>{d.title}</td>
                        <td>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#0891b2', background: '#e0f2fe', padding: '2px 7px', borderRadius: 10 }}>{d.stage}</span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>{fmtDate(d.expectedCloseDate)}</td>
                        <td className="text-end" style={{ fontWeight: 700, fontSize: 13, color: '#16a34a' }}>{fmtMoney(d.estimatedValue, d.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Col>
        )}
      </Row>

      {showEdit && (
        <EditClientModal client={client} show={showEdit} onHide={() => setShowEdit(false)} onSaved={(u) => setLocalClient(u)} />
      )}
    </div>
  );
};

export default ClientsList;
