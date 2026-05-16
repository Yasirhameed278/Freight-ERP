import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { workflowsApi } from '../api';
import { useAuth } from '../context/AuthContext';

/* ── constants ─────────────────────────────────────────────── */
const ENTITY_EVENTS = {
  Shipment: ['status_changed', 'milestone_completed', 'created'],
  Deal:     ['stage_changed', 'created'],
  Invoice:  ['status_changed', 'created'],
};

const ENTITY_META = {
  Shipment: { icon: 'bi-boxes',    color: '#8b5cf6', bg: '#f5f3ff' },
  Deal:     { icon: 'bi-kanban',   color: '#3b82f6', bg: '#eff6ff' },
  Invoice:  { icon: 'bi-receipt',  color: '#10b981', bg: '#f0fdf4' },
};

const SHIPMENT_STATUSES = [
  'quote','booked','pickup_scheduled','cargo_received','customs_export',
  'loaded','in_transit','transhipment','arrived','customs_import',
  'cleared','out_for_delivery','delivered','completed','cancelled','on_hold',
];
const DEAL_STAGES     = ['lead','qualified','proposal','negotiation','won','lost'];
const INVOICE_STATUSES = ['draft','sent','partially_paid','paid','overdue','cancelled','written_off'];
const ROLES = ['admin','manager','sales','operations','finance','customer_service','customs','warehouse'];
const PRIORITIES = ['low','normal','high','urgent'];

const EVENT_LABELS = {
  status_changed:      'Status Changes To',
  stage_changed:       'Stage Changes To',
  milestone_completed: 'Milestone Completed',
  created:             'Created',
};

const ASSIGN_LABELS = {
  role:       'By Role',
  creator:    'To Action Creator',
  assignedTo: 'To Entity Assignee',
};

/* ── helpers ───────────────────────────────────────────────── */
function rulePreview(rule) {
  const t = rule.trigger;
  const conds = (t.conditions || []).map(c => `${c.field} ${c.operator === 'eq' ? '=' : c.operator} "${c.value}"`).join(' & ');
  const acts = (rule.actions || []).map(a =>
    a.type === 'create_task'
      ? `Create task "${a.taskTitle}" → ${a.assignToType === 'role' ? a.assignRole : a.assignToType} (due ${(a.dueDays || 0) * 24 + (a.dueHours || 24)}h)`
      : `Notify [${(a.notifRoles || []).join(', ')}]: "${a.notifTitle}"`
  ).join(' · ');
  return { entity: t.entity, event: EVENT_LABELS[t.event] || t.event, conds, acts };
}

/* ── Condition row ─────────────────────────────────────────── */
function ConditionRow({ cond, entity, onChange, onRemove }) {
  const statusOpts = entity === 'Shipment' ? SHIPMENT_STATUSES : entity === 'Deal' ? DEAL_STAGES : INVOICE_STATUSES;
  const isStatusField = cond.field === 'status' || cond.field === 'stage';

  return (
    <div className="wf-condition-row">
      <div className="wf-condition-row-inner">
        <select className="wf-inline-select" value={cond.field}
          onChange={e => onChange({ ...cond, field: e.target.value, value: '' })}>
          <option value="status">status</option>
          <option value="stage">stage</option>
          <option value="mode">mode</option>
          <option value="">custom…</option>
        </select>
        {cond.field === '' && (
          <input className="wf-inline-input" placeholder="field name" value={cond.field}
            onChange={e => onChange({ ...cond, field: e.target.value })} />
        )}
        <select className="wf-inline-select" value={cond.operator}
          onChange={e => onChange({ ...cond, operator: e.target.value })}>
          <option value="eq">equals</option>
          <option value="neq">not equals</option>
          <option value="in">is one of</option>
          <option value="not_in">is not one of</option>
        </select>
        {isStatusField ? (
          <select className="wf-inline-select" style={{ flex: 1 }} value={cond.value}
            onChange={e => onChange({ ...cond, value: e.target.value })}>
            <option value="">— select value —</option>
            {statusOpts.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : (
          <input className="wf-inline-input" style={{ flex: 1 }} placeholder="value…"
            value={cond.value || ''}
            onChange={e => onChange({ ...cond, value: e.target.value })} />
        )}
      </div>
      <button type="button" className="wf-remove-btn" onClick={onRemove} title="Remove">
        <i className="bi bi-x" />
      </button>
    </div>
  );
}

/* ── Action card ───────────────────────────────────────────── */
function ActionCard({ action, index, onChange, onRemove }) {
  const set = (k, v) => onChange({ ...action, [k]: v });

  return (
    <div className="wf-action-card">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <div className="wf-action-num">{index + 1}</div>
          <div className="d-flex gap-1 p-1 rounded-2" style={{ background: '#f1f5f9' }}>
            {['create_task', 'send_notification'].map(t => (
              <button key={t} type="button"
                className={`btn btn-sm py-1 px-3 ${action.type === t ? 'bg-white shadow-sm fw-semibold' : 'text-muted'}`}
                style={{ borderRadius: 6, fontSize: 12, border: 'none', transition: 'all .15s' }}
                onClick={() => onChange({ type: t })}
              >
                <i className={`bi ${t === 'create_task' ? 'bi-check2-square' : 'bi-bell'} me-1`} />
                {t === 'create_task' ? 'Create Task' : 'Notify'}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="wf-remove-btn" onClick={onRemove} title="Remove action">
          <i className="bi bi-trash3" />
        </button>
      </div>

      {action.type === 'create_task' && (
        <div className="row g-3">
          <div className="col-12">
            <label className="wf-label">Task Title
              <span className="wf-hint ms-2">use {'{ref}'} {'{status}'} {'{stage}'}</span>
            </label>
            <input className="form-control form-control-sm" style={{ fontSize: 13 }}
              placeholder="e.g. Notify consignee — {ref} has arrived"
              value={action.taskTitle || ''} onChange={e => set('taskTitle', e.target.value)} />
          </div>
          <div className="col-12">
            <label className="wf-label">Description <span className="wf-hint">(optional)</span></label>
            <input className="form-control form-control-sm" style={{ fontSize: 13 }}
              value={action.taskDesc || ''} onChange={e => set('taskDesc', e.target.value)} />
          </div>

          <div className="col-md-5">
            <label className="wf-label">Assign To</label>
            <div className="d-flex flex-wrap gap-1 mt-1">
              {Object.entries(ASSIGN_LABELS).map(([v, l]) => (
                <button key={v} type="button"
                  className={`wf-pill-btn ${action.assignToType === v ? 'active' : ''}`}
                  onClick={() => set('assignToType', v)}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {(!action.assignToType || action.assignToType === 'role') && (
            <div className="col-md-4">
              <label className="wf-label">Role</label>
              <select className="form-select form-select-sm mt-1" style={{ fontSize: 13 }}
                value={action.assignRole || ''} onChange={e => set('assignRole', e.target.value)}>
                <option value="">— select —</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}

          <div className="col-md-3">
            <label className="wf-label">Priority</label>
            <select className="form-select form-select-sm mt-1" style={{ fontSize: 13 }}
              value={action.priority || 'normal'} onChange={e => set('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="col-12">
            <label className="wf-label">Due after trigger</label>
            <div className="d-flex align-items-center gap-2 mt-1">
              <input type="number" min="0" className="form-control form-control-sm text-center" style={{ width: 64, fontSize: 13 }}
                value={action.dueDays ?? 0} onChange={e => set('dueDays', +e.target.value)} />
              <span className="text-muted small">days</span>
              <input type="number" min="0" max="23" className="form-control form-control-sm text-center" style={{ width: 64, fontSize: 13 }}
                value={action.dueHours ?? 24} onChange={e => set('dueHours', +e.target.value)} />
              <span className="text-muted small">hours</span>
            </div>
          </div>
        </div>
      )}

      {action.type === 'send_notification' && (
        <div className="row g-3">
          <div className="col-md-6">
            <label className="wf-label">Title</label>
            <input className="form-control form-control-sm mt-1" style={{ fontSize: 13 }}
              value={action.notifTitle || ''} onChange={e => set('notifTitle', e.target.value)} />
          </div>
          <div className="col-12">
            <label className="wf-label">Body</label>
            <input className="form-control form-control-sm mt-1" style={{ fontSize: 13 }}
              value={action.notifBody || ''} onChange={e => set('notifBody', e.target.value)} />
          </div>
          <div className="col-12">
            <label className="wf-label mb-2">Notify Roles</label>
            <div className="d-flex flex-wrap gap-1">
              {ROLES.map(r => {
                const checked = (action.notifRoles || []).includes(r);
                return (
                  <button key={r} type="button"
                    className={`wf-pill-btn ${checked ? 'active' : ''}`}
                    onClick={() => {
                      const cur = action.notifRoles || [];
                      set('notifRoles', checked ? cur.filter(x => x !== r) : [...cur, r]);
                    }}
                  >{r}</button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Rule Modal ────────────────────────────────────────────── */
function RuleModal({ rule, onSave, onClose }) {
  const emptyAction = () => ({ type: 'create_task', taskTitle: '', assignToType: 'role', assignRole: 'operations', dueDays: 0, dueHours: 24, priority: 'normal' });

  const [form, setForm] = useState({
    name:        rule?.name        || '',
    description: rule?.description || '',
    trigger: {
      entity:     rule?.trigger?.entity     || 'Shipment',
      event:      rule?.trigger?.event      || 'status_changed',
      conditions: rule?.trigger?.conditions || [],
    },
    actions: rule?.actions?.length ? rule.actions : [emptyAction()],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const setTrigger = (k, v) => setForm(f => ({ ...f, trigger: { ...f.trigger, [k]: v } }));

  const changeEntity = (entity) => {
    const events = ENTITY_EVENTS[entity] || [];
    setForm(f => ({ ...f, trigger: { ...f.trigger, entity, event: events[0] || 'status_changed', conditions: [] } }));
  };

  const setCond   = (i, v) => setForm(f => { const c = [...f.trigger.conditions]; c[i] = v; return { ...f, trigger: { ...f.trigger, conditions: c } }; });
  const remCond   = (i)    => setForm(f => ({ ...f, trigger: { ...f.trigger, conditions: f.trigger.conditions.filter((_, j) => j !== i) } }));
  const addCond   = ()     => setForm(f => ({ ...f, trigger: { ...f.trigger, conditions: [...f.trigger.conditions, { field: 'status', operator: 'eq', value: '' }] } }));
  const setAction = (i, v) => setForm(f => { const a = [...f.actions]; a[i] = v; return { ...f, actions: a }; });
  const remAction = (i)    => setForm(f => ({ ...f, actions: f.actions.filter((_, j) => j !== i) }));
  const addAction = ()     => setForm(f => ({ ...f, actions: [...f.actions, emptyAction()] }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.actions.length) { setError('Add at least one action'); return; }
    setSaving(true);
    try {
      if (rule?._id) await workflowsApi.update(rule._id, form);
      else await workflowsApi.create(form);
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const em = ENTITY_META[form.trigger.entity] || ENTITY_META.Shipment;

  return createPortal(
    <div className="erp-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="erp-modal" style={{ maxWidth: 860 }}>

          {/* header */}
          <div className="d-flex align-items-center justify-content-between px-5 pt-5 pb-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <h5 className="fw-bold mb-1" style={{ fontSize: 18 }}>{rule ? 'Edit Workflow Rule' : 'New Workflow Rule'}</h5>
              <p className="text-muted mb-0 small">Define what triggers the rule and what actions to take</p>
            </div>
            <button className="btn p-1 rounded-circle" style={{ lineHeight: 1, color: '#94a3b8' }} onClick={onClose}>
              <i className="bi bi-x-lg" style={{ fontSize: 16 }} />
            </button>
          </div>

          <form onSubmit={submit}>
            <div className="modal-body px-5 py-4">

              {/* name + description */}
              <div className="row g-3 mb-5">
                <div className="col-md-6">
                  <label className="wf-label">Rule Name <span className="text-danger">*</span></label>
                  <input className="form-control mt-1" style={{ fontSize: 14 }} placeholder="e.g. Notify on arrival"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="col-md-6">
                  <label className="wf-label">Description</label>
                  <input className="form-control mt-1" style={{ fontSize: 14 }}
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>

              {/* ── TRIGGER ── */}
              <div className="wf-section">
                <div className="wf-section-header">
                  <div className="wf-section-icon" style={{ background: em.bg, color: em.color }}>
                    <i className="bi bi-lightning-charge-fill" />
                  </div>
                  <div>
                    <div className="wf-section-title">When (Trigger)</div>
                    <div className="wf-section-sub">Select the entity and event that fires this rule</div>
                  </div>
                </div>

                {/* entity selector */}
                <div className="d-flex gap-2 mt-3 mb-3">
                  {Object.entries(ENTITY_META).map(([entity, m]) => (
                    <button key={entity} type="button"
                      className={`wf-entity-btn ${form.trigger.entity === entity ? 'active' : ''}`}
                      style={{ '--entity-color': m.color, '--entity-bg': m.bg }}
                      onClick={() => changeEntity(entity)}
                    >
                      <i className={`bi ${m.icon}`} />
                      {entity}
                    </button>
                  ))}
                </div>

                {/* event selector */}
                <div className="d-flex flex-wrap gap-2 mb-4">
                  {(ENTITY_EVENTS[form.trigger.entity] || []).map(ev => (
                    <button key={ev} type="button"
                      className={`wf-pill-btn ${form.trigger.event === ev ? 'active' : ''}`}
                      onClick={() => setTrigger('event', ev)}
                    >
                      {EVENT_LABELS[ev] || ev}
                    </button>
                  ))}
                </div>

                {/* conditions */}
                <div className="wf-cond-block">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="wf-label">Conditions <span className="wf-hint">(all must match — leave empty to match any)</span></span>
                    <button type="button" className="btn btn-sm text-primary p-0" style={{ fontSize: 12, fontWeight: 600 }} onClick={addCond}>
                      <i className="bi bi-plus me-1" />Add Condition
                    </button>
                  </div>
                  {form.trigger.conditions.length === 0 && (
                    <div className="text-muted small py-2" style={{ fontStyle: 'italic' }}>No conditions — rule fires on every {EVENT_LABELS[form.trigger.event] || form.trigger.event} event</div>
                  )}
                  {form.trigger.conditions.map((c, i) => (
                    <ConditionRow key={i} cond={c} entity={form.trigger.entity}
                      onChange={v => setCond(i, v)} onRemove={() => remCond(i)} />
                  ))}
                </div>
              </div>

              {/* ── ACTIONS ── */}
              <div className="wf-section mt-4">
                <div className="wf-section-header">
                  <div className="wf-section-icon" style={{ background: '#f0fdf4', color: '#10b981' }}>
                    <i className="bi bi-gear-fill" />
                  </div>
                  <div>
                    <div className="wf-section-title">Then (Actions)</div>
                    <div className="wf-section-sub">What happens when the trigger fires</div>
                  </div>
                </div>

                <div className="mt-3">
                  {form.actions.map((a, i) => (
                    <ActionCard key={i} action={a} index={i}
                      onChange={v => setAction(i, v)} onRemove={() => remAction(i)} />
                  ))}
                  <button type="button" className="wf-add-action-btn" onClick={addAction}>
                    <i className="bi bi-plus-circle me-2" />Add Another Action
                  </button>
                </div>
              </div>

              {error && <div className="alert alert-danger py-2 mt-3 small">{error}</div>}
            </div>

            <div className="px-5 pb-5 pt-2 d-flex gap-2" style={{ borderTop: '1px solid #f1f5f9' }}>
              <button type="submit" className="btn btn-primary px-4 fw-semibold" style={{ borderRadius: 10, fontSize: 14 }} disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : rule ? 'Save Changes' : 'Create Rule'}
              </button>
              <button type="button" className="btn px-4" style={{ borderRadius: 10, fontSize: 14, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }} onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
      </div>
    </div>,
    document.body
  );
}

/* ── Rule card ─────────────────────────────────────────────── */
function RuleCard({ rule, canManage, onToggle, onEdit, onDelete }) {
  const em = ENTITY_META[rule.trigger.entity] || ENTITY_META.Shipment;
  const { entity, event, conds, acts } = rulePreview(rule);

  return (
    <div className={`wf-rule-card ${!rule.active ? 'wf-rule-inactive' : ''}`}>
      <div className="d-flex align-items-start gap-3">

        <div className="wf-rule-icon" style={{ background: em.bg, color: em.color }}>
          <i className={`bi ${em.icon}`} />
        </div>

        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <span className="fw-semibold" style={{ fontSize: 15 }}>{rule.name}</span>
            <span className={`wf-status-pill ${rule.active ? 'active' : ''}`}>
              <span className="wf-status-dot" />
              {rule.active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="wf-preview-line mb-2">
            <span className="wf-preview-entity">{entity}</span>
            <i className="bi bi-arrow-right mx-2 opacity-50" style={{ fontSize: 11 }} />
            <span className="wf-preview-event">{event}</span>
            {conds && <><span className="mx-2 opacity-40">·</span><span className="wf-preview-cond">{conds}</span></>}
            <i className="bi bi-arrow-right mx-2 opacity-50" style={{ fontSize: 11 }} />
            <span className="wf-preview-act">{acts}</span>
          </div>

          <div className="d-flex gap-4 small text-muted">
            {rule.runCount > 0 && <span><i className="bi bi-play-circle me-1" />{rule.runCount} run{rule.runCount !== 1 ? 's' : ''}</span>}
            {rule.lastRunAt && <span><i className="bi bi-clock-history me-1" />{new Date(rule.lastRunAt).toLocaleDateString()}</span>}
            {rule.createdBy && <span><i className="bi bi-person me-1" />{rule.createdBy.name}</span>}
            <span><i className="bi bi-gear me-1" />{rule.actions?.length || 0} action{rule.actions?.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {canManage && (
          <div className="d-flex gap-1 flex-shrink-0">
            <button className="wf-icon-btn" title={rule.active ? 'Deactivate' : 'Activate'} onClick={onToggle}>
              <i className={`bi ${rule.active ? 'bi-pause-circle' : 'bi-play-circle'}`} />
            </button>
            <button className="wf-icon-btn" title="Edit" onClick={onEdit}>
              <i className="bi bi-pencil" />
            </button>
            <button className="wf-icon-btn wf-icon-danger" title="Delete" onClick={onDelete}>
              <i className="bi bi-trash3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────── */
export default function WorkflowRules() {
  const { user } = useAuth();
  const canManage = ['admin', 'manager'].includes(user?.role);
  const [rules, setRules]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await workflowsApi.list(); setRules(d.rules); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="page-content">
      <div className="d-flex align-items-start justify-content-between mb-5">
        <div>
          <h4 className="page-title mb-1">Workflow Rules</h4>
          <p className="text-muted mb-0 small" style={{ maxWidth: 480 }}>
            Automate task creation and notifications when shipments move, deals advance, or invoices change.
          </p>
        </div>
        {canManage && (
          <button className="btn btn-primary d-flex align-items-center gap-2" style={{ borderRadius: 10, fontWeight: 600, fontSize: 14 }} onClick={() => setModal({})}>
            <i className="bi bi-plus-lg" /> New Rule
          </button>
        )}
      </div>

      {loading && (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" style={{ width: 28, height: 28 }} />
        </div>
      )}

      {!loading && rules.length === 0 && (
        <div className="text-center py-5">
          <div className="mb-4" style={{ fontSize: 48, opacity: 0.15 }}>⚡</div>
          <div className="fw-semibold mb-1" style={{ fontSize: 16 }}>No workflow rules yet</div>
          <p className="text-muted small mb-4" style={{ maxWidth: 380, margin: '0 auto' }}>
            Create rules to automatically generate tasks and notify your team when key events happen.
          </p>
          {canManage && (
            <button className="btn btn-primary px-4" style={{ borderRadius: 10 }} onClick={() => setModal({})}>
              Create First Rule
            </button>
          )}
        </div>
      )}

      <div className="d-flex flex-column gap-3">
        {rules.map(rule => (
          <RuleCard
            key={rule._id}
            rule={rule}
            canManage={canManage}
            onToggle={async () => { await workflowsApi.toggle(rule._id); load(); }}
            onEdit={() => setModal({ rule })}
            onDelete={async () => {
              if (!window.confirm(`Delete rule "${rule.name}"?`)) return;
              await workflowsApi.remove(rule._id);
              load();
            }}
          />
        ))}
      </div>

      {modal && (
        <RuleModal
          rule={modal.rule}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
