import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Row, Col, InputGroup, Form, Modal, Alert } from 'react-bootstrap';
import { clientsApi } from '../api';

/* ── Formatters ──────────────────────────────────────────────── */
const fmtMoney = (v, c = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v || 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

/* ── Type config ─────────────────────────────────────────────── */
const TYPE_COLOR = {
  shipper:    '#1a56db', consignee: '#059669', agent: '#7c3aed',
  broker:     '#d97706', vendor:    '#dc2626', other: '#6c757d',
};

const STATUS_CONFIG = {
  active:   { label: 'Active',   color: '#16a34a', bg: '#dcfce7' },
  inactive: { label: 'Inactive', color: '#6c757d', bg: '#f3f4f6' },
  suspended:{ label: 'Suspended',color: '#dc2626', bg: '#fee2e2' },
};

const TYPE_FILTERS = [
  { key: '',           label: 'All Types' },
  { key: 'shipper',    label: 'Shipper' },
  { key: 'consignee',  label: 'Consignee' },
  { key: 'agent',      label: 'Agent' },
  { key: 'broker',     label: 'Broker' },
  { key: 'vendor',     label: 'Vendor' },
];

/* ── Client avatar initials ──────────────────────────────────── */
const initials = (name) =>
  (name || '?').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/* ── New Client Modal ────────────────────────────────────────── */
const CLIENT_TYPES = ['shipper','consignee','both','agent','carrier','vendor','broker','trucker'];

const EMPTY_CLIENT = { companyName: '', clientCode: '', type: 'both', email: '', phone: '', country: '', status: 'active' };

const NewClientModal = ({ show, onHide, onCreated }) => {
  const [form,       setForm]       = useState(EMPTY_CLIENT);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        primaryAddress: form.country ? [{ country: form.country, isPrimary: true }] : undefined,
      };
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

  const Label = ({ children }) => (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--bs-secondary-color)', marginBottom: 6 }}>
      {children}
    </div>
  );

  return (
    <Modal show={show} onHide={onHide} centered size="md">
      {/* Custom header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'color-mix(in srgb, #059669 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', fontSize: 16 }}>
            <i className="bi bi-building-add"></i>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>New Client</div>
            <div style={{ fontSize: 11.5, color: 'var(--bs-secondary-color)' }}>Add a shipper, consignee, agent, or vendor</div>
          </div>
        </div>
        <button type="button" onClick={onHide} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--bs-secondary-color)', cursor: 'pointer', padding: 4, lineHeight: 1 }}>
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      <Form onSubmit={handleSubmit}>
        <Modal.Body style={{ padding: '16px 20px 20px' }}>
          {error && <Alert variant="danger" className="py-2 mb-3" style={{ fontSize: 13 }}>{error}</Alert>}

          <Row className="g-3">
            <Col md={8}>
              <Label>Company Name *</Label>
              <Form.Control
                value={form.companyName} onChange={(e) => set('companyName', e.target.value)} required
                placeholder="e.g. ACME Logistics Ltd"
                style={{ fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 }}
              />
            </Col>
            <Col md={4}>
              <Label>Client Code *</Label>
              <Form.Control
                value={form.clientCode} onChange={(e) => set('clientCode', e.target.value.toUpperCase())} required
                placeholder="e.g. ACM001" maxLength={20}
                style={{ fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8, fontFamily: 'monospace' }}
              />
            </Col>
            <Col md={6}>
              <Label>Client Type</Label>
              <Form.Select value={form.type} onChange={(e) => set('type', e.target.value)}
                style={{ fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 }}>
                {CLIENT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </Form.Select>
            </Col>
            <Col md={6}>
              <Label>Country</Label>
              <Form.Control
                value={form.country} onChange={(e) => set('country', e.target.value)}
                placeholder="e.g. United Arab Emirates"
                style={{ fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 }}
              />
            </Col>
            <Col md={6}>
              <Label>Email</Label>
              <div style={{ position: 'relative' }}>
                <i className="bi bi-envelope" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bs-secondary-color)', fontSize: 13, pointerEvents: 'none' }}></i>
                <Form.Control
                  type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                  placeholder="operations@company.com"
                  style={{ fontSize: 13, paddingLeft: 30, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 }}
                />
              </div>
            </Col>
            <Col md={6}>
              <Label>Phone</Label>
              <div style={{ position: 'relative' }}>
                <i className="bi bi-telephone" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bs-secondary-color)', fontSize: 13, pointerEvents: 'none' }}></i>
                <Form.Control
                  value={form.phone} onChange={(e) => set('phone', e.target.value)}
                  placeholder="+971 4 000 0000"
                  style={{ fontSize: 13, paddingLeft: 30, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 }}
                />
              </div>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer style={{ padding: '12px 20px', borderTop: '1px solid var(--border-soft)', gap: 8 }}>
          <button type="button" className="ss-action-btn" onClick={onHide} disabled={submitting}>Cancel</button>
          <button type="submit" className="ss-action-btn ss-action-btn-primary" disabled={submitting}>
            {submitting
              ? <><span className="spinner-border spinner-border-sm me-2" style={{ width: 12, height: 12, borderWidth: 2 }}></span>Creating…</>
              : <><i className="bi bi-plus-lg me-2"></i>Create Client</>
            }
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

/* ── ClientsList ─────────────────────────────────────────────── */
export const ClientsList = () => {
  const [clients,    setClients]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewMode,   setView]       = useState('card');
  const [showNew,    setShowNew]    = useState(false);
  const [searchParams]              = useSearchParams();

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
        if (typeFilter)    params.type   = typeFilter;
        const { items } = await clientsApi.list(params);
        if (!cancelled) setClients(items);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [search, typeFilter]);

  const handleCreated = (newClient) => {
    if (newClient?._id) setClients((prev) => [newClient, ...prev]);
  };

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="ss-page-header">
        <div className="ss-page-header-left">
          <div className="ss-page-header-icon"><i className="bi bi-building"></i></div>
          <div>
            <h4 className="ss-page-title">Clients</h4>
            <div className="ss-page-sub" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: 'var(--bs-body-color)' }}>{clients.length}</span>
              <span>total</span>
              {clients.length > 0 && (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  {Object.entries(
                    clients.reduce((acc, c) => { acc[c.type] = (acc[c.type] || 0) + 1; return acc; }, {})
                  ).slice(0, 4).map(([type, count]) => (
                    <span key={type} style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: `${TYPE_COLOR[type] || '#6c757d'}15`, color: TYPE_COLOR[type] || '#6c757d' }}>
                      {count} {type}
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <div className="view-toggle">
            <button className={`view-toggle-btn${viewMode === 'card' ? ' active' : ''}`} onClick={() => setView('card')} title="Cards">
              <i className="bi bi-grid-3x3-gap"></i>
            </button>
            <button className={`view-toggle-btn${viewMode === 'table' ? ' active' : ''}`} onClick={() => setView('table')} title="Table">
              <i className="bi bi-list-ul"></i>
            </button>
          </div>
          <InputGroup size="sm" style={{ width: 220 }}>
            <InputGroup.Text style={{ background: 'var(--surface)' }}><i className="bi bi-search"></i></InputGroup.Text>
            <Form.Control
              placeholder="Search by name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: 'var(--surface)' }}
            />
          </InputGroup>
          <button className="ss-action-btn ss-action-btn-primary" onClick={() => setShowNew(true)}>
            <i className="bi bi-plus-lg me-2"></i>New Client
          </button>
        </div>
      </div>

      {/* ── Type filter chips ─────────────────────────────── */}
      <div className="filter-chip-row mb-4">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.key}
            className={`filter-chip${typeFilter === f.key ? ' active' : ''}`}
            style={typeFilter === f.key && f.key ? { '--chip-color': TYPE_COLOR[f.key], background: TYPE_COLOR[f.key], borderColor: TYPE_COLOR[f.key] } : {}}
            onClick={() => setTypeFilter(typeFilter === f.key ? '' : f.key)}
          >
            {f.label}
            {f.key && clients.length > 0 && (
              <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 800, opacity: .7 }}>
                {clients.filter((c) => c.type === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <NewClientModal show={showNew} onHide={() => setShowNew(false)} onCreated={handleCreated} />

      {loading ? (
        <div className="ss-loading" style={{ minHeight: 300 }}>
          <div className="dashboard-loader">
            <div className="dashboard-loader-ring"></div>
            <i className="bi bi-building dashboard-loader-icon"></i>
          </div>
          <span>Loading clients…</span>
        </div>
      ) : clients.length === 0 ? (
        <div className="erp-card">
          <div className="dash-empty-state" style={{ padding: '56px 20px' }}>
            <i className="bi bi-building" style={{ fontSize: 40, opacity: 0.2 }}></i>
            <span>No clients yet</span>
            <button className="ss-action-btn ss-action-btn-primary mt-2" onClick={() => setShowNew(true)}>
              <i className="bi bi-plus-lg me-2"></i>Add First Client
            </button>
          </div>
        </div>
      ) : viewMode === 'card' ? (
        <Row className="g-3">
          {clients.map((c) => {
            const typeColor = TYPE_COLOR[c.type] || '#6c757d';
            const sc        = STATUS_CONFIG[c.status] || { label: c.status, color: '#6c757d', bg: '#f3f4f6' };
            return (
              <Col key={c._id} md={6} xl={4} xxl={3}>
                <Link to={`/clients/${c._id}`} className="client-card">
                  <div className="d-flex align-items-start gap-12 mb-3" style={{ gap: 12 }}>
                    <div className="client-avatar" style={{ background: typeColor }}>
                      {initials(c.companyName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }} className="text-truncate">
                        {c.companyName}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--bs-secondary-color)' }}>
                        {c.clientCode}
                      </div>
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        background: sc.bg,
                        color: sc.color,
                        flexShrink: 0,
                      }}
                    >
                      {sc.label}
                    </span>
                  </div>

                  <div className="d-flex flex-wrap gap-2 mb-3">
                    <span
                      className="client-type-badge"
                      style={{ background: `${typeColor}15`, color: typeColor }}
                    >
                      {c.type}
                    </span>
                    {c.primaryAddress?.country && (
                      <span
                        className="client-type-badge"
                        style={{ background: 'var(--surface-2)', color: 'var(--bs-secondary-color)' }}
                      >
                        <i className="bi bi-geo-alt me-1" style={{ fontSize: 9 }}></i>
                        {c.primaryAddress.country}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--bs-secondary-color)' }}>
                    {c.email && (
                      <span className="text-truncate">
                        <i className="bi bi-envelope me-1"></i>{c.email}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: '1px solid var(--border-soft)',
                    }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 600 }}>
                      360 View <i className="bi bi-arrow-right-short"></i>
                    </span>
                  </div>
                </Link>
              </Col>
            );
          })}
        </Row>
      ) : (
        <div className="erp-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Country</th>
                  <th>Email</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const typeColor = TYPE_COLOR[c.type] || '#6c757d';
                  const sc        = STATUS_CONFIG[c.status] || { label: c.status, color: '#6c757d', bg: '#f3f4f6' };
                  return (
                    <tr key={c._id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            style={{
                              width: 30, height: 30, borderRadius: 6,
                              background: typeColor, color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 800, flexShrink: 0,
                            }}
                          >
                            {initials(c.companyName)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{c.companyName}</div>
                            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--bs-secondary-color)' }}>{c.clientCode}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700, color: typeColor, background: `${typeColor}15`, padding: '2px 8px', borderRadius: 20 }}>
                          {c.type}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: 20 }}>
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--bs-secondary-color)' }}>{c.primaryAddress?.country || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>{c.email || '—'}</td>
                      <td>
                        <Link to={`/clients/${c._id}`} className="btn btn-sm btn-outline-primary" style={{ fontSize: 11, padding: '3px 10px' }}>
                          360 View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Edit Client Modal ───────────────────────────────────────── */
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

  const Label = ({ children }) => (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--bs-secondary-color)', marginBottom: 6 }}>
      {children}
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const payload = { ...form };
      if (form.country) {
        payload.addresses = [{ country: form.country, isPrimary: true }];
      }
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'color-mix(in srgb, #1a56db 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a56db', fontSize: 16 }}>
            <i className="bi bi-pencil-square"></i>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Edit Client</div>
            <div style={{ fontSize: 11.5, color: 'var(--bs-secondary-color)' }}>{client.clientCode}</div>
          </div>
        </div>
        <button type="button" onClick={onHide} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--bs-secondary-color)', cursor: 'pointer', padding: 4, lineHeight: 1 }}>
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      <Form onSubmit={handleSubmit}>
        <Modal.Body style={{ padding: '16px 20px 20px' }}>
          {error && <Alert variant="danger" className="py-2 mb-3" style={{ fontSize: 13 }}>{error}</Alert>}
          <Row className="g-3">
            <Col md={8}>
              <Label>Company Name *</Label>
              <Form.Control
                value={form.companyName} onChange={(e) => set('companyName', e.target.value)} required
                style={{ fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 }}
              />
            </Col>
            <Col md={4}>
              <Label>Status</Label>
              <Form.Select value={form.status} onChange={(e) => set('status', e.target.value)}
                style={{ fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 }}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </Form.Select>
            </Col>
            <Col md={6}>
              <Label>Client Type</Label>
              <Form.Select value={form.type} onChange={(e) => set('type', e.target.value)}
                style={{ fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 }}>
                {CLIENT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </Form.Select>
            </Col>
            <Col md={6}>
              <Label>Country</Label>
              <Form.Control
                value={form.country} onChange={(e) => set('country', e.target.value)}
                style={{ fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 }}
              />
            </Col>
            <Col md={6}>
              <Label>Email</Label>
              <div style={{ position: 'relative' }}>
                <i className="bi bi-envelope" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bs-secondary-color)', fontSize: 13, pointerEvents: 'none' }}></i>
                <Form.Control
                  type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                  style={{ fontSize: 13, paddingLeft: 30, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 }}
                />
              </div>
            </Col>
            <Col md={6}>
              <Label>Phone</Label>
              <div style={{ position: 'relative' }}>
                <i className="bi bi-telephone" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bs-secondary-color)', fontSize: 13, pointerEvents: 'none' }}></i>
                <Form.Control
                  value={form.phone} onChange={(e) => set('phone', e.target.value)}
                  style={{ fontSize: 13, paddingLeft: 30, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 }}
                />
              </div>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer style={{ padding: '12px 20px', borderTop: '1px solid var(--border-soft)', gap: 8 }}>
          <button type="button" className="ss-action-btn" onClick={onHide} disabled={submitting}>Cancel</button>
          <button type="submit" className="ss-action-btn ss-action-btn-primary" disabled={submitting}>
            {submitting
              ? <><span className="spinner-border spinner-border-sm me-2" style={{ width: 12, height: 12, borderWidth: 2 }}></span>Saving…</>
              : <><i className="bi bi-check-lg me-2"></i>Save Changes</>
            }
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

/* ── Client 360 ──────────────────────────────────────────────── */
export const Client360 = () => {
  const { id }            = useParams();
  const [data,        setData]       = useState(null);
  const [loading,     setLoading]    = useState(true);
  const [showEdit,    setShowEdit]   = useState(false);
  const [localClient, setLocalClient] = useState(null);

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
  const sc        = STATUS_CONFIG[client.status] || { label: client.status, color: '#6c757d', bg: '#f3f4f6' };

  return (
    <div>
      <div className="mb-3">
        <Link to="/clients" style={{ fontSize: 13, textDecoration: 'none', color: 'var(--brand)' }}>
          <i className="bi bi-arrow-left me-1"></i>All Clients
        </Link>
      </div>

      {/* ── Identity card ────────────────────────────────────── */}
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
                  {sc.label}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: typeColor, background: `${typeColor}15`, padding: '2px 8px', borderRadius: 20 }}>
                  {client.type}
                </span>
              </div>
              <div className="d-flex gap-3 flex-wrap" style={{ fontSize: 13, color: 'var(--bs-secondary-color)' }}>
                {client.email && <span><i className="bi bi-envelope me-1"></i>{client.email}</span>}
                {client.phone && <span><i className="bi bi-telephone me-1"></i>{client.phone}</span>}
                {client.primaryAddress?.country && (
                  <span><i className="bi bi-geo-alt me-1"></i>{client.primaryAddress.country}</span>
                )}
              </div>
            </div>
            <button className="ss-action-btn" onClick={() => setShowEdit(true)}>
              <i className="bi bi-pencil me-2"></i>Edit
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────── */}
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
              <span className="erp-card-title">
                <i className="bi bi-boxes me-2 opacity-50"></i>Recent Shipments
              </span>
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
                    <tr>
                      <th>Job #</th>
                      <th>Lane</th>
                      <th>Status</th>
                      <th className="text-end">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentShipments.map((s) => (
                      <tr key={s._id}>
                        <td>
                          <Link
                            to={`/shipments/${s._id}`}
                            style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--brand)', textDecoration: 'none' }}
                          >
                            {s.shipmentNumber}
                          </Link>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {s.portOfLoading?.code || '—'} → {s.portOfDischarge?.code || '—'}
                        </td>
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
              <span className="erp-card-title">
                <i className="bi bi-receipt me-2 opacity-50"></i>Open Invoices
              </span>
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
                    <tr>
                      <th>Invoice</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th className="text-end">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openInvoices.map((inv) => (
                      <tr key={inv._id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{inv.invoiceNumber}</td>
                        <td style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>{fmtDate(inv.dueDate)}</td>
                        <td>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                            background: inv.status === 'overdue' ? '#fee2e2' : '#fef9c3',
                            color: inv.status === 'overdue' ? '#dc2626' : '#d97706',
                          }}>
                            {inv.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="text-end" style={{ fontWeight: 700, fontSize: 13, color: '#d97706' }}>
                          {fmtMoney(inv.amountDue, inv.currency)}
                        </td>
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
                <span className="erp-card-title">
                  <i className="bi bi-kanban me-2 opacity-50"></i>Active Deals
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Title</th>
                      <th>Stage</th>
                      <th>Close Date</th>
                      <th className="text-end">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDeals.map((d) => (
                      <tr key={d._id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--brand)' }}>{d.dealCode}</td>
                        <td style={{ fontSize: 13 }}>{d.title}</td>
                        <td>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#0891b2', background: '#e0f2fe', padding: '2px 7px', borderRadius: 10 }}>
                            {d.stage}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>{fmtDate(d.expectedCloseDate)}</td>
                        <td className="text-end" style={{ fontWeight: 700, fontSize: 13, color: '#16a34a' }}>
                          {fmtMoney(d.estimatedValue, d.currency)}
                        </td>
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
        <EditClientModal
          client={client}
          show={showEdit}
          onHide={() => setShowEdit(false)}
          onSaved={(updated) => setLocalClient(updated)}
        />
      )}
    </div>
  );
};

export default ClientsList;
