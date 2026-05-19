import { useState, useEffect, useCallback } from 'react';
import { tasksApi, usersApi } from '../api';
import { useAuth } from '../context/AuthContext';

/* ── Constants ──────────────────────────────────────────────── */
const COLS = [
  { id: 'open',        label: 'To do',       color: '#9ca3af' },
  { id: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { id: 'review',      label: 'Review',      color: '#f59e0b' },
  { id: 'done',        label: 'Done',        color: '#10b981' },
];

const PRIORITY_META = {
  urgent: { label: 'urgent', bg: '#fee2e2', color: '#dc2626' },
  high:   { label: 'high',   bg: '#ffedd5', color: '#ea580c' },
  normal: { label: 'med',    bg: 'rgba(0,0,0,0.06)', color: '#64748b' },
  low:    { label: 'low',    bg: 'rgba(0,0,0,0.06)', color: '#94a3b8' },
};

const VIEW_FILTERS = [
  { key: 'mine',      label: 'Mine' },
  { key: 'team',      label: 'Team' },
  { key: 'high_pri',  label: 'High priority' },
  { key: 'this_week', label: 'Due this week' },
  { key: 'by_ship',   label: 'By shipment' },
];

/* ── Helpers ─────────────────────────────────────────────────── */
const relDue = (d) => {
  if (!d) return null;
  const diff = Math.round((new Date(d) - Date.now()) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: '#dc2626' };
  if (diff === 0) return { label: 'Today', color: '#d97706' };
  if (diff === 1) return { label: 'Tomorrow', color: 'var(--muted)' };
  return { label: `${diff}d`, color: 'var(--muted)' };
};

const initials = (u) => {
  if (!u) return '';
  if (u.firstName) return `${u.firstName[0]}${u.lastName?.[0] || ''}`.toUpperCase();
  if (u.name) return u.name.slice(0, 2).toUpperCase();
  return '?';
};

/* ── Task Modal ──────────────────────────────────────────────── */
function TaskModal({ task, users, defaultStatus, onSave, onClose }) {
  const [form, setForm] = useState({
    title:       task?.title       || '',
    description: task?.description || '',
    priority:    task?.priority    || 'normal',
    status:      task?.status      || defaultStatus || 'open',
    assignedTo:  task?.assignedTo?._id || task?.assignedTo || '',
    dueAt:       task?.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : '',
    tags:        (task?.tags || []).join(', '),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = {
        title:       form.title,
        description: form.description || undefined,
        priority:    form.priority,
        status:      form.status,
        assignedTo:  form.assignedTo || undefined,
        dueAt:       form.dueAt || undefined,
        tags:        form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };
      if (task?._id) await tasksApi.update(task._id, body);
      else await tasksApi.create(body);
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save task');
    } finally { setSaving(false); }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '100%', maxWidth: 540,
        background: 'var(--surface)', borderRadius: 16,
        boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--hairline)' }}>
          <h5 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>
            {task ? 'Edit Task' : 'New Task'}
          </h5>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18, lineHeight: 1, padding: 4 }}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={submit}>
          <div style={{ padding: '20px 24px' }}>
            {/* Title */}
            <div className="jf-field" style={{ marginBottom: 14 }}>
              <label className="jf-label">Title <span className="req">*</span></label>
              <input
                className="jf-input"
                placeholder="Task title…"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="jf-field" style={{ marginBottom: 16 }}>
              <label className="jf-label">Description</label>
              <textarea
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--border-soft)', background: 'var(--surface)',
                  color: 'var(--ink)', fontSize: 13.5, resize: 'vertical',
                  fontFamily: 'inherit', outline: 'none', minHeight: 70,
                }}
                placeholder="Add description (optional)…"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>

            {/* Priority + Status */}
            <div className="jf-grid-2" style={{ marginBottom: 14 }}>
              <div className="jf-field">
                <label className="jf-label">Priority</label>
                <select className="jf-select" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="jf-field">
                <label className="jf-label">Status</label>
                <select className="jf-select" value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {COLS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>

            {/* Assignee + Due date */}
            <div className="jf-grid-2" style={{ marginBottom: 14 }}>
              <div className="jf-field">
                <label className="jf-label">Assignee</label>
                <select className="jf-select" value={form.assignedTo} onChange={(e) => set('assignedTo', e.target.value)}>
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.name || u.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="jf-field">
                <label className="jf-label">Due Date</label>
                <input className="jf-input" type="datetime-local" value={form.dueAt} onChange={(e) => set('dueAt', e.target.value)} />
              </div>
            </div>

            {/* Tags */}
            <div className="jf-field" style={{ marginBottom: 16 }}>
              <label className="jf-label">Tags</label>
              <input
                className="jf-input"
                placeholder="ops, finance, customs (comma-separated)"
                value={form.tags}
                onChange={(e) => set('tags', e.target.value)}
              />
            </div>

            {error && (
              <div className="jf-alert jf-alert-danger" style={{ marginBottom: 14 }}>
                <i className="bi bi-exclamation-circle"></i> {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 8, padding: '0 24px 20px' }}>
            <button type="submit" className="sd-btn sd-btn-primary" disabled={saving}>
              {saving
                ? <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14, borderWidth: 2 }}></span>
                : <i className="bi bi-check-lg"></i>}
              {task ? 'Save Changes' : 'Create Task'}
            </button>
            <button type="button" className="sd-btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Task Card ───────────────────────────────────────────────── */
function TaskCard({ task, onToggle, onEdit }) {
  const due  = relDue(task.dueAt);
  const pm   = PRIORITY_META[task.priority] || PRIORITY_META.normal;
  const done = task.status === 'done';

  return (
    <div className="tk-card" onClick={() => onEdit(task)}>
      {/* Checkbox + title */}
      <div className="tk-card-top">
        <button
          type="button"
          className={`tk-check${done ? ' checked' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggle(task); }}
          title={done ? 'Mark incomplete' : 'Mark complete'}
        >
          {done && <i className="bi bi-check" style={{ fontSize: 11, lineHeight: 1 }}></i>}
        </button>
        <span className={`tk-card-title${done ? ' done' : ''}`}>{task.title}</span>
      </div>

      {/* Linked shipment */}
      {task.linkedTo?.label && (
        <div className="tk-card-link">
          <i className="bi bi-link-45deg" style={{ fontSize: 13 }}></i>
          {task.linkedTo.label}
        </div>
      )}

      {/* Tags */}
      {(task.priority || task.tags?.length > 0) && (
        <div className="tk-card-tags">
          <span className="tk-tag" style={{ background: pm.bg, color: pm.color }}>
            {pm.label}
          </span>
          {task.tags?.slice(0, 2).map((t) => (
            <span key={t} className="tk-tag">{t}</span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="tk-card-footer">
        {task.assignedTo ? (
          <div className="tk-avatar" title={`${task.assignedTo.firstName || ''} ${task.assignedTo.lastName || ''}`.trim()}>
            {initials(task.assignedTo)}
          </div>
        ) : <div />}
        {due && (
          <span className="tk-due" style={{ color: due.color }}>{due.label}</span>
        )}
      </div>
    </div>
  );
}

/* ── Board Column ────────────────────────────────────────────── */
function TaskColumn({ col, tasks, onToggle, onEdit, onAdd }) {
  return (
    <div className="tk-col">
      <div className="tk-col-header">
        <div className="tk-col-dot" style={{ background: col.color }}></div>
        <span className="tk-col-label">{col.label}</span>
        <span className="tk-col-count">{tasks.length}</span>
        <button
          type="button"
          className="pip-col-add"
          onClick={() => onAdd(col.id)}
          title={`Add to ${col.label}`}
        >
          <i className="bi bi-plus" style={{ fontSize: 14 }}></i>
        </button>
      </div>
      <div className="tk-col-body">
        {tasks.map((t) => (
          <TaskCard key={t._id} task={t} onToggle={onToggle} onEdit={onEdit} />
        ))}
        {tasks.length === 0 && (
          <div className="tk-col-empty">
            <i className="bi bi-check-square" style={{ fontSize: 20 }}></i>
            No tasks here
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────── */
export default function Tasks() {
  const { user: currentUser } = useAuth();

  const [tasks, setTasks]     = useState([]);
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | { task?, defaultStatus? }
  const [viewFilter, setViewFilter] = useState('team');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tasksApi.list({ limit: 200 });
      setTasks(data.items || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    usersApi.list({ limit: 100 }).then((d) => setUsers(d.items || d.users || [])).catch(() => {});
  }, []);

  /* Apply view filter ─────────────────────────────────────────── */
  const visibleTasks = (() => {
    let filtered = tasks;
    if (viewFilter === 'mine') {
      filtered = tasks.filter((t) => t.assignedTo?._id === currentUser?._id || t.assignedTo === currentUser?._id);
    } else if (viewFilter === 'high_pri') {
      filtered = tasks.filter((t) => ['urgent', 'high'].includes(t.priority));
    } else if (viewFilter === 'this_week') {
      const week = Date.now() + 7 * 86400000;
      filtered = tasks.filter((t) => t.dueAt && new Date(t.dueAt) <= week);
    } else if (viewFilter === 'by_ship') {
      filtered = [...tasks].sort((a, b) => {
        const la = a.linkedTo?.label || '';
        const lb = b.linkedTo?.label || '';
        return la.localeCompare(lb);
      });
    }
    // 'team' = all tasks, no filter
    return filtered;
  })();

  /* Group by status ───────────────────────────────────────────── */
  const columns = COLS.reduce((acc, col) => {
    acc[col.id] = visibleTasks.filter((t) => t.status === col.id);
    return acc;
  }, {});

  /* Stats ─────────────────────────────────────────────────────── */
  const totalCount  = visibleTasks.length;
  const dueSoonCount = visibleTasks.filter((t) => {
    if (!t.dueAt || t.status === 'done') return false;
    const diff = Math.round((new Date(t.dueAt) - Date.now()) / 86400000);
    return diff <= 1;
  }).length;

  /* Actions ───────────────────────────────────────────────────── */
  const handleToggle = async (task) => {
    const optimistic = tasks.map((t) =>
      t._id === task._id ? { ...t, status: t.status === 'done' ? 'open' : 'done' } : t
    );
    setTasks(optimistic);
    try {
      if (task.status === 'done') {
        await tasksApi.update(task._id, { status: 'open' });
      } else {
        await tasksApi.complete(task._id);
      }
    } catch { load(); }
  };

  const handleEdit = (task) => setModal({ task });
  const handleAdd  = (status) => setModal({ defaultStatus: status });

  return (
    <div className="tk-shell">

      {/* Header */}
      <div className="tk-header">
        <div className="tk-header-row">
          <div>
            <h1 className="tk-title">Tasks</h1>
            <p className="tk-subtitle">
              {totalCount} task{totalCount !== 1 ? 's' : ''}
              {dueSoonCount > 0 && <> · <span style={{ color: '#d97706' }}>{dueSoonCount} due today/tomorrow</span></>}
            </p>
          </div>
          <div className="tk-header-actions">
            <button className="sd-btn" type="button">
              <i className="bi bi-funnel"></i> Filter
            </button>
            <button className="sd-btn sd-btn-primary" type="button" onClick={() => setModal({})}>
              <i className="bi bi-plus"></i> New Task
            </button>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="pip-filter-row tk-filter-row-tight">
        <div className="pip-chips">
          {VIEW_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`pip-chip${viewFilter === f.key ? ' active' : ''}`}
              onClick={() => setViewFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16, minHeight: 300 }}>
          <div className="dashboard-loader">
            <div className="dashboard-loader-ring"></div>
            <i className="bi bi-check-square dashboard-loader-icon"></i>
          </div>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Loading tasks…</span>
        </div>
      ) : (
        <div className="tk-board-wrap">
          <div className="tk-board">
            {COLS.map((col) => (
              <TaskColumn
                key={col.id}
                col={col}
                tasks={columns[col.id] || []}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onAdd={handleAdd}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <TaskModal
          task={modal.task}
          users={users}
          defaultStatus={modal.defaultStatus}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
