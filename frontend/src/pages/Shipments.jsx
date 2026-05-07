import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Row, Col, Spinner, Alert, InputGroup, Form } from 'react-bootstrap';
import { shipmentsApi } from '../api';
import { useAuth } from '../context/AuthContext';

/* ── Config ──────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  quote:             { label: 'Quote',           color: '#6c757d', icon: 'bi-file-text' },
  booked:            { label: 'Booked',          color: '#0891b2', icon: 'bi-bookmark-check' },
  pickup_scheduled:  { label: 'Pickup Scheduled',color: '#0891b2', icon: 'bi-calendar-check' },
  cargo_received:    { label: 'Cargo Received',  color: '#3b82f6', icon: 'bi-box-seam' },
  customs_export:    { label: 'Customs Export',  color: '#d97706', icon: 'bi-shield-check' },
  loaded:            { label: 'Loaded',          color: '#1a56db', icon: 'bi-box' },
  in_transit:        { label: 'In Transit',      color: '#1a56db', icon: 'bi-truck' },
  transhipment:      { label: 'Transhipment',    color: '#7c3aed', icon: 'bi-arrow-left-right' },
  arrived:           { label: 'Arrived',         color: '#059669', icon: 'bi-geo-alt' },
  customs_import:    { label: 'Customs Import',  color: '#d97706', icon: 'bi-shield-check' },
  cleared:           { label: 'Cleared',         color: '#16a34a', icon: 'bi-check-circle' },
  out_for_delivery:  { label: 'Out for Delivery',color: '#16a34a', icon: 'bi-bicycle' },
  delivered:         { label: 'Delivered',       color: '#16a34a', icon: 'bi-house-check' },
  completed:         { label: 'Completed',       color: '#059669', icon: 'bi-patch-check' },
  cancelled:         { label: 'Cancelled',       color: '#dc2626', icon: 'bi-x-circle' },
  on_hold:           { label: 'On Hold',         color: '#d97706', icon: 'bi-pause-circle' },
};

const PIPELINE_STEPS = [
  { key: 'quote',            label: 'Quote',       icon: 'bi-file-text' },
  { key: 'booked',           label: 'Booked',      icon: 'bi-bookmark-check' },
  { key: 'cargo_received',   label: 'Cargo',       icon: 'bi-box-seam' },
  { key: 'customs_export',   label: 'Export',      icon: 'bi-shield-check' },
  { key: 'in_transit',       label: 'Transit',     icon: 'bi-truck' },
  { key: 'arrived',          label: 'Arrived',     icon: 'bi-geo-alt' },
  { key: 'customs_import',   label: 'Import',      icon: 'bi-shield-check' },
  { key: 'cleared',          label: 'Cleared',     icon: 'bi-check-circle' },
  { key: 'completed',        label: 'Completed',   icon: 'bi-patch-check' },
];

const MODE_CONFIG = {
  sea:       { icon: 'bi-water',         color: '#1a56db' },
  air:       { icon: 'bi-airplane',      color: '#dc2626' },
  road:      { icon: 'bi-truck',         color: '#059669' },
  rail:      { icon: 'bi-train-front',   color: '#7c3aed' },
  multimodal:{ icon: 'bi-diagram-3',    color: '#d97706' },
  courier:   { icon: 'bi-box',           color: '#0891b2' },
};

const ACTIVE_STATUSES = ['booked', 'pickup_scheduled', 'cargo_received', 'customs_export',
  'loaded', 'in_transit', 'transhipment', 'arrived', 'customs_import', 'cleared', 'out_for_delivery'];

const TERMINAL_STATUSES = ['delivered', 'completed', 'cancelled', 'on_hold'];

const STATUS_GROUPS = [
  { key: 'active',    label: 'Active',     dot: '#1a56db' },
  { key: 'all',       label: 'All',        dot: '#6c757d' },
  { key: 'delivered', label: 'Delivered',  dot: '#16a34a' },
  { key: 'completed', label: 'Completed',  dot: '#059669' },
  { key: 'on_hold',   label: 'On Hold',    dot: '#d97706' },
  { key: 'cancelled', label: 'Cancelled',  dot: '#dc2626' },
];

const MODE_CHIPS = [
  { key: '', label: 'All Modes', color: '#6c757d' },
  { key: 'sea',  label: 'Sea',  color: '#1a56db' },
  { key: 'air',  label: 'Air',  color: '#dc2626' },
  { key: 'road', label: 'Road', color: '#059669' },
  { key: 'rail', label: 'Rail', color: '#7c3aed' },
  { key: 'courier', label: 'Courier', color: '#0891b2' },
];

const CAN_CREATE = ['admin', 'manager', 'operations', 'sales', 'customer_service'];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

/* ── Status pipeline (top of page) ──────────────────────────── */
const StatusPipeline = ({ counts, activeStatus, onSelect }) => {
  const ORDER = PIPELINE_STEPS.map((s) => s.key);
  const activeIdx = ORDER.indexOf(activeStatus);

  return (
    <div className="erp-card mb-4">
      <div className="erp-card-body">
        <div className="ship-status-pipeline">
          {PIPELINE_STEPS.map((step, i) => {
            const isDone   = activeIdx > i;
            const isCurr   = activeIdx === i;
            return (
              <div
                key={step.key}
                className={`ship-pipeline-step${isDone ? ' done' : ''}${isCurr ? ' active' : ''}`}
                onClick={() => onSelect(step.key === activeStatus ? '' : step.key)}
                title={`${step.label}${counts[step.key] ? ` (${counts[step.key]})` : ''}`}
              >
                <div className="ship-pipeline-dot">
                  {isDone ? <i className="bi bi-check"></i> : <i className={`bi ${step.icon}`}></i>}
                </div>
                <div className="ship-pipeline-label">{step.label}</div>
                {counts[step.key] > 0 && (
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: isCurr || isDone ? 'var(--brand)' : 'var(--bs-secondary-color)',
                    }}
                  >
                    {counts[step.key]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ── Shipment card v2 ────────────────────────────────────────── */
const ShipCard = ({ s }) => {
  const mc  = MODE_CONFIG[s.mode] || { icon: 'bi-box', color: '#6c757d' };
  const sc  = STATUS_CONFIG[s.status] || { label: s.status, color: '#6c757d', icon: 'bi-circle' };
  const polCode = s.portOfLoading?.code || s.portOfLoading?.city || s.portOfLoading?.name || '?';
  const podCode = s.portOfDischarge?.code || s.portOfDischarge?.city || s.portOfDischarge?.name || '?';

  const etd = s.etd ? new Date(s.etd) : null;
  const eta = s.eta ? new Date(s.eta) : null;
  const now = new Date();
  const transitDays = etd && eta ? Math.ceil((eta - etd) / 86400000) : null;
  const isLate = eta && eta < now && !TERMINAL_STATUSES.includes(s.status);

  return (
    <Link to={`/shipments/${s._id}`} className="ship-card-v2">
      <div className="ship-card-v2-header">
        <div>
          <div className="ship-card-v2-num">{s.shipmentNumber}</div>
          {s.client?.companyName && (
            <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)', marginTop: 2 }}>
              {s.client.companyName}
            </div>
          )}
        </div>
        <div
          className="ship-card-v2-mode"
          style={{ background: `${mc.color}15`, color: mc.color }}
        >
          <i className={`bi ${mc.icon}`}></i>
          <span>{s.mode?.toUpperCase()}</span>
          {s.direction && <span style={{ opacity: 0.6 }}>{s.direction.toUpperCase()}</span>}
        </div>
      </div>

      <div className="ship-card-v2-body">
        {/* Route */}
        <div className="ship-card-v2-route">
          <div className="ship-route-port">
            <div className="ship-route-port-code">{polCode}</div>
            <div className="ship-route-port-name">
              {s.portOfLoading?.name || s.portOfLoading?.city || 'Origin'}
            </div>
          </div>
          <div className="ship-route-arrow">
            <i className="bi bi-arrow-right"></i>
            {transitDays && (
              <span className="ship-route-days">{transitDays}d</span>
            )}
          </div>
          <div className="ship-route-port" style={{ textAlign: 'right' }}>
            <div className="ship-route-port-code">{podCode}</div>
            <div className="ship-route-port-name">
              {s.portOfDischarge?.name || s.portOfDischarge?.city || 'Destination'}
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="ship-card-v2-dates">
          <div className="ship-date-item">
            <div className="ship-date-label">ETD</div>
            <div className="ship-date-val">{fmtDate(s.etd)}</div>
          </div>
          <div className="ship-date-item" style={{ textAlign: 'right' }}>
            <div className="ship-date-label">ETA</div>
            <div className="ship-date-val" style={{ color: isLate ? '#dc2626' : undefined }}>
              {fmtDate(s.eta)}
              {isLate && <i className="bi bi-exclamation-circle ms-1" style={{ fontSize: 10 }}></i>}
            </div>
          </div>
          {(s.vesselName || s.flightNumber) && (
            <div className="ship-date-item" style={{ textAlign: 'center', flex: 2 }}>
              <div className="ship-date-label">Vessel / Flight</div>
              <div className="ship-date-val" style={{ fontSize: 11 }}>
                {s.vesselName || s.flightNumber}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="ship-card-v2-footer">
        <span
          className="ship-status-badge"
          style={{ background: `${sc.color}15`, color: sc.color }}
        >
          <i className={`bi ${sc.icon}`} style={{ fontSize: 10 }}></i>
          {sc.label}
        </span>
        <div className="d-flex align-items-center gap-2">
          {s.containers?.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--bs-secondary-color)' }}>
              <i className="bi bi-grid-3x3-gap me-1"></i>
              {s.containers.length} ctr
            </span>
          )}
          {s.approvalStatus === 'pending' && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#d97706',
                background: '#fef9c3',
                padding: '2px 7px',
                borderRadius: 10,
              }}
            >
              Pending Approval
            </span>
          )}
          <i className="bi bi-arrow-right-short" style={{ color: 'var(--brand)', fontSize: 16 }}></i>
        </div>
      </div>
    </Link>
  );
};

/* ── Shipment row (table view) ───────────────────────────────── */
const ShipRow = ({ s }) => {
  const mc = MODE_CONFIG[s.mode] || { icon: 'bi-box', color: '#6c757d' };
  const sc = STATUS_CONFIG[s.status] || { label: s.status, color: '#6c757d', icon: 'bi-circle' };
  const polCode = s.portOfLoading?.code || s.portOfLoading?.city || '—';
  const podCode = s.portOfDischarge?.code || s.portOfDischarge?.city || '—';

  return (
    <tr>
      <td>
        <Link to={`/shipments/${s._id}`} style={{ color: 'var(--brand)', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
          {s.shipmentNumber}
        </Link>
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className={`bi ${mc.icon}`} style={{ color: mc.color, fontSize: 14 }}></i>
          <span style={{ fontSize: 12, color: mc.color, fontWeight: 700, textTransform: 'uppercase' }}>{s.mode}</span>
        </div>
      </td>
      <td>
        <div style={{ fontSize: 13 }}>
          <strong>{polCode}</strong>
          <i className="bi bi-arrow-right mx-1 text-muted small"></i>
          <strong>{podCode}</strong>
        </div>
        {s.client?.companyName && <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)' }}>{s.client.companyName}</div>}
      </td>
      <td style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>{fmtDate(s.etd)}</td>
      <td style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>{fmtDate(s.eta)}</td>
      <td>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 9px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            background: `${sc.color}15`,
            color: sc.color,
            whiteSpace: 'nowrap',
          }}
        >
          {sc.label}
        </span>
      </td>
      <td>
        <Link to={`/shipments/${s._id}`} className="btn btn-sm btn-outline-primary" style={{ fontSize: 11, padding: '3px 10px' }}>
          View
        </Link>
      </td>
    </tr>
  );
};

/* ── Main page ───────────────────────────────────────────────── */
const Shipments = () => {
  const { user, isCustomer } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [shipments, setShipments] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [statusFilter, setStatus] = useState(isCustomer ? 'active' : 'active');
  const [modeFilter,   setMode]   = useState(searchParams.get('mode') || '');
  const [pipelineStatus, setPipe] = useState('');
  const [search,       setSearch] = useState('');
  const [viewMode,     setView]   = useState('card');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (pipelineStatus)       params.status = pipelineStatus;
        else if (statusFilter !== 'all') params.status = statusFilter;
        if (modeFilter)           params.mode = modeFilter;
        if (search.trim())        params.search = search.trim();
        const { items } = await shipmentsApi.list(params);
        if (!cancelled) setShipments(items);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load shipments');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [statusFilter, modeFilter, pipelineStatus, search]);

  /* Pipeline counts per status */
  const pipelineCounts = useMemo(() => {
    const counts = {};
    shipments.forEach((s) => { counts[s.status] = (counts[s.status] || 0) + 1; });
    return counts;
  }, [shipments]);

  const handlePipeSelect = (status) => {
    setPipe(status);
    if (status) setStatus('all');
  };

  const displayed = useMemo(() => {
    if (!pipelineStatus) return shipments;
    return shipments.filter((s) => s.status === pipelineStatus);
  }, [shipments, pipelineStatus]);

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="ss-page-header">
        <div className="ss-page-header-left">
          <div className="ss-page-header-icon"><i className="bi bi-boxes"></i></div>
          <div>
            <h4 className="ss-page-title">{isCustomer ? 'My Shipments' : 'Shipments'}</h4>
            <div className="ss-page-sub">
              {isCustomer ? 'Track your active cargo and download documents' : `${shipments.length} shipment${shipments.length !== 1 ? 's' : ''} loaded`}
            </div>
          </div>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <div className="view-toggle">
            <button className={`view-toggle-btn${viewMode === 'card' ? ' active' : ''}`} onClick={() => setView('card')} title="Card view">
              <i className="bi bi-grid-3x3-gap"></i>
            </button>
            <button className={`view-toggle-btn${viewMode === 'table' ? ' active' : ''}`} onClick={() => setView('table')} title="Table view">
              <i className="bi bi-list-ul"></i>
            </button>
          </div>
          {CAN_CREATE.includes(user?.role) && (
            <button className="ss-action-btn ss-action-btn-primary" onClick={() => navigate('/shipments/new')}>
              <i className="bi bi-plus-lg me-1"></i>New Job
            </button>
          )}
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div className="filter-chip-row mb-2">
          {/* Status group chips */}
          {STATUS_GROUPS.map((g) => (
            <button
              key={g.key}
              className={`filter-chip${statusFilter === g.key && !pipelineStatus ? ' active' : ''}`}
              onClick={() => { setStatus(g.key); setPipe(''); }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusFilter === g.key && !pipelineStatus ? 'rgba(255,255,255,0.8)' : g.dot, display: 'inline-block' }}></span>
              {g.label}
            </button>
          ))}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {/* Mode chips */}
            {!isCustomer && MODE_CHIPS.map((m) => (
              <button
                key={m.key}
                className={`filter-chip mode-chip${modeFilter === m.key ? ' active' : ''}`}
                style={{ '--chip-color': m.color }}
                onClick={() => setMode(modeFilter === m.key ? '' : m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="d-flex align-items-center gap-2">
          <InputGroup size="sm" style={{ width: 260, maxWidth: '100%' }}>
            <InputGroup.Text style={{ background: 'var(--surface)' }}>
              <i className="bi bi-search"></i>
            </InputGroup.Text>
            <Form.Control
              placeholder="Shipment #, client, vessel…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: 'var(--surface)' }}
            />
          </InputGroup>
          {(pipelineStatus || search) && (
            <button
              className="ss-action-btn"
              style={{ fontSize: 11 }}
              onClick={() => { setPipe(''); setSearch(''); }}
            >
              <i className="bi bi-x me-1"></i>Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Pipeline visualization ────────────────────────────── */}
      {!isCustomer && !loading && (
        <StatusPipeline
          counts={pipelineCounts}
          activeStatus={pipelineStatus}
          onSelect={handlePipeSelect}
        />
      )}

      {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

      {/* ── Content ──────────────────────────────────────────── */}
      {loading ? (
        <div className="ss-loading" style={{ minHeight: 300 }}>
          <div className="dashboard-loader">
            <div className="dashboard-loader-ring"></div>
            <i className="bi bi-boxes dashboard-loader-icon"></i>
          </div>
          <span>Loading shipments…</span>
        </div>
      ) : displayed.length === 0 ? (
        <div className="erp-card">
          <div className="dash-empty-state" style={{ padding: '56px 20px' }}>
            <i className="bi bi-inbox" style={{ fontSize: 40, opacity: 0.2 }}></i>
            <span style={{ fontSize: 14 }}>No shipments found</span>
            <span className="text-muted" style={{ fontSize: 12 }}>Try adjusting your filters</span>
            {CAN_CREATE.includes(user?.role) && (
              <button className="ss-action-btn ss-action-btn-primary mt-2" onClick={() => navigate('/shipments/new')}>
                <i className="bi bi-plus-lg me-1"></i>Create First Job
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'card' ? (
        <Row className="g-3">
          {displayed.map((s) => (
            <Col key={s._id} md={6} xl={4}>
              <ShipCard s={s} />
            </Col>
          ))}
        </Row>
      ) : (
        <div className="erp-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Job #</th>
                  <th>Mode</th>
                  <th>Route / Client</th>
                  <th>ETD</th>
                  <th>ETA</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((s) => <ShipRow key={s._id} s={s} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shipments;
