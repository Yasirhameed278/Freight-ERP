import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { tasksApi, usersApi } from '../api';

/* ── meta ──────────────────────────────────────────────────── */
const PRIORITY_META = {
  urgent: { label: 'Urgent', dot: '#ef4444', bg: '#fef2f2', text: '#dc2626' },
  high:   { label: 'High',   dot: '#f97316', bg: '#fff7ed', text: '#c2410c' },
  normal: { label: 'Normal', dot: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8' },
  low:    { label: 'Low',    dot: '#94a3b8', bg: '#f8fafc', text: '#64748b' },
};

const STATUS_META = {
  open:        { label: 'Open',        icon: 'bi-circle',            color: '#94a3b8' },
  in_progress: { label: 'In Progress', icon: 'bi-circle-half',       color: '#3b82f6' },
  done:        { label: 'Done',        icon: 'bi-check-circle-fill', color: '#10b981' },
  cancelled:   { label: 'Cancelled',   icon: 'bi-x-circle',          color: '#94a3b8' },
};

/* ── SLA pill ──────────────────────────────────────────────── */
function SlaBadge({ dueAt, status, slaBreached }) {
  if (!dueAt || status === 'done' || status === 'cancelled') return null;
  const hrs = (new Date(dueAt) - Date.now()) / 3_600_000;

  if (slaBreached || hrs < 0) {
    const label = Math.abs(hrs) < 24 ? `${Math.round(Math.abs(hrs))}h overdue` : `${Math.round(Math.abs(hrs) / 24)}d overdue`;
    return <span className="sla-pill sla-overdue">{label}</span>;
  }
  if (hrs < 4)  return <span className="sla-pill sla-warn">{Math.round(hrs)}h left</span>;
  if (hrs < 24) return <span className="sla-pill sla-caution">{Math.round(hrs)}h left</span>;
  return <span className="sla-pill sla-ok">{Math.round(hrs / 24)}d left</span>;
}

/* ── Priority dot ──────────────────────────────────────────── */
function PriorityDot({ priority }) {
  const m = PRIORITY_META[priority] || PRIORITY_META.normal;
  return (
    <span title={m.label} style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: m.dot, flexShrink: 0,
    }} />
  );
}

/* ── Modal ─────────────────────────────────────────────────── */
function TaskModal({ task, users, onSave, onClose }) {
  const [form, setForm] = useState({
    title:       task?.title       || '',
    description: task?.description || '',
    priority:    task?.priority    || 'normal',
    assignedTo:  task?.assignedTo?._id || task?.assignedTo || '',
    dueAt:       task?.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : '',
    tags:        (task?.tags || []).join(', '),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = {
        title:       form.title,
        description: form.description || undefined,
        priority:    form.priority,
        assignedTo:  form.assignedTo || undefined,
        dueAt:       form.dueAt || undefined,
        tags:        form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      if (task?._id) await tasksApi.update(task._id, body);
      else await tasksApi.create(body);
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save task');
    } finally { setSaving(false); }
  };

  return createPortal(
    <div className="erp-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="erp-modal" style={{ maxWidth: 600 }}>

          {/* header */}
          <div className="d-flex align-items-center justify-content-between px-5 pt-5 pb-3">
            <h5 className="fw-bold mb-0" style={{ fontSize: 18 }}>{task ? 'Edit Task' : 'New Task'}</h5>
            <button className="btn p-1 rounded-circle" style={{ lineHeight: 1, color: '#94a3b8' }} onClick={onClose}>
              <i className="bi bi-x-lg" style={{ fontSize: 16 }} />
            </button>
          </div>

          <form onSubmit={submit}>
            <div className="px-5 pb-2">

              {/* title */}
              <input
                className="form-control border-0 fw-semibold px-0 mb-1"
                style={{ fontSize: 15, background: 'transparent', boxShadow: 'none', borderBottom: '2px solid #e2e8f0', borderRadius: 0, paddingBottom: 8 }}
                placeholder="Task title…"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                required
              />

              {/* description */}
              <textarea
                className="form-control border-0 px-0 mt-3"
                style={{ fontSize: 14, background: 'transparent', boxShadow: 'none', resize: 'none', color: '#64748b' }}
                rows={3}
                placeholder="Add description (optional)…"
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />

              {/* meta row */}
              <div className="d-flex flex-wrap gap-3 mt-4 mb-4 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>

                {/* priority */}
                <div>
                  <div className="task-field-label">Priority</div>
                  <div className="d-flex gap-1 mt-1">
                    {Object.entries(PRIORITY_META).map(([v, m]) => (
                      <button key={v} type="button"
                        onClick={() => set('priority', v)}
                        className="task-priority-pill"
                        style={{
                          background: form.priority === v ? m.bg : 'transparent',
                          color: form.priority === v ? m.text : '#94a3b8',
                          border: `1.5px solid ${form.priority === v ? m.dot : '#e2e8f0'}`,
                          fontWeight: form.priority === v ? 600 : 400,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: form.priority === v ? m.dot : '#cbd5e1', display: 'inline-block', marginRight: 5 }} />
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* assignee */}
                <div>
                  <div className="task-field-label">Assignee</div>
                  <select className="task-meta-select mt-1" value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)}>
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                </div>

                {/* due date */}
                <div>
                  <div className="task-field-label">Due Date</div>
                  <input type="datetime-local" className="task-meta-select mt-1" value={form.dueAt} onChange={e => set('dueAt', e.target.value)} />
                </div>
              </div>

              {/* tags */}
              <div className="mb-4">
                <div className="task-field-label mb-1">Tags</div>
                <input
                  className="form-control form-control-sm"
                  style={{ fontSize: 13 }}
                  placeholder="customs, client-x, urgent-review"
                  value={form.tags}
                  onChange={e => set('tags', e.target.value)}
                />
              </div>

              {error && <div className="alert alert-danger py-2 mb-3 small">{error}</div>}
            </div>

            <div className="px-5 pb-5 d-flex gap-2">
              <button type="submit" className="btn btn-primary px-4 fw-semibold" style={{ borderRadius: 8, fontSize: 14 }} disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : task ? 'Save Changes' : 'Create Task'}
              </button>
              <button type="button" className="btn px-4" style={{ borderRadius: 8, fontSize: 14, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }} onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
      </div>
    </div>,
    document.body
  );
}

/* ── Task row ──────────────────────────────────────────────── */
function TaskRow({ task, onAction }) {
  const sm     = STATUS_META[task.status] || STATUS_META.open;
  const pm     = PRIORITY_META[task.priority] || PRIORITY_META.normal;
  const active = !['done', 'cancelled'].includes(task.status);

  return (
    <div className={`task-row ${task.slaBreached && active ? 'task-row-breached' : ''}`}>

      {/* status icon / quick-complete */}
      <button className="task-status-btn" title={sm.label} style={{ color: sm.color }}
        onClick={() => active && onAction(task.status === 'in_progress' ? 'complete' : task.status === 'open' ? 'start' : 'complete', task)}>
        <i className={`bi ${sm.icon}`} />
      </button>

      {/* main content */}
      <div className="task-row-body">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <PriorityDot priority={task.priority} />
          <span className={`task-title ${!active ? 'task-done' : ''}`}>{task.title}</span>
          <SlaBadge dueAt={task.dueAt} status={task.status} slaBreached={task.slaBreached} />
          {task.workflowRule && (
            <span className="task-auto-badge"><i className="bi bi-lightning-charge me-1" />Auto</span>
          )}
        </div>

        <div className="d-flex align-items-center gap-3 mt-1 flex-wrap">
          {task.description && (
            <span className="task-desc">{task.description.length > 80 ? task.description.slice(0, 80) + '…' : task.description}</span>
          )}
          {task.linkedTo?.label && (
            <span className="task-link-chip">
              <i className="bi bi-link-45deg" />
              {task.linkedTo.kind}: {task.linkedTo.label}
            </span>
          )}
          {task.tags?.slice(0, 3).map(t => (
            <span key={t} className="task-tag">#{t}</span>
          ))}
        </div>
      </div>

      {/* right meta */}
      <div className="task-row-meta">
        {task.assignedTo && (
          <div className="task-avatar" title={task.assignedTo.name}>
            {(task.assignedTo.name || '?').charAt(0).toUpperCase()}
          </div>
        )}
        {task.dueAt && (
          <span className="task-due-date">
            {new Date(task.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* actions (appear on hover via CSS) */}
      <div className="task-row-actions">
        {task.status === 'open' && (
          <button className="task-action-btn text-primary" onClick={() => onAction('start', task)} title="Start">
            <i className="bi bi-play-fill" />
          </button>
        )}
        {active && (
          <button className="task-action-btn text-success" onClick={() => onAction('complete', task)} title="Complete">
            <i className="bi bi-check-lg" />
          </button>
        )}
        <button className="task-action-btn" onClick={() => onAction('edit', task)} title="Edit">
          <i className="bi bi-pencil" />
        </button>
        <button className="task-action-btn text-danger" onClick={() => onAction('delete', task)} title="Delete">
          <i className="bi bi-trash3" />
        </button>
      </div>
    </div>
  );
}

/* ── Stat card ─────────────────────────────────────────────── */
function StatCard({ label, value, icon, color, onClick, active }) {
  return (
    <button
      type="button"
      className={`task-stat-card ${active ? 'task-stat-active' : ''}`}
      style={{ '--stat-color': color }}
      onClick={onClick}
    >
      <div className="task-stat-icon"><i className={`bi ${icon}`} /></div>
      <div>
        <div className="task-stat-value">{value}</div>
        <div className="task-stat-label">{label}</div>
      </div>
    </button>
  );
}

/* ── Filter chip ───────────────────────────────────────────── */
function FilterChip({ label, active, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`task-filter-chip ${active ? (danger ? 'chip-danger' : 'chip-active') : ''}`}
    >
      {label}
    </button>
  );
}

/* ── Main ──────────────────────────────────────────────────── */
export default function Tasks() {
  const [tasks, setTasks]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [counts, setCounts]     = useState({ open: 0, inProgress: 0, overdue: 0 });
  const [users, setUsers]       = useState([]);
  const [modal, setModal]       = useState(null);

  const [filters, setFilters]   = useState({
    status: 'open,in_progress', priority: '', mine: '', overdue: '',
  });
  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status)   params.status   = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.mine)     params.mine     = filters.mine;
      if (filters.overdue)  params.overdue  = filters.overdue;

      const [data, cnt] = await Promise.all([
        tasksApi.list(params),
        tasksApi.myCounts(),
      ]);
      setTasks(data.items);
      setTotal(data.total);
      setCounts(cnt);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    usersApi.list({ limit: 100 }).then(d => setUsers(d.items || d.users || [])).catch(() => {});
  }, []);

  const handleAction = async (type, task) => {
    if (type === 'edit')     { setModal({ task }); return; }
    if (type === 'start')    { await tasksApi.start(task._id);    load(); return; }
    if (type === 'complete') { await tasksApi.complete(task._id); load(); return; }
    if (type === 'delete') {
      if (!window.confirm(`Delete "${task.title}"?`)) return;
      await tasksApi.remove(task._id);
      load();
    }
  };

  const grouped = {
    open:        tasks.filter(t => t.status === 'open'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done:        tasks.filter(t => t.status === 'done'),
    cancelled:   tasks.filter(t => t.status === 'cancelled'),
  };

  const showGrouped = !filters.status || filters.status === 'open,in_progress';

  return (
    <div className="page-content">

      {/* header */}
      <div className="d-flex align-items-center justify-content-between mb-5">
        <div>
          <h4 className="page-title mb-1">Tasks</h4>
          <span className="text-muted small">{total} task{total !== 1 ? 's' : ''}</span>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" style={{ borderRadius: 10, fontWeight: 600, fontSize: 14 }} onClick={() => setModal({})}>
          <i className="bi bi-plus-lg" /> New Task
        </button>
      </div>

      {/* stat cards */}
      <div className="d-flex gap-3 flex-wrap mb-5">
        <StatCard label="Open (mine)"        value={counts.open}       icon="bi-circle"             color="#3b82f6"
          active={filters.mine === 'true' && !filters.overdue}
          onClick={() => { setF('mine', filters.mine === 'true' ? '' : 'true'); setF('overdue', ''); }} />
        <StatCard label="In Progress (mine)" value={counts.inProgress} icon="bi-circle-half"        color="#8b5cf6"
          active={false} onClick={() => {}} />
        <StatCard label="Overdue (mine)"     value={counts.overdue}    icon="bi-exclamation-circle" color="#ef4444"
          active={filters.overdue === 'true'}
          onClick={() => { setF('overdue', filters.overdue === 'true' ? '' : 'true'); setF('mine', 'true'); }} />
      </div>

      {/* filter bar */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
        <div className="d-flex gap-1 p-1 rounded-3" style={{ background: '#f1f5f9' }}>
          {[
            { v: 'open,in_progress', l: 'Active' },
            { v: 'open',             l: 'Open' },
            { v: 'in_progress',      l: 'In Progress' },
            { v: 'done',             l: 'Done' },
            { v: '',                 l: 'All' },
          ].map(({ v, l }) => (
            <button key={v} type="button"
              className={`btn btn-sm py-1 px-3 ${filters.status === v ? 'bg-white shadow-sm fw-semibold' : 'text-muted'}`}
              style={{ borderRadius: 8, fontSize: 13, border: 'none', transition: 'all .15s' }}
              onClick={() => setF('status', v)}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="d-flex gap-1 ms-2 flex-wrap">
          {['urgent', 'high', 'normal', 'low'].map(p => {
            const m = PRIORITY_META[p];
            return (
              <FilterChip key={p} label={m.label}
                active={filters.priority === p}
                onClick={() => setF('priority', filters.priority === p ? '' : p)}
              />
            );
          })}
        </div>

        <div className="d-flex gap-1 ms-auto">
          <FilterChip label="Mine" active={filters.mine === 'true'} onClick={() => setF('mine', filters.mine === 'true' ? '' : 'true')} />
          <FilterChip label="Overdue" active={filters.overdue === 'true'} onClick={() => setF('overdue', filters.overdue === 'true' ? '' : 'true')} danger />
          <button type="button" className="task-filter-chip" onClick={load}><i className="bi bi-arrow-clockwise" /></button>
        </div>
      </div>

      {/* task list */}
      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" style={{ width: 28, height: 28 }} />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-5">
          <div className="mb-3" style={{ fontSize: 40, opacity: 0.2 }}>✓</div>
          <div className="fw-semibold text-muted">No tasks match these filters</div>
          <div className="text-muted small mt-1">Try clearing filters or create a new task</div>
        </div>
      ) : (
        <div className="task-list-card">
          {showGrouped ? (
            <>
              {grouped.in_progress.length > 0 && (
                <div>
                  <div className="task-group-header">
                    <i className="bi bi-circle-half me-2" style={{ color: '#3b82f6' }} />
                    In Progress
                    <span className="task-group-count">{grouped.in_progress.length}</span>
                  </div>
                  {grouped.in_progress.map(t => <TaskRow key={t._id} task={t} onAction={handleAction} />)}
                </div>
              )}
              {grouped.open.length > 0 && (
                <div>
                  <div className="task-group-header">
                    <i className="bi bi-circle me-2" style={{ color: '#94a3b8' }} />
                    Open
                    <span className="task-group-count">{grouped.open.length}</span>
                  </div>
                  {grouped.open.map(t => <TaskRow key={t._id} task={t} onAction={handleAction} />)}
                </div>
              )}
            </>
          ) : (
            tasks.map(t => <TaskRow key={t._id} task={t} onAction={handleAction} />)
          )}
        </div>
      )}

      {modal && (
        <TaskModal
          task={modal.task}
          users={users}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
