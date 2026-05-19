import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { shipmentsApi } from '../api';
import { useAuth } from '../context/AuthContext';

/* ── Config (unchanged) ──────────────────────────────────────── */
const STATUS_CONFIG = {
  quote:             { label: 'Quote',            color: '#6c757d', icon: 'bi-file-text' },
  booked:            { label: 'Booked',           color: '#0891b2', icon: 'bi-bookmark-check' },
  pickup_scheduled:  { label: 'Pickup Scheduled', color: '#0891b2', icon: 'bi-calendar-check' },
  cargo_received:    { label: 'Cargo Received',   color: '#3b82f6', icon: 'bi-box-seam' },
  customs_export:    { label: 'Export',           color: '#d97706', icon: 'bi-shield-check' },
  loaded:            { label: 'Loaded',           color: '#1a56db', icon: 'bi-box' },
  in_transit:        { label: 'In Transit',       color: '#1a56db', icon: 'bi-truck' },
  transhipment:      { label: 'Transhipment',     color: '#7c3aed', icon: 'bi-arrow-left-right' },
  arrived:           { label: 'Arrived',          color: '#059669', icon: 'bi-geo-alt' },
  customs_import:    { label: 'Customs Import',   color: '#d97706', icon: 'bi-shield-check' },
  cleared:           { label: 'Cleared',          color: '#16a34a', icon: 'bi-check-circle' },
  out_for_delivery:  { label: 'Out for Delivery', color: '#16a34a', icon: 'bi-bicycle' },
  delivered:         { label: 'Delivered',        color: '#16a34a', icon: 'bi-house-check' },
  completed:         { label: 'Completed',        color: '#059669', icon: 'bi-patch-check' },
  cancelled:         { label: 'Cancelled',        color: '#dc2626', icon: 'bi-x-circle' },
  on_hold:           { label: 'On Hold',          color: '#d97706', icon: 'bi-pause-circle' },
};

const PIPELINE_STEPS = [
  { key: 'quote',          label: 'Quote',     icon: 'bi-file-text',      step: 0 },
  { key: 'booked',         label: 'Booked',    icon: 'bi-bookmark-check', step: 1 },
  { key: 'cargo_received', label: 'Received',  icon: 'bi-box-seam',       step: 2 },
  { key: 'customs_export', label: 'Export',    icon: 'bi-shield-check',   step: 3 },
  { key: 'in_transit',     label: 'Transit',   icon: 'bi-truck',          step: 4 },
  { key: 'arrived',        label: 'Arrived',   icon: 'bi-geo-alt',        step: 5 },
  { key: 'customs_import', label: 'Import',    icon: 'bi-shield-check',   step: 6 },
  { key: 'cleared',        label: 'Cleared',   icon: 'bi-check-circle',   step: 7 },
  { key: 'delivered',      label: 'Delivered', icon: 'bi-house-check',    step: 8 },
];

const MODE_CONFIG = {
  sea:        { icon: 'bi-water',      color: '#1a56db', label: 'SEA' },
  air:        { icon: 'bi-airplane',   color: '#dc2626', label: 'AIR' },
  road:       { icon: 'bi-truck',      color: '#059669', label: 'ROAD' },
  rail:       { icon: 'bi-train-front',color: '#7c3aed', label: 'RAIL' },
  multimodal: { icon: 'bi-diagram-3', color: '#d97706', label: 'MULTI' },
  courier:    { icon: 'bi-box',        color: '#0891b2', label: 'CUR' },
};

const ACTIVE_STATUSES = ['booked','pickup_scheduled','cargo_received','customs_export',
  'loaded','in_transit','transhipment','arrived','customs_import','cleared','out_for_delivery'];
const TERMINAL_STATUSES = ['delivered','completed','cancelled','on_hold'];

const STATUS_GROUPS = [
  { key: 'active',    label: 'Active' },
  { key: 'all',       label: 'All' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'on_hold',   label: 'On Hold' },
];

const MODE_FILTERS = [
  { key: '', label: 'All Modes' },
  { key: 'sea',  label: 'Sea' },
  { key: 'air',  label: 'Air' },
  { key: 'road', label: 'Road' },
  { key: 'rail', label: 'Rail' },
];

const CAN_CREATE = ['admin','manager','operations','sales','customer_service'];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

/* ── ModeChip ────────────────────────────────────────────────── */
const ModeChip = ({ mode, direction }) => {
  const mc = MODE_CONFIG[mode] || { icon: 'bi-box', color: '#6c757d', label: mode?.toUpperCase() || '?' };
  const dir = direction ? direction.charAt(0).toUpperCase() : '';
  return (
    <span
      className="ship-mode-chip"
      style={{ background: `${mc.color}15`, color: mc.color, border: `1px solid ${mc.color}25` }}
    >
      <i className={`bi ${mc.icon}`} style={{ fontSize: 10 }} />
      {mc.label} {dir}
    </span>
  );
};

/* ── StatusChip ──────────────────────────────────────────────── */
const StatusChip = ({ status }) => {
  const sc = STATUS_CONFIG[status] || { label: status, color: '#6c757d', icon: 'bi-circle' };
  return (
    <span
      className="chip"
      style={{ background: `${sc.color}15`, color: sc.color, border: 'none', fontSize: 11 }}
    >
      <span className="chip-dot" style={{ background: sc.color }} />
      {sc.label}
    </span>
  );
};

/* ── Pipeline ────────────────────────────────────────────────── */
const Pipeline = ({ counts, activeStatus, onSelect }) => {
  /* Compute the "furthest" step index that has shipments — used for passive visual */
  const highestIdx = useMemo(() => {
    let idx = -1;
    PIPELINE_STEPS.forEach((s, i) => { if (counts[s.key] > 0) idx = i; });
    return idx;
  }, [counts]);

  const selectedIdx = PIPELINE_STEPS.findIndex((s) => s.key === activeStatus);
  /* If a step is selected, that's the active; otherwise use the highest with counts */
  const activeIdx = selectedIdx >= 0 ? selectedIdx : highestIdx;

  return (
    <div className="card mb-4" style={{ padding: '20px 24px', overflowX: 'auto' }}>
      <div className="pipeline" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 0, minWidth: 560 }}>
        {PIPELINE_STEPS.map((step, i) => {
          const isDone   = i < activeIdx;
          const isCurr   = i === activeIdx;
          const stepCount = counts[step.key] || 0;
          return (
            <div
              key={step.key}
              className={`pipe-step${isDone ? ' done' : ''}${isCurr ? ' active' : ''}`}
              onClick={() => onSelect(activeStatus === step.key ? '' : step.key)}
            >
              <div className="pipe-dot">
                {isDone
                  ? <i className="bi bi-check" style={{ fontSize: 11 }} />
                  : <i className={`bi ${step.icon}`} style={{ fontSize: 11 }} />
                }
              </div>
              <div className="pipe-label">{step.label}</div>
              {stepCount > 0 && (
                <div
                  className="mono"
                  style={{
                    fontSize: 10, fontWeight: 800,
                    color: isDone || isCurr ? 'var(--brand)' : 'var(--muted)',
                  }}
                >
                  {stepCount}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── Ship Card ───────────────────────────────────────────────── */
const ShipCard = ({ s }) => {
  const sc = STATUS_CONFIG[s.status] || { label: s.status, color: '#6c757d', icon: 'bi-circle' };
  const polCode  = s.portOfLoading?.code  || s.portOfLoading?.city  || '—';
  const podCode  = s.portOfDischarge?.code || s.portOfDischarge?.city || '—';
  const polName  = s.portOfLoading?.name  || s.portOfLoading?.city  || 'Origin';
  const podName  = s.portOfDischarge?.name || s.portOfDischarge?.city || 'Destination';

  const etd = s.etd ? new Date(s.etd) : null;
  const eta = s.eta ? new Date(s.eta) : null;
  const transitDays = etd && eta ? Math.ceil((eta - etd) / 86400000) : null;
  const isLate = eta && eta < new Date() && !TERMINAL_STATUSES.includes(s.status);

  return (
    <Link to={`/shipments/${s._id}`} className="ship-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top: number + client / mode chip */}
      <div className="flex-between">
        <div>
          <div className="ship-num" style={{ color: 'var(--brand)', fontSize: 13 }}>{s.shipmentNumber}</div>
          {s.client?.companyName && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.client.companyName}</div>
          )}
        </div>
        <ModeChip mode={s.mode} direction={s.direction} />
      </div>

      {/* Route */}
      <div className="ship-route">
        <div className="ship-port">
          <div className="ship-port-code">{polCode}</div>
          <div className="ship-port-name">{polName}</div>
        </div>
        <div className="ship-route-arrow">
          <div className="ship-route-line" />
          {transitDays && <span className="ship-route-days">{transitDays}d</span>}
        </div>
        <div className="ship-port" style={{ textAlign: 'right' }}>
          <div className="ship-port-code">{podCode}</div>
          <div className="ship-port-name">{podName}</div>
        </div>
      </div>

      {/* Dates / vessel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
        <div className="flex-col" style={{ gap: 2 }}>
          <div className="text-xs text-muted">ETD</div>
          <div className="text-sm fw-600">{fmtDate(s.etd)}</div>
        </div>
        {(s.vesselName || s.flightNumber) && (
          <div className="flex-col" style={{ gap: 2, textAlign: 'center', flex: 1 }}>
            <div className="text-xs text-muted">{s.mode === 'air' ? 'Flight' : 'Vessel'}</div>
            <div className="mono" style={{ fontSize: 10, fontWeight: 600 }}>{s.vesselName || s.flightNumber}</div>
          </div>
        )}
        <div className="flex-col" style={{ gap: 2, textAlign: 'right' }}>
          <div className="text-xs text-muted">ETA</div>
          <div className={`text-sm fw-600${isLate ? ' text-danger' : ''}`}>
            {fmtDate(s.eta)}
            {isLate && <i className="bi bi-exclamation-circle ms-1" style={{ fontSize: 10 }} />}
          </div>
        </div>
      </div>

      {/* Footer: status + container count */}
      <div className="flex-between" style={{ marginTop: -4 }}>
        <StatusChip status={s.status} />
        <div className="flex-center gap-2">
          {s.containers?.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              <i className="bi bi-grid-3x3-gap me-1" />
              {s.containers.length} ctr
            </span>
          )}
          <i className="bi bi-arrow-right-short" style={{ color: 'var(--brand)', fontSize: 16 }} />
        </div>
      </div>
    </Link>
  );
};

/* ── Table row ───────────────────────────────────────────────── */
const ShipRow = ({ s }) => {
  const mc = MODE_CONFIG[s.mode] || { icon: 'bi-box', color: '#6c757d', label: '?' };
  const polCode = s.portOfLoading?.code  || s.portOfLoading?.city  || '—';
  const podCode = s.portOfDischarge?.code || s.portOfDischarge?.city || '—';
  const eta = s.eta ? new Date(s.eta) : null;
  const isLate = eta && eta < new Date() && !TERMINAL_STATUSES.includes(s.status);

  return (
    <tr style={{ cursor: 'pointer' }}>
      <td>
        <Link
          to={`/shipments/${s._id}`}
          className="mono fw-700"
          style={{ color: 'var(--brand)', fontSize: 12, textDecoration: 'none' }}
        >
          {s.shipmentNumber}
        </Link>
      </td>
      <td><ModeChip mode={s.mode} direction={s.direction} /></td>
      <td>
        <span className="mono fw-600" style={{ fontSize: 12 }}>{polCode}</span>
        <i className="bi bi-arrow-right mx-1" style={{ color: 'var(--muted)', fontSize: 11 }} />
        <span className="mono fw-600" style={{ fontSize: 12 }}>{podCode}</span>
      </td>
      <td style={{ fontSize: 13 }}>{s.client?.companyName || '—'}</td>
      <td className="text-muted text-sm">{fmtDate(s.etd)}</td>
      <td className={`text-sm${isLate ? ' text-danger fw-600' : ' text-muted'}`}>
        {fmtDate(s.eta)}
        {isLate && <i className="bi bi-exclamation-circle ms-1" style={{ fontSize: 10 }} />}
      </td>
      <td className="mono text-sm" style={{ fontSize: 11 }}>{s.vesselName || s.flightNumber || '—'}</td>
      <td><StatusChip status={s.status} /></td>
      <td><i className="bi bi-arrow-right-short" style={{ color: 'var(--muted)', fontSize: 16 }} /></td>
    </tr>
  );
};

/* ── Main page ───────────────────────────────────────────────── */
const Shipments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isCustomer = user?.role === 'customer';

  const [shipments,     setShipments]   = useState([]);
  const [loading,       setLoading]     = useState(true);
  const [error,         setError]       = useState('');
  const [statusFilter,  setStatus]      = useState('active');
  const [modeFilter,    setMode]        = useState(searchParams.get('mode') || '');
  const [pipelineStatus,setPipe]        = useState('');
  const [search,        setSearch]      = useState('');
  const [viewMode,      setView]        = useState('card');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (pipelineStatus)            params.status = pipelineStatus;
        else if (statusFilter !== 'all') params.status = statusFilter;
        if (modeFilter)                params.mode = modeFilter;
        if (search.trim())             params.search = search.trim();
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

  const pipelineCounts = useMemo(() => {
    const counts = {};
    shipments.forEach((s) => { counts[s.status] = (counts[s.status] || 0) + 1; });
    return counts;
  }, [shipments]);

  const statusCounts = useMemo(() => ({
    active:    shipments.filter((s) => ACTIVE_STATUSES.includes(s.status)).length,
    all:       shipments.length,
    delivered: shipments.filter((s) => ['delivered','completed'].includes(s.status)).length,
    on_hold:   shipments.filter((s) => s.status === 'on_hold').length,
  }), [shipments]);

  const inTransitCount = pipelineCounts['in_transit'] || 0;

  const handlePipeSelect = (status) => {
    setPipe(status);
    if (status) setStatus('all');
  };

  const displayed = useMemo(() => {
    if (!pipelineStatus) return shipments;
    return shipments.filter((s) => s.status === pipelineStatus);
  }, [shipments, pipelineStatus]);

  return (
    <div className="page">
      {/* ── Page hero ── */}
      <div className="page-hero">
        <div className="page-row">
          <div>
            <h1 className="page-title">{isCustomer ? 'My Shipments' : 'Shipments'}</h1>
            <div className="page-sub">
              {shipments.length} shipment{shipments.length !== 1 ? 's' : ''} · {inTransitCount} in transit
            </div>
          </div>
          <div className="flex-center" style={{ gap: 10 }}>
            {/* Card / table toggle */}
            <div className="seg-nav" style={{ padding: 3 }}>
              <button
                className={viewMode === 'card' ? 'active' : ''}
                onClick={() => setView('card')}
                style={{ padding: '5px 10px' }}
                title="Card view"
              >
                <i className="bi bi-grid-3x3-gap" />
              </button>
              <button
                className={viewMode === 'table' ? 'active' : ''}
                onClick={() => setView('table')}
                style={{ padding: '5px 10px' }}
                title="Table view"
              >
                <i className="bi bi-list-ul" />
              </button>
            </div>
            <button className="btn">
              <i className="bi bi-download" /> Export
            </button>
            {CAN_CREATE.includes(user?.role) && (
              <button className="btn btn-brand" onClick={() => navigate('/shipments/new')}>
                <i className="bi bi-plus-lg" /> New Job
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter row ── */}
      <div className="filter-row">
        {/* Status filters */}
        {STATUS_GROUPS.map((g) => (
          <button
            key={g.key}
            className={`filter-chip${statusFilter === g.key && !pipelineStatus ? ' active' : ''}`}
            onClick={() => { setStatus(g.key); setPipe(''); }}
          >
            {g.label}
            <span className="count">{statusCounts[g.key] ?? 0}</span>
          </button>
        ))}

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'var(--hairline)', margin: '0 4px', alignSelf: 'center' }} />

        {/* Mode filters */}
        {!isCustomer && MODE_FILTERS.map((m) => (
          <button
            key={m.key}
            className={`filter-chip${modeFilter === m.key ? ' active' : ''}`}
            onClick={() => setMode(modeFilter === m.key && m.key !== '' ? '' : m.key)}
          >
            {m.label}
          </button>
        ))}

        {/* Search — pushed right */}
        <div style={{ marginLeft: 'auto' }}>
          <div className="input" style={{ width: 240 }}>
            <i className="bi bi-search" style={{ color: 'var(--muted)', fontSize: 13 }} />
            <input
              placeholder="Job #, client, vessel…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {(search || pipelineStatus) && (
              <button
                onClick={() => { setSearch(''); setPipe(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--muted)', fontSize: 14 }}
                title="Clear"
              >
                <i className="bi bi-x" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Status pipeline ── */}
      {!isCustomer && !loading && (
        <Pipeline
          counts={pipelineCounts}
          activeStatus={pipelineStatus}
          onSelect={handlePipeSelect}
        />
      )}

      {/* ── Error ── */}
      {error && (
        <div className="chip chip-danger mb-4" style={{ display: 'flex', padding: '10px 16px', borderRadius: 'var(--r)', fontSize: 13 }}>
          <i className="bi bi-exclamation-circle me-2" />
          {error}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, minHeight: 300, justifyContent: 'center' }}>
          <div className="dashboard-loader">
            <div className="dashboard-loader-ring" />
            <i className="bi bi-boxes dashboard-loader-icon" />
          </div>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Loading shipments…</span>
        </div>
      ) : displayed.length === 0 ? (
        <div className="card dash-empty-state" style={{ padding: '56px 20px' }}>
          <i className="bi bi-inbox" style={{ fontSize: 40, opacity: 0.2 }} />
          <span style={{ fontSize: 14 }}>No shipments found</span>
          <span className="text-muted" style={{ fontSize: 12 }}>Try adjusting your filters</span>
          {CAN_CREATE.includes(user?.role) && (
            <button className="btn btn-brand mt-3" onClick={() => navigate('/shipments/new')}>
              <i className="bi bi-plus-lg" /> Create First Job
            </button>
          )}
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-3" style={{ gap: 16 }}>
          {displayed.map((s) => <ShipCard key={s._id} s={s} />)}
        </div>
      ) : (
        <div className="card card-flush">
          <table className="tbl">
            <thead>
              <tr>
                <th>Job #</th>
                <th>Mode</th>
                <th>Route</th>
                <th>Client</th>
                <th>ETD</th>
                <th>ETA</th>
                <th>Carrier</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((s) => <ShipRow key={s._id} s={s} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Shipments;
