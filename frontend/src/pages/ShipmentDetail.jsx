import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Row, Col, Button, Modal, Form, Alert } from 'react-bootstrap';
import { shipmentsApi, documentsApi, tasksApi, usersApi } from '../api';
import { useAuth } from '../context/AuthContext';
import VesselMap from '../components/tracking/VesselMap';

/* ── helpers ──────────────────────────────────────────────── */
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const fmtMoney = (n, cur = 'USD') =>
  n != null ? `${cur} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

const STATUS_CONFIG = {
  quote:            { color: '#6b7280', bg: '#f3f4f6', label: 'Quote' },
  booked:           { color: '#0891b2', bg: '#ecfeff', label: 'Booked' },
  pickup_scheduled: { color: '#0891b2', bg: '#ecfeff', label: 'Pickup Scheduled' },
  cargo_received:   { color: '#2563eb', bg: '#eff6ff', label: 'Cargo Received' },
  customs_export:   { color: '#d97706', bg: '#fffbeb', label: 'Customs Export' },
  loaded:           { color: '#7c3aed', bg: '#f5f3ff', label: 'Loaded' },
  in_transit:       { color: '#2563eb', bg: '#eff6ff', label: 'In Transit' },
  transhipment:     { color: '#7c3aed', bg: '#f5f3ff', label: 'Transhipment' },
  arrived:          { color: '#059669', bg: '#ecfdf5', label: 'Arrived' },
  customs_import:   { color: '#d97706', bg: '#fffbeb', label: 'Customs Import' },
  cleared:          { color: '#16a34a', bg: '#dcfce7', label: 'Cleared' },
  out_for_delivery: { color: '#16a34a', bg: '#dcfce7', label: 'Out for Delivery' },
  delivered:        { color: '#16a34a', bg: '#dcfce7', label: 'Delivered' },
  completed:        { color: '#16a34a', bg: '#dcfce7', label: 'Completed' },
  cancelled:        { color: '#dc2626', bg: '#fef2f2', label: 'Cancelled' },
  on_hold:          { color: '#d97706', bg: '#fffbeb', label: 'On Hold' },
};

const APPROVAL_CONFIG = {
  pending:  { color: '#d97706', bg: '#fffbeb', icon: 'bi-clock',            label: 'Pending Approval' },
  approved: { color: '#16a34a', bg: '#dcfce7', icon: 'bi-check-circle-fill', label: 'Approved' },
  rejected: { color: '#dc2626', bg: '#fef2f2', icon: 'bi-x-circle-fill',    label: 'Rejected' },
};

const MS_COLOR = {
  completed:   '#16a34a',
  in_progress: '#2563eb',
  delayed:     '#d97706',
  skipped:     '#9ca3af',
  pending:     '#d1d5db',
};
const MS_ICON = {
  completed:   'bi-check-circle-fill',
  in_progress: 'bi-play-circle-fill',
  delayed:     'bi-exclamation-circle-fill',
  skipped:     'bi-dash-circle',
  pending:     'bi-circle',
};

/* ── InfoRow helper ───────────────────────────────────────── */
const InfoRow = ({ label, value }) => (
  <div className="sd-info-row">
    <span className="sd-info-label">{label}</span>
    <span className="sd-info-value">{value || '—'}</span>
  </div>
);

/* ── Milestone Edit Modal ─────────────────────────────────── */
const MilestoneEditModal = ({ milestone, shipmentId, onClose, onSaved }) => {
  const [form, setForm] = useState({
    status:      milestone.status || 'pending',
    actualDate:  milestone.actualDate  ? milestone.actualDate.substring(0, 10)  : '',
    plannedDate: milestone.plannedDate ? milestone.plannedDate.substring(0, 10) : '',
    location:    milestone.location || '',
    remarks:     milestone.remarks  || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setErr('');
    try {
      await shipmentsApi.updateMilestone(shipmentId, milestone._id, {
        ...form,
        actualDate:  form.actualDate  || null,
        plannedDate: form.plannedDate || null,
      });
      onSaved();
    } catch (ex) { setErr(ex.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <Modal show onHide={onClose} centered>
      <Form onSubmit={save}>
        <Modal.Header closeButton><Modal.Title>{milestone.event}</Modal.Title></Modal.Header>
        <Modal.Body>
          {err && <Alert variant="danger" className="py-2">{err}</Alert>}
          <Row className="g-3">
            <Col xs={12}>
              <Form.Label>Status</Form.Label>
              <Form.Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['pending','in_progress','completed','delayed','skipped'].map((s) => (
                  <option key={s} value={s}>{s.replace('_',' ').replace(/^\w/, c => c.toUpperCase())}</option>
                ))}
              </Form.Select>
            </Col>
            <Col sm={6}>
              <Form.Label>Planned Date</Form.Label>
              <Form.Control type="date" value={form.plannedDate}
                onChange={(e) => setForm({ ...form, plannedDate: e.target.value })} />
            </Col>
            <Col sm={6}>
              <Form.Label>Actual Date</Form.Label>
              <Form.Control type="date" value={form.actualDate}
                onChange={(e) => setForm({ ...form, actualDate: e.target.value })} />
            </Col>
            <Col xs={12}>
              <Form.Label>Location</Form.Label>
              <Form.Control value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Col>
            <Col xs={12}>
              <Form.Label>Remarks</Form.Label>
              <Form.Control as="textarea" rows={2} value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

/* ── Approval Modal ───────────────────────────────────────── */
const ApprovalModal = ({ shipmentId, action, onClose, onSaved }) => {
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setErr('');
    try {
      if (action === 'approve') await shipmentsApi.approve(shipmentId, { note });
      else await shipmentsApi.reject(shipmentId, { note });
      onSaved();
    } catch (ex) { setErr(ex.response?.data?.message || 'Action failed'); }
    finally { setSaving(false); }
  };

  return (
    <Modal show onHide={onClose} centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton>
          <Modal.Title>
            {action === 'approve'
              ? <><i className="bi bi-check-circle text-success me-2"></i>Approve Shipment</>
              : <><i className="bi bi-x-circle text-danger me-2"></i>Reject Shipment</>}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {err && <Alert variant="danger" className="py-2">{err}</Alert>}
          <Form.Group>
            <Form.Label>Note (optional)</Form.Label>
            <Form.Control as="textarea" rows={3} value={note}
              placeholder={action === 'approve' ? 'Approval note…' : 'Reason for rejection…'}
              onChange={(e) => setNote(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant={action === 'approve' ? 'success' : 'danger'} disabled={saving}>
            {saving ? 'Processing…' : action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

/* ── Tracking Panel ───────────────────────────────────────── */
const EVT_ICON = {
  completed: { icon: 'bi-check-circle-fill', color: '#16a34a' },
  detected:  { icon: 'bi-broadcast',         color: '#2563eb' },
};

const TrackingPanel = ({ shipmentId, shipment }) => {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await shipmentsApi.getTracking(shipmentId);
      setTracking(data);
    } catch (ex) {
      setError(ex.response?.data?.message || 'Failed to fetch tracking data');
    } finally { setLoading(false); }
  }, [shipmentId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="ss-loading" style={{ minHeight: 180 }}>
      <div className="dashboard-loader">
        <div className="dashboard-loader-ring"></div>
        <i className="bi bi-broadcast dashboard-loader-icon"></i>
      </div>
      <span>Fetching tracking data…</span>
    </div>
  );
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!tracking) return null;

  const showMap = tracking.origin && tracking.destination && tracking.vesselPosition;
  const sortedEvents = [...(tracking.events || [])].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <div>
      {/* Header strip */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            Provider:{' '}
            <span style={{ color: 'var(--brand)', textTransform: 'capitalize' }}>
              {tracking.provider}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>
            {tracking.trackingNumber && <>Ref: {tracking.trackingNumber}</>}
            {shipment.lastTrackingUpdate && (
              <> · Updated {fmt(shipment.lastTrackingUpdate)}</>
            )}
          </div>
        </div>
        <button className="ss-action-btn" onClick={load}>
          <i className="bi bi-arrow-clockwise me-2"></i>Refresh
        </button>
      </div>

      {/* Map */}
      {showMap && (
        <div className="mb-4">
          <VesselMap
            origin={tracking.origin}
            destination={tracking.destination}
            vesselPosition={tracking.vesselPosition}
            mode={shipment.mode}
          />
        </div>
      )}

      {/* Events timeline */}
      <div className="sd-section-title">Tracking Events</div>
      {sortedEvents.length === 0 ? (
        <div className="dash-empty-state">
          <i className="bi bi-broadcast"></i>
          <div>No tracking events yet</div>
          <small style={{ color: 'var(--bs-secondary-color)' }}>
            Events appear once the carrier reports activity
          </small>
        </div>
      ) : (
        <div className="milestone-timeline">
          {sortedEvents.map((ev, i) => {
            const meta = EVT_ICON[ev.status] || EVT_ICON.detected;
            return (
              <div key={i} className="milestone-item done">
                <span className="milestone-dot completed"></span>
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <i className={`bi ${meta.icon}`} style={{ color: meta.color, fontSize: 14 }}></i>
                    <span className="fw-semibold" style={{ fontSize: 13 }}>{ev.event}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                      background: meta.color + '22', color: meta.color,
                    }}>{ev.status}</span>
                  </div>
                  <div className="small text-muted ms-4 mt-1">
                    {ev.location && <><i className="bi bi-geo-alt me-1"></i>{ev.location} · </>}
                    {fmt(ev.timestamp)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ── Tasks Panel ───────────────────────────────────────────── */
const PRIORITY_META = {
  urgent: { color: '#dc2626', bg: '#fef2f2' },
  high:   { color: '#d97706', bg: '#fffbeb' },
  normal: { color: '#2563eb', bg: '#eff6ff' },
  low:    { color: '#6b7280', bg: '#f9fafb' },
};

function SlaBadge({ dueAt, status, slaBreached }) {
  if (!dueAt || status === 'done' || status === 'cancelled') return null;
  const diff = new Date(dueAt) - Date.now();
  const hrs  = diff / 3600000;
  if (slaBreached || hrs < 0) {
    return <span className="badge rounded-pill ms-2" style={{ background: '#fef2f2', color: '#dc2626', fontSize: 10 }}>Overdue</span>;
  }
  if (hrs < 24) return <span className="badge rounded-pill ms-2" style={{ background: '#fffbeb', color: '#d97706', fontSize: 10 }}>{Math.round(hrs)}h left</span>;
  return <span className="badge rounded-pill ms-2" style={{ background: '#f0fdf4', color: '#059669', fontSize: 10 }}>{Math.round(hrs / 24)}d left</span>;
}

const TasksPanel = ({ shipmentId, shipmentNumber }) => {
  const [tasks, setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers]   = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm]     = useState({ title: '', priority: 'normal', assignedTo: '', dueAt: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await tasksApi.list({ linkedKind: 'Shipment', linkedId: shipmentId, status: 'open,in_progress,done', limit: 50 });
      setTasks(d.items);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [shipmentId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    usersApi.list({ limit: 100 }).then((d) => setUsers(d.items || d.users || [])).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await tasksApi.create({
        title: form.title,
        priority: form.priority,
        assignedTo: form.assignedTo || undefined,
        dueAt: form.dueAt || undefined,
        linkedTo: { kind: 'Shipment', id: shipmentId, label: shipmentNumber },
      });
      setForm({ title: '', priority: 'normal', assignedTo: '', dueAt: '' });
      setCreating(false);
      load();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const quickDone = async (taskId) => {
    await tasksApi.complete(taskId);
    load();
  };

  if (loading) return <div className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary" /></div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span className="text-muted small">{tasks.length} task{tasks.length !== 1 ? 's' : ''} linked to this shipment</span>
        <button className="btn btn-sm btn-outline-primary" onClick={() => setCreating((x) => !x)}>
          <i className="bi bi-plus me-1" />Add Task
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="card border-0 bg-light rounded-3 p-3 mb-3">
          <div className="row g-2">
            <div className="col-12">
              <input className="form-control form-control-sm" placeholder="Task title…" value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="col-md-4">
              <select className="form-select form-select-sm" value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                {['low','normal','high','urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <select className="form-select form-select-sm" value={form.assignedTo}
                onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}>
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <input type="datetime-local" className="form-control form-control-sm" value={form.dueAt}
                onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))} />
            </div>
            <div className="col-12 d-flex gap-2">
              <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Create Task'}
              </button>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </div>
        </form>
      )}

      {tasks.length === 0 && !creating && (
        <div className="text-center text-muted py-5">
          <i className="bi bi-check2-square d-block mb-2" style={{ fontSize: 32 }} />
          No tasks yet — create one or configure workflow rules to generate them automatically.
        </div>
      )}

      <div className="d-flex flex-column gap-2">
        {tasks.map((task) => {
          const pm = PRIORITY_META[task.priority] || PRIORITY_META.normal;
          const done = task.status === 'done' || task.status === 'cancelled';
          return (
            <div key={task._id} className={`card border-0 shadow-sm ${done ? 'opacity-50' : ''}`} style={{ borderRadius: 8 }}>
              <div className="card-body py-2 px-3 d-flex align-items-center gap-3">
                <button className="btn btn-sm p-0" style={{ lineHeight: 1 }} onClick={() => !done && quickDone(task._id)}
                  title={done ? task.status : 'Mark done'}>
                  <i className={`bi ${done ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'}`} style={{ fontSize: 18 }} />
                </button>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className={`fw-semibold ${done ? 'text-decoration-line-through text-muted' : ''}`} style={{ fontSize: 13 }}>
                    {task.title}
                    <SlaBadge dueAt={task.dueAt} status={task.status} slaBreached={task.slaBreached} />
                  </div>
                  <div className="text-muted" style={{ fontSize: 11 }}>
                    {task.assignedTo?.name && <><i className="bi bi-person me-1" />{task.assignedTo.name} · </>}
                    {task.dueAt && new Date(task.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <span className="badge rounded-pill flex-shrink-0" style={{ background: pm.bg, color: pm.color, fontSize: 10 }}>
                  {task.priority}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── Main Component ───────────────────────────────────────── */
const ShipmentDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const isOps      = ['admin', 'manager', 'operations'].includes(user?.role);
  const isApprover = ['admin', 'manager'].includes(user?.role);
  const isFinance  = ['admin', 'manager', 'finance'].includes(user?.role);
  const isStaff    = ['admin', 'manager', 'operations', 'sales', 'customer_service'].includes(user?.role);

  const [shipment, setShipment]   = useState(null);
  const [docs, setDocs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [editingMs, setEditingMs] = useState(null);
  const [approvalAction, setApprovalAction] = useState(null);
  const [printingBL, setPrintingBL] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [{ shipment: s }, { items }] = await Promise.all([
        shipmentsApi.get(id),
        documentsApi.list({ shipmentId: id }).catch(() => ({ items: [] })),
      ]);
      setShipment(s);
      setDocs(items || []);
    } catch (ex) {
      setError(ex.response?.data?.message || 'Failed to load shipment');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const currentMsIdx = useMemo(() => {
    if (!shipment?.milestones?.length) return -1;
    const ip = shipment.milestones.findIndex((m) => m.status === 'in_progress');
    if (ip !== -1) return ip;
    const lastDone = shipment.milestones.map((m, i) => ({ s: m.status, i }))
      .filter((x) => x.s === 'completed').pop();
    return lastDone ? lastDone.i + 1 : 0;
  }, [shipment]);

  const completedMs = useMemo(
    () => shipment?.milestones?.filter((m) => m.status === 'completed').length || 0,
    [shipment]
  );
  const totalMs = shipment?.milestones?.length || 0;
  const msPct   = totalMs > 0 ? Math.round((completedMs / totalMs) * 100) : 0;

  const charges = shipment?.charges || [];
  const revenue = charges.filter((c) => c.type === 'revenue')
    .reduce((s, c) => s + (c.amount || 0) * (c.exchangeRate || 1) * (c.quantity || 1), 0);
  const cost = charges.filter((c) => c.type === 'cost')
    .reduce((s, c) => s + (c.amount || 0) * (c.exchangeRate || 1) * (c.quantity || 1), 0);
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue * 100).toFixed(1) : '0.0';

  const handlePrintBL = async () => {
    setPrintingBL(true);
    try { await shipmentsApi.printBL(id); }
    catch { /* handled internally */ }
    finally { setPrintingBL(false); }
  };

  if (loading) {
    return (
      <div className="ss-loading" style={{ minHeight: 400 }}>
        <div className="dashboard-loader">
          <div className="dashboard-loader-ring"></div>
          <i className="bi bi-box-seam dashboard-loader-icon"></i>
        </div>
        <span>Loading shipment…</span>
      </div>
    );
  }
  if (error) return <div className="py-4"><div className="alert alert-danger">{error}</div></div>;
  if (!shipment) return null;

  const sc  = STATUS_CONFIG[shipment.status]         || { color: '#6b7280', bg: '#f3f4f6', label: shipment.status };
  const apc = APPROVAL_CONFIG[shipment.approvalStatus] || APPROVAL_CONFIG.pending;

  const TABS = [
    { key: 'overview',   label: 'Overview',   icon: 'bi-info-circle' },
    { key: 'milestones', label: 'Milestones', icon: 'bi-signpost-split', badge: totalMs },
    { key: 'tracking',   label: 'Tracking',   icon: 'bi-broadcast',
      show: ['sea', 'air', 'multimodal'].includes(shipment?.mode) },
    { key: 'tasks',      label: 'Tasks',      icon: 'bi-check2-square' },
    { key: 'charges',    label: 'Charges',    icon: 'bi-currency-dollar', badge: charges.length, roles: ['admin','manager','operations','sales','finance'] },
    { key: 'documents',  label: 'Documents',  icon: 'bi-file-earmark-text', badge: docs.length },
  ]
    .filter((t) => !t.roles || t.roles.includes(user?.role))
    .filter((t) => t.show === undefined || t.show);

  return (
    <div>
      {/* ── Page header ───────────────────────────────────────── */}
      <div className="ss-page-header">
        <div>
          <Link to="/shipments" className="text-decoration-none small" style={{ color: 'var(--bs-secondary-color)' }}>
            <i className="bi bi-arrow-left me-1"></i>All Shipments
          </Link>
          <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
            <h4 className="ss-page-title mb-0">{shipment.shipmentNumber}</h4>
            <span className="sd-status-pill" style={{ color: sc.color, background: sc.bg }}>{sc.label}</span>
            <span className="sd-status-pill" style={{ color: apc.color, background: apc.bg }}>
              <i className={`bi ${apc.icon}`}></i>{apc.label}
            </span>
          </div>
          <div className="ss-page-sub mt-1">
            {[
              shipment.mode?.toUpperCase(),
              shipment.direction?.replace('_', ' '),
              shipment.type,
              shipment.mblNumber && `MBL: ${shipment.mblNumber}`,
              shipment.hblNumber && `HBL: ${shipment.hblNumber}`,
              shipment.awbNumber && `AWB: ${shipment.awbNumber}`,
            ].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="ss-header-actions">
          {isStaff && (
            <button className="ss-action-btn" onClick={handlePrintBL} disabled={printingBL}>
              <i className="bi bi-printer me-2"></i>{printingBL ? 'Generating…' : 'Print BL'}
            </button>
          )}
          {isStaff && (
            <Link to={`/shipments/${id}/edit`} className="ss-action-btn">
              <i className="bi bi-pencil me-2"></i>Edit
            </Link>
          )}
          {isApprover && shipment.approvalStatus === 'pending' && (
            <>
              <button
                className="ss-action-btn ss-action-btn-primary"
                onClick={() => setApprovalAction('approve')}
              >
                <i className="bi bi-check-lg me-2"></i>Approve
              </button>
              <button
                className="ss-action-btn"
                style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                onClick={() => setApprovalAction('reject')}
              >
                <i className="bi bi-x-lg me-2"></i>Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Progress bar ──────────────────────────────────────── */}
      <div className="erp-card mb-4">
        <div className="erp-card-body" style={{ padding: '12px 20px' }}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--bs-secondary-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Shipment Progress
            </span>
            <span style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>
              {completedMs}/{totalMs} milestones ·{' '}
              <strong style={{ color: 'var(--brand)' }}>{msPct}%</strong>
            </span>
          </div>
          <div className="sd-progress-track">
            <div className="sd-progress-fill" style={{ width: `${msPct}%` }} />
          </div>
        </div>
      </div>

      {/* ── 4-tile KPI strip ──────────────────────────────────── */}
      <div className="inv-summary-strip mb-4">
        <div className="inv-summary-tile">
          <div className="inv-summary-label"><i className="bi bi-geo me-1"></i>Origin</div>
          <div className="inv-summary-value" style={{ fontSize: '1rem' }}>
            {shipment.portOfLoading?.code || '—'}
          </div>
          <div className="inv-summary-sub">
            {shipment.portOfLoading?.name || shipment.portOfLoading?.city || '—'}
          </div>
        </div>
        <div className="inv-summary-tile">
          <div className="inv-summary-label"><i className="bi bi-geo-fill me-1"></i>Destination</div>
          <div className="inv-summary-value" style={{ fontSize: '1rem' }}>
            {shipment.portOfDischarge?.code || '—'}
          </div>
          <div className="inv-summary-sub">
            {shipment.portOfDischarge?.name || shipment.portOfDischarge?.city || '—'}
          </div>
        </div>
        <div className="inv-summary-tile">
          <div className="inv-summary-label"><i className="bi bi-calendar-check me-1"></i>ETD</div>
          <div className="inv-summary-value" style={{ fontSize: '1rem' }}>{fmt(shipment.etd)}</div>
          <div className="inv-summary-sub">
            {shipment.atd ? `ATD: ${fmt(shipment.atd)}` : 'Actual pending'}
          </div>
        </div>
        <div className="inv-summary-tile">
          <div className="inv-summary-label"><i className="bi bi-calendar2-check me-1"></i>ETA</div>
          <div className="inv-summary-value" style={{ fontSize: '1rem' }}>{fmt(shipment.eta)}</div>
          <div className="inv-summary-sub">
            {shipment.ata ? `ATA: ${fmt(shipment.ata)}` : 'Actual pending'}
          </div>
        </div>
      </div>

      {/* ── Tabbed card ───────────────────────────────────────── */}
      <div className="erp-card">
        <div className="sd-tab-nav">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`sd-tab-btn${activeTab === t.key ? ' active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              <i className={`bi ${t.icon}`}></i>
              {t.label}
              {t.badge > 0 && <span className="sd-tab-badge">{t.badge}</span>}
            </button>
          ))}
        </div>

        <div className="erp-card-body">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <Row className="g-4">
              <Col lg={4}>
                <div className="sd-section-title">Parties</div>
                {[
                  { label: 'Shipper',      value: shipment.shipper?.companyName },
                  { label: 'Consignee',    value: shipment.consignee?.companyName },
                  { label: 'Notify Party', value: shipment.notifyParty?.companyName },
                  { label: 'Customer',     value: shipment.customer?.companyName },
                ].map(({ label, value }) => <InfoRow key={label} label={label} value={value} />)}

                <div className="sd-section-title">Commercial</div>
                {[
                  { label: 'Incoterm',      value: shipment.incoterm },
                  { label: 'Payment Terms', value: shipment.paymentTerms },
                  { label: 'Invoice Value', value: shipment.invoiceValue
                      ? `${shipment.invoiceCurrency || 'USD'} ${Number(shipment.invoiceValue).toLocaleString()}`
                      : null },
                ].map(({ label, value }) => <InfoRow key={label} label={label} value={value} />)}
              </Col>

              <Col lg={4}>
                <div className="sd-section-title">Routing</div>
                {[
                  { label: 'Place of Receipt',  value: shipment.placeOfReceipt?.name  || shipment.placeOfReceipt?.city },
                  { label: 'Port of Loading',   value: shipment.portOfLoading?.name },
                  { label: 'Transhipment',      value: shipment.transhipmentPort?.name },
                  { label: 'Port of Discharge', value: shipment.portOfDischarge?.name },
                  { label: 'Place of Delivery', value: shipment.placeOfDelivery?.name || shipment.placeOfDelivery?.city },
                ].map(({ label, value }) => <InfoRow key={label} label={label} value={value} />)}

                <div className="sd-section-title">Carrier</div>
                {[
                  { label: 'Carrier',       value: shipment.carrier },
                  { label: 'Vessel',        value: shipment.vesselName },
                  { label: 'Voyage',        value: shipment.voyageNumber },
                  { label: 'Flight Number', value: shipment.flightNumber },
                  { label: 'Booking No.',   value: shipment.bookingNumber },
                ].map(({ label, value }) => <InfoRow key={label} label={label} value={value} />)}
              </Col>

              <Col lg={4}>
                <div className="sd-section-title">Cargo</div>
                {[
                  { label: 'Total Packages',    value: shipment.totalPackages },
                  { label: 'Gross Weight',      value: shipment.totalGrossWeight ? `${shipment.totalGrossWeight} KG` : null },
                  { label: 'Net Weight',        value: shipment.totalNetWeight  ? `${shipment.totalNetWeight} KG`  : null },
                  { label: 'Volume',            value: shipment.totalVolume     ? `${shipment.totalVolume} CBM`    : null },
                  { label: 'Chargeable Wt.',   value: shipment.chargeableWeight ? `${shipment.chargeableWeight} KG` : null },
                  { label: 'Containers',        value: shipment.containers?.length ? `${shipment.containers.length} unit(s)` : null },
                ].map(({ label, value }) => <InfoRow key={label} label={label} value={value} />)}

                {isFinance && (
                  <>
                    <div className="sd-section-title">Financials</div>
                    {[
                      { label: 'Revenue', value: fmtMoney(shipment.totalRevenue) },
                      { label: 'Cost',    value: fmtMoney(shipment.totalCost) },
                      { label: 'Profit',  value: fmtMoney(shipment.profit) },
                      { label: 'Margin',  value: shipment.profitMargin ? `${shipment.profitMargin.toFixed(1)}%` : null },
                    ].map(({ label, value }) => <InfoRow key={label} label={label} value={value} />)}
                  </>
                )}

                {shipment.approvedBy && (
                  <>
                    <div className="sd-section-title">Approval</div>
                    <InfoRow label="Status" value={
                      <span style={{ color: apc.color, fontWeight: 700 }}>{apc.label}</span>
                    } />
                    <InfoRow label="Date" value={fmt(shipment.approvedAt)} />
                    {shipment.approvalNote && <InfoRow label="Note" value={shipment.approvalNote} />}
                  </>
                )}
              </Col>
            </Row>
          )}

          {/* ── MILESTONES ── */}
          {activeTab === 'milestones' && (
            <Row>
              <Col lg={8}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted small">
                    <strong style={{ color: 'var(--brand)' }}>{completedMs}</strong> of {totalMs} milestones completed
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)' }}>{msPct}%</span>
                </div>
                <div className="sd-progress-track mb-4">
                  <div className="sd-progress-fill" style={{ width: `${msPct}%` }} />
                </div>

                {shipment.milestones?.length ? (
                  <div className="milestone-timeline">
                    {shipment.milestones.map((m, i) => {
                      const isCurrent = i === currentMsIdx && m.status !== 'completed';
                      const msKey = isCurrent && m.status === 'pending' ? 'in_progress' : m.status;
                      return (
                        <div key={m._id} className={`milestone-item${m.status === 'completed' ? ' done' : ''}`}>
                          <span className={`milestone-dot ${m.status}`}></span>
                          <div className="d-flex justify-content-between align-items-start gap-2">
                            <div className="flex-grow-1">
                              <div className="d-flex align-items-center gap-2 flex-wrap">
                                <i
                                  className={`bi ${MS_ICON[msKey] || 'bi-circle'}`}
                                  style={{ color: MS_COLOR[msKey] || '#d1d5db', fontSize: 14 }}
                                ></i>
                                <span className={`fw-semibold${m.status === 'skipped' ? ' text-muted' : ''}`} style={{ fontSize: 13 }}>
                                  {m.event}
                                </span>
                                {m.status !== 'pending' && (
                                  <span style={{
                                    fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                                    background: (MS_COLOR[m.status] || '#d1d5db') + '22',
                                    color: MS_COLOR[m.status] || '#6b7280',
                                  }}>
                                    {m.status.replace('_', ' ')}
                                  </span>
                                )}
                              </div>
                              <div className="small text-muted ms-4 mt-1">
                                {m.location && <span><i className="bi bi-geo-alt me-1"></i>{m.location} · </span>}
                                {m.actualDate
                                  ? <span style={{ color: '#16a34a' }}>Completed {fmt(m.actualDate)}</span>
                                  : m.plannedDate
                                  ? <span>Planned {fmt(m.plannedDate)}</span>
                                  : 'No date set'}
                              </div>
                              {m.remarks && <small className="text-muted fst-italic ms-4 d-block">{m.remarks}</small>}
                            </div>
                            {isOps && (
                              <button
                                className="ss-action-btn"
                                style={{ fontSize: 11, padding: '3px 10px' }}
                                onClick={() => setEditingMs(m)}
                              >
                                <i className="bi bi-pencil me-1"></i>Update
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="dash-empty-state">
                    <i className="bi bi-signpost-split"></i>
                    <div>No milestones recorded</div>
                  </div>
                )}
              </Col>

              {shipment.containers?.length > 0 && (
                <Col lg={4}>
                  <div className="sd-section-title">Containers ({shipment.containers.length})</div>
                  {shipment.containers.map((c) => (
                    <div key={c._id} className="sd-container-card">
                      <div className="d-flex justify-content-between align-items-center">
                        <strong className="font-monospace" style={{ fontSize: 13 }}>
                          {c.containerNumber || 'TBA'}
                        </strong>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', background: 'var(--surface-2)',
                          borderRadius: 6, fontWeight: 600,
                        }}>{c.containerType}</span>
                      </div>
                      {c.sealNumber  && <div className="text-muted small mt-1">Seal: {c.sealNumber}</div>}
                      {c.grossWeight && <div className="text-muted small">GW: {c.grossWeight} KG · CBM: {c.cbm || '—'}</div>}
                    </div>
                  ))}
                </Col>
              )}
            </Row>
          )}

          {/* ── TRACKING ── */}
          {activeTab === 'tracking' && (
            <TrackingPanel shipmentId={shipment._id} shipment={shipment} />
          )}

          {/* ── TASKS ── */}
          {activeTab === 'tasks' && (
            <TasksPanel shipmentId={shipment._id} shipmentNumber={shipment.shipmentNumber} />
          )}

          {/* ── CHARGES ── */}
          {activeTab === 'charges' && (
            <div>
              <div className="sd-charge-pnl">
                {[
                  { label: 'Total Revenue', value: fmtMoney(revenue), color: '#16a34a', icon: 'bi-arrow-up-circle-fill' },
                  { label: 'Total Cost',    value: fmtMoney(cost),    color: '#dc2626', icon: 'bi-arrow-down-circle-fill' },
                  { label: 'Gross Profit',  value: fmtMoney(profit),  color: profit >= 0 ? '#2563eb' : '#dc2626', icon: 'bi-graph-up' },
                  { label: 'Margin',        value: `${margin}%`,      color: parseFloat(margin) >= 15 ? '#16a34a' : '#d97706', icon: 'bi-percent' },
                ].map(({ label, value, color, icon }) => (
                  <div key={label} className="sd-charge-kpi">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <i className={`bi ${icon}`} style={{ color, fontSize: 14 }}></i>
                      <span className="sd-charge-kpi-label">{label}</span>
                    </div>
                    <div className="sd-charge-kpi-value" style={{ color }}>{value}</div>
                  </div>
                ))}
              </div>

              {charges.filter((c) => c.type === 'revenue').length > 0 && (
                <div className="mb-4">
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#16a34a', marginBottom: 8 }}>
                    <i className="bi bi-arrow-up-circle me-2"></i>Revenue Lines
                  </div>
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Description</th><th>Category</th>
                        <th className="text-end">Amount</th><th className="text-end">Qty</th>
                        <th className="text-center">FX</th><th className="text-end">Total (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {charges.filter((c) => c.type === 'revenue').map((c) => (
                        <tr key={c._id}>
                          <td>{c.description}</td>
                          <td>
                            <span style={{ fontSize: 11, padding: '1px 7px', background: 'var(--surface-2)', borderRadius: 4, fontWeight: 600 }}>
                              {c.category}
                            </span>
                          </td>
                          <td className="text-end font-monospace small">
                            {c.currency} {(c.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="text-end">{c.quantity || 1}</td>
                          <td className="text-center">{c.exchangeRate || 1}</td>
                          <td className="text-end fw-bold font-monospace" style={{ color: '#16a34a' }}>
                            {((c.amount || 0) * (c.exchangeRate || 1) * (c.quantity || 1)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {charges.filter((c) => c.type === 'cost').length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#dc2626', marginBottom: 8 }}>
                    <i className="bi bi-arrow-down-circle me-2"></i>Cost Lines
                  </div>
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Description</th><th>Category</th><th>Vendor</th>
                        <th className="text-end">Amount</th><th className="text-end">Qty</th>
                        <th className="text-center">FX</th><th className="text-end">Total (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {charges.filter((c) => c.type === 'cost').map((c) => (
                        <tr key={c._id}>
                          <td>{c.description}</td>
                          <td>
                            <span style={{ fontSize: 11, padding: '1px 7px', background: 'var(--surface-2)', borderRadius: 4, fontWeight: 600 }}>
                              {c.category}
                            </span>
                          </td>
                          <td className="text-muted small">{c.vendor?.companyName || '—'}</td>
                          <td className="text-end font-monospace small">
                            {c.currency} {(c.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="text-end">{c.quantity || 1}</td>
                          <td className="text-center">{c.exchangeRate || 1}</td>
                          <td className="text-end fw-bold font-monospace" style={{ color: '#dc2626' }}>
                            {((c.amount || 0) * (c.exchangeRate || 1) * (c.quantity || 1)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {charges.length === 0 && (
                <div className="dash-empty-state">
                  <i className="bi bi-currency-dollar"></i>
                  <div>No charges entered yet</div>
                </div>
              )}
            </div>
          )}

          {/* ── DOCUMENTS ── */}
          {activeTab === 'documents' && (
            <div>
              {docs.length === 0 ? (
                <div className="dash-empty-state">
                  <i className="bi bi-file-earmark-text"></i>
                  <div>No documents attached yet</div>
                </div>
              ) : (
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Document</th><th>Category</th><th>Uploaded</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((d) => (
                      <tr key={d._id}>
                        <td>
                          <div className="fw-semibold" style={{ fontSize: 13 }}>{d.name}</div>
                          {d.originalName && d.originalName !== d.name && (
                            <small className="text-muted">{d.originalName}</small>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: 11, padding: '1px 7px', background: 'var(--surface-2)', borderRadius: 4 }}>
                            {d.category?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="text-muted small">{fmt(d.createdAt)}</td>
                        <td className="text-end">
                          <button
                            className="ss-action-btn"
                            style={{ fontSize: 11 }}
                            onClick={() => documentsApi.download(d._id, d.originalName || d.name)}
                          >
                            <i className="bi bi-download me-1"></i>Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Modals */}
      {editingMs && (
        <MilestoneEditModal
          milestone={editingMs}
          shipmentId={shipment._id}
          onClose={() => setEditingMs(null)}
          onSaved={() => { setEditingMs(null); load(); }}
        />
      )}
      {approvalAction && (
        <ApprovalModal
          shipmentId={shipment._id}
          action={approvalAction}
          onClose={() => setApprovalAction(null)}
          onSaved={() => { setApprovalAction(null); load(); }}
        />
      )}
    </div>
  );
};

export default ShipmentDetail;
