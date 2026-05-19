import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Modal, Form, Alert } from 'react-bootstrap';
import { shipmentsApi, documentsApi, tasksApi, usersApi } from '../api';
import { useAuth } from '../context/AuthContext';
import VesselMap from '../components/tracking/VesselMap';

/* ── Helpers ─────────────────────────────────────────────────── */
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const fmtMoney = (n, cur = 'USD') =>
  n != null ? `${cur} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—';

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

const STATUS_ORDER = [
  'quote','booked','pickup_scheduled','cargo_received','customs_export',
  'loaded','in_transit','transhipment','arrived','customs_import',
  'cleared','out_for_delivery','delivered','completed',
];

const MODE_CONFIG = {
  sea:        { icon: 'bi-water',       color: '#1a56db', label: 'SEA' },
  air:        { icon: 'bi-airplane',    color: '#dc2626', label: 'AIR' },
  road:       { icon: 'bi-truck',       color: '#059669', label: 'ROAD' },
  rail:       { icon: 'bi-train-front', color: '#7c3aed', label: 'RAIL' },
  multimodal: { icon: 'bi-diagram-3',   color: '#d97706', label: 'MULTI' },
  courier:    { icon: 'bi-box',         color: '#0891b2', label: 'CUR' },
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
const MS_ICON_BOX = {
  completed:   { icon: 'bi-bookmark-fill', bg: '#ecfdf5', color: '#059669' },
  in_progress: { icon: 'bi-play-fill',     bg: '#eff6ff', color: '#2563eb' },
  delayed:     { icon: 'bi-exclamation',   bg: '#fffbeb', color: '#d97706' },
  skipped:     { icon: 'bi-dash',          bg: '#f9fafb', color: '#9ca3af' },
  pending:     { icon: 'bi-circle',        bg: 'var(--surface-2)', color: 'var(--muted)' },
};

const DOC_STATUS_MAP = { signed: 'signed', completed: 'signed', sent: 'sent', pending: 'pending', draft: 'pending' };

/* ── Milestone Edit Modal ────────────────────────────────────── */
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
          <div className="row g-3">
            <div className="col-12">
              <Form.Label>Status</Form.Label>
              <Form.Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['pending','in_progress','completed','delayed','skipped'].map((s) => (
                  <option key={s} value={s}>{s.replace('_',' ').replace(/^\w/, c => c.toUpperCase())}</option>
                ))}
              </Form.Select>
            </div>
            <div className="col-sm-6">
              <Form.Label>Planned Date</Form.Label>
              <Form.Control type="date" value={form.plannedDate}
                onChange={(e) => setForm({ ...form, plannedDate: e.target.value })} />
            </div>
            <div className="col-sm-6">
              <Form.Label>Actual Date</Form.Label>
              <Form.Control type="date" value={form.actualDate}
                onChange={(e) => setForm({ ...form, actualDate: e.target.value })} />
            </div>
            <div className="col-12">
              <Form.Label>Location</Form.Label>
              <Form.Control value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="col-12">
              <Form.Label>Remarks</Form.Label>
              <Form.Control as="textarea" rows={2} value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-brand" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

/* ── Approval Modal ──────────────────────────────────────────── */
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
              ? <><i className="bi bi-check-circle text-success me-2" />Approve Shipment</>
              : <><i className="bi bi-x-circle text-danger me-2" />Reject Shipment</>}
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
          <button type="button" className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className={`btn ${action === 'approve' ? 'btn-brand' : ''}`}
            style={action !== 'approve' ? { background: '#dc2626', color: '#fff', border: 'none' } : {}}
            disabled={saving}>
            {saving ? 'Processing…' : action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

/* ── Update Status Modal ─────────────────────────────────────── */
const UpdateStatusModal = ({ shipment, onClose, onSaved }) => {
  const [status, setStatus] = useState(shipment.status);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setErr('');
    try {
      await shipmentsApi.update(shipment._id, { status });
      onSaved();
    } catch (ex) { setErr(ex.response?.data?.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  return (
    <Modal show onHide={onClose} centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton><Modal.Title>Update Shipment Status</Modal.Title></Modal.Header>
        <Modal.Body>
          {err && <Alert variant="danger" className="py-2">{err}</Alert>}
          <Form.Group>
            <Form.Label>New Status</Form.Label>
            <Form.Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-brand" disabled={saving}>
            {saving ? 'Updating…' : 'Update Status'}
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

/* ── Tasks Panel ─────────────────────────────────────────────── */
const PRIORITY_META = {
  urgent: { color: '#dc2626', bg: '#fef2f2' },
  high:   { color: '#d97706', bg: '#fffbeb' },
  normal: { color: '#2563eb', bg: '#eff6ff' },
  low:    { color: '#6b7280', bg: '#f9fafb' },
};

/* ── Tracking Panel ──────────────────────────────────────────── */
const EVT_ICON = {
  completed: { icon: 'bi-check-circle-fill', color: '#16a34a' },
  detected:  { icon: 'bi-broadcast',         color: '#2563eb' },
};

const TrackingPanel = ({ shipmentId, shipment }) => {
  const [tracking, setTracking] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0' }}>
      <div className="dashboard-loader">
        <div className="dashboard-loader-ring" />
        <i className="bi bi-broadcast dashboard-loader-icon" />
      </div>
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>Fetching tracking data…</span>
    </div>
  );
  if (error) return <div className="chip chip-danger" style={{ padding: '10px 16px' }}>{error}</div>;
  if (!tracking) return null;

  const showMap = tracking.origin && tracking.destination && tracking.vesselPosition;
  const sortedEvents = [...(tracking.events || [])].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            Provider: <span style={{ color: 'var(--brand)', textTransform: 'capitalize' }}>{tracking.provider}</span>
          </div>
          {tracking.trackingNumber && (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Ref: {tracking.trackingNumber}</div>
          )}
        </div>
        <button className="sd-btn" onClick={load}>
          <i className="bi bi-arrow-clockwise" /> Refresh
        </button>
      </div>

      {showMap && (
        <div className="card card-flush mb-4" style={{ overflow: 'hidden' }}>
          <VesselMap
            origin={tracking.origin}
            destination={tracking.destination}
            vesselPosition={tracking.vesselPosition}
            mode={shipment.mode}
          />
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 12 }}>
        Tracking Events
      </div>
      {sortedEvents.length === 0 ? (
        <div className="dash-empty-state">
          <i className="bi bi-broadcast" style={{ fontSize: 28, opacity: 0.3 }} />
          <div>No tracking events yet</div>
        </div>
      ) : sortedEvents.map((ev, i) => {
        const meta = EVT_ICON[ev.status] || EVT_ICON.detected;
        return (
          <div key={i} className="sd-ms-item" style={{ paddingBottom: 10 }}>
            <div className="sd-ms-icon" style={{ background: `${meta.color}15`, color: meta.color }}>
              <i className={`bi ${meta.icon}`} />
            </div>
            <div className="sd-ms-body">
              <div className="sd-ms-name">{ev.event}</div>
              <div className="sd-ms-sub">
                {ev.location && <><i className="bi bi-geo-alt me-1" />{ev.location} · </>}
                {new Date(ev.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── Tasks Panel ─────────────────────────────────────────────── */
const TasksPanel = ({ shipmentId, shipmentNumber }) => {
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [users, setUsers]       = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm]         = useState({ title: '', priority: 'normal', assignedTo: '', dueAt: '' });
  const [saving, setSaving]     = useState(false);

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
    e.preventDefault(); setSaving(true);
    try {
      await tasksApi.create({
        title: form.title, priority: form.priority,
        assignedTo: form.assignedTo || undefined,
        dueAt: form.dueAt || undefined,
        linkedTo: { kind: 'Shipment', id: shipmentId, label: shipmentNumber },
      });
      setForm({ title: '', priority: 'normal', assignedTo: '', dueAt: '' });
      setCreating(false); load();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const quickDone = async (taskId) => { await tasksApi.complete(taskId); load(); };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
      <div className="spinner-border spinner-border-sm" style={{ color: 'var(--brand)' }} />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} linked to this shipment
        </span>
        <button className="btn" style={{ fontSize: 13 }} onClick={() => setCreating((x) => !x)}>
          <i className="bi bi-plus me-1" />Add Task
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="card mb-3" style={{ padding: 16, background: 'var(--surface-2)' }}>
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
              <button type="submit" className="btn btn-brand btn-sm" disabled={saving}>
                {saving ? 'Saving…' : 'Create Task'}
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </div>
        </form>
      )}

      {tasks.length === 0 && !creating && (
        <div className="dash-empty-state">
          <i className="bi bi-check2-square" style={{ fontSize: 32 }} />
          <div>No tasks yet</div>
          <span>Create one or configure workflow rules to generate them automatically.</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map((task) => {
          const pm   = PRIORITY_META[task.priority] || PRIORITY_META.normal;
          const done = task.status === 'done' || task.status === 'cancelled';
          return (
            <div key={task._id} className="card" style={{ padding: '10px 14px', opacity: done ? 0.6 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 1 }}
                  onClick={() => !done && quickDone(task._id)} title={done ? task.status : 'Mark done'}>
                  <i className={`bi ${done ? 'bi-check-circle-fill' : 'bi-circle'}`}
                    style={{ fontSize: 18, color: done ? '#16a34a' : 'var(--muted)' }} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)',
                    textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--muted)' : 'var(--ink)' }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {task.assignedTo?.name && <><i className="bi bi-person me-1" />{task.assignedTo.name} · </>}
                    {task.dueAt && new Date(task.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                  background: pm.bg, color: pm.color, flexShrink: 0 }}>
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

/* ── Main Component ──────────────────────────────────────────── */
const ShipmentDetail = () => {
  const { id }       = useParams();
  const { user }     = useAuth();
  const navigate     = useNavigate();

  const isOps      = ['admin', 'manager', 'operations'].includes(user?.role);
  const isApprover = ['admin', 'manager'].includes(user?.role);
  const isFinance  = ['admin', 'manager', 'finance'].includes(user?.role);
  const isStaff    = ['admin', 'manager', 'operations', 'sales', 'customer_service'].includes(user?.role);

  const [shipment,      setShipment]     = useState(null);
  const [docs,          setDocs]         = useState([]);
  const [loading,       setLoading]      = useState(true);
  const [error,         setError]        = useState('');
  const [activeTab,     setActiveTab]    = useState('overview');
  const [editingMs,     setEditingMs]    = useState(null);
  const [approvalAction,setApprovalAction] = useState(null);
  const [showUpdateStatus,setShowUpdateStatus] = useState(false);
  const [printingBL,    setPrintingBL]   = useState(false);

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

  const transitDays = shipment?.etd && shipment?.eta
    ? Math.ceil((new Date(shipment.eta) - new Date(shipment.etd)) / 86400000)
    : null;

  const handlePrintBL = async () => {
    setPrintingBL(true);
    try { await shipmentsApi.printBL(id); }
    catch { /* handled internally */ }
    finally { setPrintingBL(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
      <div className="dashboard-loader">
        <div className="dashboard-loader-ring" />
        <i className="bi bi-box-seam dashboard-loader-icon" />
      </div>
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>Loading shipment…</span>
    </div>
  );
  if (error) return <div className="page"><div className="chip chip-danger" style={{ padding: '10px 16px' }}>{error}</div></div>;
  if (!shipment) return null;

  const sc  = STATUS_CONFIG[shipment.status] || { color: '#6b7280', bg: '#f3f4f6', label: shipment.status };
  const mc  = MODE_CONFIG[shipment.mode]     || { icon: 'bi-box', color: '#6b7280', label: (shipment.mode || '?').toUpperCase() };

  const polCode = shipment.portOfLoading?.code  || shipment.portOfLoading?.city  || '—';
  const podCode = shipment.portOfDischarge?.code || shipment.portOfDischarge?.city || '—';
  const polCity = shipment.portOfLoading?.name  || shipment.portOfLoading?.city  || '—';
  const podCity = shipment.portOfDischarge?.name || shipment.portOfDischarge?.city || '—';

  const TABS = [
    { key: 'overview',   label: 'Overview' },
    { key: 'milestones', label: 'Milestones', badge: totalMs },
    { key: 'containers', label: 'Containers', badge: shipment.containers?.length || 0 },
    { key: 'documents',  label: 'Documents',  badge: docs.length },
    ...(isFinance ? [{ key: 'financials', label: 'Financials', badge: charges.length }] : []),
    ...(['sea','air','multimodal'].includes(shipment.mode) ? [{ key: 'tracking', label: 'Tracking' }] : []),
    { key: 'messages',   label: 'Messages' },
  ];

  /* ── Revenue charge categories for Cost Summary ── */
  const revenueByCategory = charges
    .filter((c) => c.type === 'revenue')
    .reduce((acc, c) => {
      const cat = c.category || c.description || 'Other';
      acc[cat] = (acc[cat] || 0) + (c.amount || 0) * (c.exchangeRate || 1) * (c.quantity || 1);
      return acc;
    }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="sd-page-header">
        {/* Breadcrumb */}
        <div className="sd-breadcrumb">
          <Link to="/shipments">Shipments</Link>
          <i className="bi bi-chevron-right" style={{ fontSize: 10 }} />
          <span className="mono" style={{ fontSize: 12 }}>{shipment.shipmentNumber}</span>
        </div>

        {/* Title row */}
        <div className="sd-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1 className="sd-title">{shipment.shipmentNumber}</h1>
              {/* Status chip */}
              <span className="sd-chip" style={{ color: sc.color, background: sc.bg }}>
                <span className="sd-chip-dot" style={{ background: sc.color }} />
                {sc.label}
              </span>
              {/* Mode chip */}
              <span className="sd-chip" style={{ color: mc.color, background: `${mc.color}15`, border: `1px solid ${mc.color}30` }}>
                <i className={`bi ${mc.icon}`} style={{ fontSize: 11 }} />
                {mc.label}
                {shipment.direction && <span style={{ opacity: 0.6, fontSize: 10, marginLeft: 2 }}>
                  {shipment.direction === 'export' ? 'E' : shipment.direction === 'import' ? 'I' : ''}
                </span>}
              </span>
            </div>
            <div className="sd-subline">
              {[
                shipment.client?.companyName || shipment.shipper?.companyName,
                shipment.vesselName && `Vessel ${shipment.vesselName}`,
                shipment.mblNumber  && `MBL: ${shipment.mblNumber}`,
              ].filter(Boolean).join(' · ')}
            </div>
          </div>

          {/* Actions */}
          <div className="sd-actions">
            {isStaff && (
              <button className="sd-btn" onClick={() => navigate(`/shipments/${id}/edit`)}>
                <i className="bi bi-pencil" /> Edit
              </button>
            )}
            {isStaff && (
              <button className="sd-btn" onClick={handlePrintBL} disabled={printingBL}>
                <i className="bi bi-printer" /> {printingBL ? 'Generating…' : 'Print BOL'}
              </button>
            )}
            {isStaff && (
              <button className="sd-btn">
                <i className="bi bi-envelope" /> Send docs
              </button>
            )}
            {isApprover && shipment.approvalStatus === 'pending' && (
              <>
                <button className="sd-btn" onClick={() => setApprovalAction('approve')}
                  style={{ color: '#16a34a', borderColor: '#86efac' }}>
                  <i className="bi bi-check-lg" /> Approve
                </button>
                <button className="sd-btn" onClick={() => setApprovalAction('reject')}
                  style={{ color: '#dc2626', borderColor: '#fca5a5' }}>
                  <i className="bi bi-x-lg" /> Reject
                </button>
              </>
            )}
            {isOps && (
              <button className="sd-btn sd-btn-primary" onClick={() => setShowUpdateStatus(true)}>
                <i className="bi bi-arrow-repeat" /> Update Status
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Route Hero Card ───────────────────────────────────── */}
      <div className="sd-hero">
        <div className="sd-hero-route">
          {/* Origin */}
          <div className="sd-hero-port">
            <div className="sd-hero-port-label">Origin</div>
            <div className="sd-hero-port-code">{polCode}</div>
            <div className="sd-hero-port-city">{polCity}</div>
            <div className="sd-hero-port-date">
              <span>ETD </span>{fmt(shipment.etd)}
            </div>
          </div>

          {/* Center */}
          <div className="sd-hero-center">
            <i className={`bi ${mc.icon} sd-hero-mode-icon`} style={{ color: mc.color }} />
            {transitDays && <div className="sd-hero-transit">{transitDays}d transit</div>}
            <div className="sd-transit-bar">
              <div className="sd-transit-fill" style={{ width: `${msPct}%` }} />
            </div>
            <div className="sd-hero-status">{sc.label}</div>
          </div>

          {/* Destination */}
          <div className="sd-hero-port sd-hero-port-right">
            <div className="sd-hero-port-label">Destination</div>
            <div className="sd-hero-port-code">{podCode}</div>
            <div className="sd-hero-port-city">{podCity}</div>
            <div className="sd-hero-port-date">
              <span>ETA </span>{fmt(shipment.eta)}
            </div>
          </div>
        </div>

      </div>

      {/* ── Tab Nav ───────────────────────────────────────────── */}
      <div className="sd-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`sd-tab-btn${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
            {t.badge > 0 && <span className="sd-tab-badge">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── Tab Body ──────────────────────────────────────────── */}
      <div className="sd-tab-body">

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="sd-2col">
            {/* Left: Milestones */}
            <div className="sd-card">
              <div className="sd-ms-header">
                <div className="sd-card-title" style={{ margin: 0 }}>Milestones</div>
                <span className="sd-ms-count">{completedMs} of {totalMs} complete</span>
              </div>

              {totalMs === 0 ? (
                <div className="dash-empty-state" style={{ padding: '32px 0' }}>
                  <i className="bi bi-signpost-split" style={{ fontSize: 28, opacity: 0.3 }} />
                  <span>No milestones recorded</span>
                </div>
              ) : (
                <div className="sd-ms-list">
                  {shipment.milestones.map((m, i) => {
                    const isCurrent = i === currentMsIdx && m.status !== 'completed';
                    const msKey     = isCurrent && m.status === 'pending' ? 'in_progress' : m.status;
                    const box       = MS_ICON_BOX[msKey] || MS_ICON_BOX.pending;
                    const isLast    = i === shipment.milestones.length - 1;
                    return (
                      <div key={m._id || i} className={`sd-ms-item${isLast ? ' last' : ''}`}>
                        <div className="sd-ms-icon-wrap">
                          <div className="sd-ms-icon" style={{ background: box.bg, color: box.color }}>
                            <i className={`bi ${box.icon}`} style={{ fontSize: 14 }} />
                          </div>
                          {!isLast && <div className="sd-ms-connector" />}
                        </div>
                        <div className="sd-ms-body">
                          <div className="sd-ms-name">{m.event}</div>
                          <div className="sd-ms-sub">
                            {m.location ? m.location : m.remarks ? m.remarks : msKey === 'pending' ? 'Pending' : msKey.replace('_', ' ')}
                          </div>
                        </div>
                        <div className={`sd-ms-date${m.status === 'completed' ? ' done' : ''}`}>
                          {m.actualDate ? fmt(m.actualDate) : m.plannedDate ? fmt(m.plannedDate) : '—'}
                        </div>
                        {isOps && (
                          <button className="sd-ms-edit-btn" onClick={() => setEditingMs(m)} title="Edit milestone">
                            <i className="bi bi-pencil" style={{ fontSize: 11 }} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Details + Costs + Documents */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Shipment Details */}
              <div className="sd-card">
                <div className="sd-card-title">Shipment Details</div>
                {[
                  { label: 'Mode',       value: `${shipment.mode || '—'} · ${shipment.direction || '—'}` },
                  { label: 'Vessel',     value: shipment.vesselName || shipment.flightNumber || '—' },
                  { label: 'Containers', value: shipment.containers?.length ? `${shipment.containers.length}` : '—' },
                  { label: 'Weight',     value: shipment.totalGrossWeight ? `${Number(shipment.totalGrossWeight).toLocaleString()} kg` : '—' },
                  { label: 'Commodity',  value: shipment.commodity || shipment.goodsDescription || '—' },
                  { label: 'Incoterms', value: shipment.incoterm || '—' },
                  { label: 'Booking No.', value: shipment.bookingNumber || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="sd-row">
                    <span className="sd-row-label">{label}</span>
                    <span className="sd-row-value">{value}</span>
                  </div>
                ))}
              </div>

              {/* Cost Summary */}
              {isFinance && (
                <div className="sd-card">
                  <div className="sd-card-title">Cost Summary</div>
                  {Object.entries(revenueByCategory).map(([cat, amt]) => (
                    <div key={cat} className="sd-row">
                      <span className="sd-row-label" style={{ textTransform: 'capitalize' }}>
                        {cat.replace(/_/g, ' ')}
                      </span>
                      <span className="sd-row-value mono">${amt.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    </div>
                  ))}
                  {charges.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', padding: '8px 0' }}>No charges entered yet</div>
                  )}
                  <div className="sd-cost-total">
                    <span>Total billed</span>
                    <span className="mono" style={{ color: 'var(--brand)' }}>
                      ${revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="sd-cost-margin">
                    <span>Margin</span>
                    <span className="mono">
                      ${profit.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({margin}%)
                    </span>
                  </div>
                </div>
              )}

              {/* Documents quick list */}
              {docs.length > 0 && (
                <div className="sd-card">
                  <div className="sd-card-title">Documents</div>
                  {docs.slice(0, 6).map((d) => {
                    const statusKey = DOC_STATUS_MAP[d.status] || 'pending';
                    return (
                      <div key={d._id} className="sd-doc-row">
                        <div className="sd-doc-name">
                          <i className={`bi bi-file-earmark-text sd-doc-icon`} />
                          {d.name}
                        </div>
                        <span className={`sd-doc-status ${statusKey}`}>{d.status || 'pending'}</span>
                      </div>
                    );
                  })}
                  {docs.length > 6 && (
                    <button
                      className="sd-doc-more"
                      onClick={() => setActiveTab('documents')}
                    >
                      +{docs.length - 6} more documents
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MILESTONES ── */}
        {activeTab === 'milestones' && (
          <div style={{ maxWidth: 800 }}>
            <div className="sd-ms-progress">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: 'var(--muted)' }}>
                  <strong style={{ color: 'var(--brand)' }}>{completedMs}</strong> of {totalMs} milestones completed
                </span>
                <span style={{ fontWeight: 700, color: 'var(--brand)' }}>{msPct}%</span>
              </div>
              <div className="sd-ms-progress-bar">
                <div className="sd-ms-progress-fill" style={{ width: `${msPct}%` }} />
              </div>
            </div>

            {shipment.milestones?.length ? (
              <div className="sd-ms-timeline">
                {shipment.milestones.map((m, i) => {
                  const isCurrent = i === currentMsIdx && m.status !== 'completed';
                  const msKey     = isCurrent && m.status === 'pending' ? 'in_progress' : m.status;
                  return (
                    <div key={m._id || i} className={`sd-ms-tl-item${m.status === 'completed' ? ' done' : ''}`}>
                      <div className={`sd-ms-tl-dot ${msKey}`}>
                        <i className={`bi ${MS_ICON[msKey] || 'bi-circle'}`} style={{ fontSize: 13 }} />
                      </div>
                      <div className="sd-ms-tl-content">
                        <div className="sd-ms-tl-name">
                          {m.event}
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
                        <div className="sd-ms-tl-sub">
                          {m.location && <><i className="bi bi-geo-alt me-1" />{m.location}</>}
                          {m.remarks && <span style={{ marginLeft: m.location ? 6 : 0 }}>{m.remarks}</span>}
                        </div>
                        <div className={`sd-ms-tl-date${m.actualDate ? ' actual' : ''}`}>
                          {m.actualDate
                            ? `Completed ${fmt(m.actualDate)}`
                            : m.plannedDate
                            ? `Planned ${fmt(m.plannedDate)}`
                            : 'No date set'}
                        </div>
                      </div>
                      {isOps && (
                        <button className="sd-btn" style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0 }}
                          onClick={() => setEditingMs(m)}>
                          <i className="bi bi-pencil me-1" />Update
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="dash-empty-state">
                <i className="bi bi-signpost-split" style={{ fontSize: 32, opacity: 0.3 }} />
                <div>No milestones recorded</div>
              </div>
            )}
          </div>
        )}

        {/* ── CONTAINERS ── */}
        {activeTab === 'containers' && (
          <div>
            {shipment.containers?.length ? (
              <div className="grid grid-3" style={{ gap: 16 }}>
                {shipment.containers.map((c) => (
                  <div key={c._id || c.containerNumber} className="sd-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span className="mono fw-700" style={{ fontSize: 13 }}>{c.containerNumber || 'TBA'}</span>
                      <span style={{ fontSize: 11, padding: '3px 8px', background: 'var(--surface-2)',
                        borderRadius: 6, fontWeight: 600 }}>{c.containerType}</span>
                    </div>
                    {[
                      { label: 'Seal No.',    value: c.sealNumber },
                      { label: 'Gross Weight', value: c.grossWeight ? `${c.grossWeight} KG` : null },
                      { label: 'CBM',         value: c.cbm },
                      { label: 'Packages',    value: c.numberOfPackages },
                    ].map(({ label, value }) => value ? (
                      <div key={label} className="sd-row" style={{ padding: '5px 0' }}>
                        <span className="sd-row-label">{label}</span>
                        <span className="sd-row-value">{value}</span>
                      </div>
                    ) : null)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="dash-empty-state">
                <i className="bi bi-grid-3x3-gap" style={{ fontSize: 32, opacity: 0.3 }} />
                <div>No containers on this shipment</div>
              </div>
            )}
          </div>
        )}

        {/* ── DOCUMENTS ── */}
        {activeTab === 'documents' && (
          <div>
            {docs.length === 0 ? (
              <div className="dash-empty-state">
                <i className="bi bi-file-earmark-text" style={{ fontSize: 32, opacity: 0.3 }} />
                <div>No documents attached yet</div>
              </div>
            ) : (
              <div className="card card-flush">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Uploaded</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((d) => {
                      const statusKey = DOC_STATUS_MAP[d.status] || 'pending';
                      return (
                        <tr key={d._id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <i className="bi bi-file-earmark-text" style={{ color: 'var(--muted)', fontSize: 14 }} />
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                                {d.originalName && d.originalName !== d.name && (
                                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.originalName}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--surface-2)',
                              borderRadius: 6, fontWeight: 600 }}>
                              {d.category?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td>
                            <span className={`sd-doc-status ${statusKey}`}>{d.status || 'pending'}</span>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--muted)' }}>{fmt(d.createdAt)}</td>
                          <td>
                            <button className="sd-btn" style={{ fontSize: 11, padding: '4px 10px' }}
                              onClick={() => documentsApi.download(d._id, d.originalName || d.name)}>
                              <i className="bi bi-download" /> Download
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── FINANCIALS ── */}
        {activeTab === 'financials' && isFinance && (
          <div>
            {/* KPI strip */}
            <div className="grid grid-4 mb-4" style={{ gap: 16 }}>
              {[
                { label: 'Total Revenue', value: fmtMoney(revenue), color: '#16a34a', icon: 'bi-arrow-up-circle-fill' },
                { label: 'Total Cost',    value: fmtMoney(cost),    color: '#dc2626', icon: 'bi-arrow-down-circle-fill' },
                { label: 'Gross Profit',  value: fmtMoney(profit),  color: profit >= 0 ? '#2563eb' : '#dc2626', icon: 'bi-graph-up' },
                { label: 'Margin',        value: `${margin}%`,      color: parseFloat(margin) >= 15 ? '#16a34a' : '#d97706', icon: 'bi-percent' },
              ].map(({ label, value, color, icon }) => (
                <div key={label} className="kpi">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className={`bi ${icon}`} style={{ color, fontSize: 14 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                      {label}
                    </span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
                </div>
              ))}
            </div>

            {charges.filter((c) => c.type === 'revenue').length > 0 && (
              <div className="card card-flush mb-4">
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--hairline)', fontSize: 12, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em', color: '#16a34a' }}>
                  <i className="bi bi-arrow-up-circle me-2" />Revenue Lines
                </div>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Description</th><th>Category</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'center' }}>FX</th>
                      <th style={{ textAlign: 'right' }}>Total (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charges.filter((c) => c.type === 'revenue').map((c) => (
                      <tr key={c._id}>
                        <td>{c.description}</td>
                        <td><span style={{ fontSize: 11, padding: '1px 7px', background: 'var(--surface-2)', borderRadius: 4, fontWeight: 600 }}>{c.category}</span></td>
                        <td className="mono" style={{ textAlign: 'right', fontSize: 12 }}>{c.currency} {(c.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td style={{ textAlign: 'right' }}>{c.quantity || 1}</td>
                        <td style={{ textAlign: 'center' }}>{c.exchangeRate || 1}</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                          {((c.amount || 0) * (c.exchangeRate || 1) * (c.quantity || 1)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {charges.filter((c) => c.type === 'cost').length > 0 && (
              <div className="card card-flush">
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--hairline)', fontSize: 12, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em', color: '#dc2626' }}>
                  <i className="bi bi-arrow-down-circle me-2" />Cost Lines
                </div>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Description</th><th>Category</th><th>Vendor</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'center' }}>FX</th>
                      <th style={{ textAlign: 'right' }}>Total (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charges.filter((c) => c.type === 'cost').map((c) => (
                      <tr key={c._id}>
                        <td>{c.description}</td>
                        <td><span style={{ fontSize: 11, padding: '1px 7px', background: 'var(--surface-2)', borderRadius: 4, fontWeight: 600 }}>{c.category}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{c.vendor?.companyName || '—'}</td>
                        <td className="mono" style={{ textAlign: 'right', fontSize: 12 }}>{c.currency} {(c.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td style={{ textAlign: 'right' }}>{c.quantity || 1}</td>
                        <td style={{ textAlign: 'center' }}>{c.exchangeRate || 1}</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
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
                <i className="bi bi-currency-dollar" style={{ fontSize: 32, opacity: 0.3 }} />
                <div>No charges entered yet</div>
              </div>
            )}
          </div>
        )}

        {/* ── TRACKING ── */}
        {activeTab === 'tracking' && (
          <TrackingPanel shipmentId={shipment._id} shipment={shipment} />
        )}

        {/* ── MESSAGES (Tasks) ── */}
        {activeTab === 'messages' && (
          <TasksPanel shipmentId={shipment._id} shipmentNumber={shipment.shipmentNumber} />
        )}

      </div>

      {/* ── Modals ──────────────────────────────────────────────── */}
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
      {showUpdateStatus && (
        <UpdateStatusModal
          shipment={shipment}
          onClose={() => setShowUpdateStatus(false)}
          onSaved={() => { setShowUpdateStatus(false); load(); }}
        />
      )}
    </div>
  );
};

export default ShipmentDetail;
