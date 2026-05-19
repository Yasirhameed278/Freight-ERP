import { useState, useEffect, useCallback } from 'react';
import { workflowsApi } from '../api';
import { useAuth } from '../context/AuthContext';

/* ── Constants ─────────────────────────────────────────────── */
const ENTITY_EVENTS = {
  Shipment: ['status_changed', 'milestone_completed', 'created'],
  Deal:     ['stage_changed', 'created'],
  Invoice:  ['status_changed', 'created'],
};

const ENTITY_META = {
  Shipment: { icon: 'bi-boxes',   color: '#7c3aed', bg: '#f5f3ff' },
  Deal:     { icon: 'bi-kanban',  color: '#1d4ed8', bg: '#eff6ff' },
  Invoice:  { icon: 'bi-receipt', color: '#059669', bg: '#f0fdf4' },
};

const SHIPMENT_STATUSES = [
  'quote','booked','pickup_scheduled','cargo_received','customs_export',
  'loaded','in_transit','transhipment','arrived','customs_import',
  'cleared','out_for_delivery','delivered','completed','cancelled','on_hold',
];
const DEAL_STAGES      = ['lead','qualified','proposal','negotiation','won','lost'];
const INVOICE_STATUSES = ['draft','sent','partially_paid','paid','overdue','cancelled','written_off'];
const ROLES     = ['admin','manager','sales','operations','finance','customer_service','customs','warehouse'];
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

/* ── Helpers ───────────────────────────────────────────────── */
function rulePreview(rule) {
  const t    = rule.trigger;
  const conds = (t.conditions || []).map(c => `${c.field} ${c.operator === 'eq' ? '=' : c.operator} "${c.value}"`).join(' & ');
  const acts  = (rule.actions || []).map(a =>
    a.type === 'create_task'
      ? `Create task "${a.taskTitle}" → ${a.assignToType === 'role' ? a.assignRole : a.assignToType} (due ${(a.dueDays || 0) * 24 + (a.dueHours || 24)}h)`
      : `Notify [${(a.notifRoles || []).join(', ')}]: "${a.notifTitle}"`
  ).join(' · ');
  return { entity: t.entity, event: EVENT_LABELS[t.event] || t.event, conds, acts };
}

/* ── Condition Row ─────────────────────────────────────────── */
function ConditionRow({ cond, entity, onChange, onRemove }) {
  const statusOpts   = entity === 'Shipment' ? SHIPMENT_STATUSES : entity === 'Deal' ? DEAL_STAGES : INVOICE_STATUSES;
  const isStatusField = cond.field === 'status' || cond.field === 'stage';

  return (
    <div className="wf-condition-row">
      <div className="wf-condition-inner">
        <select className="wf-inline-select" value={cond.field}
          onChange={e => onChange({ ...cond, field: e.target.value, value: '' })}>
          <option value="status">status</option>
          <option value="stage">stage</option>
          <option value="mode">mode</option>
          <option value="">custom…</option>
        </select>
        <select className="wf-inline-select" value={cond.operator}
          onChange={e => onChange({ ...cond, operator: e.target.value })}>
          <option value="eq">equals</option>
          <option value="neq">not equals</option>
          <option value="in">is one of</option>
          <option value="not_in">is not one of</option>
        </select>
        {isStatusField ? (
          <select className="wf-inline-select wf-inline-select-grow" value={cond.value}
            onChange={e => onChange({ ...cond, value: e.target.value })}>
            <option value="">— select value —</option>
            {statusOpts.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : (
          <input className="wf-inline-input wf-inline-select-grow" placeholder="value…"
            value={cond.value || ''} onChange={e => onChange({ ...cond, value: e.target.value })} />
        )}
      </div>
      <button type="button" className="wf-remove-btn" onClick={onRemove} title="Remove">
        <i className="bi bi-x" />
      </button>
    </div>
  );
}

/* ── Action Card ───────────────────────────────────────────── */
function ActionCard({ action, index, onChange, onRemove }) {
  const set = (k, v) => onChange({ ...action, [k]: v });

  return (
    <div className="wf-action-card">
      <div className="wf-action-card-top">
        <div className="wf-action-left">
          <div className="wf-action-num">{index + 1}</div>
          <div className="wf-action-tabs">
            {['create_task', 'send_notification'].map(t => (
              <button key={t} type="button"
                className={`wf-action-tab${action.type === t ? ' active' : ''}`}
                onClick={() => onChange({ type: t })}
              >
                <i className={`bi ${t === 'create_task' ? 'bi-check2-square' : 'bi-bell'}`} />
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
        <div className="wf-action-body">
          <div className="wf-form-row">
            <div className="wf-form-col-full">
              <div className="wf-label">
                Task Title <span className="wf-hint">use {'{ref}'} {'{status}'} {'{stage}'}</span>
              </div>
              <input className="wf-input" placeholder="e.g. Notify consignee — {ref} has arrived"
                value={action.taskTitle || ''} onChange={e => set('taskTitle', e.target.value)} />
            </div>
          </div>
          <div className="wf-form-row">
            <div className="wf-form-col-full">
              <div className="wf-label">Description <span className="wf-hint">(optional)</span></div>
              <input className="wf-input" value={action.taskDesc || ''} onChange={e => set('taskDesc', e.target.value)} />
            </div>
          </div>
          <div className="wf-form-row wf-form-row-3col">
            <div>
              <div className="wf-label">Assign To</div>
              <div className="wf-pill-group">
                {Object.entries(ASSIGN_LABELS).map(([v, l]) => (
                  <button key={v} type="button"
                    className={`wf-pill-btn${action.assignToType === v ? ' active' : ''}`}
                    onClick={() => set('assignToType', v)}>{l}</button>
                ))}
              </div>
            </div>
            {(!action.assignToType || action.assignToType === 'role') && (
              <div>
                <div className="wf-label">Role</div>
                <select className="wf-select" value={action.assignRole || ''} onChange={e => set('assignRole', e.target.value)}>
                  <option value="">— select —</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}
            <div>
              <div className="wf-label">Priority</div>
              <select className="wf-select" value={action.priority || 'normal'} onChange={e => set('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="wf-form-row">
            <div>
              <div className="wf-label">Due after trigger</div>
              <div className="wf-due-row">
                <input type="number" min="0" className="wf-input wf-input-num"
                  value={action.dueDays ?? 0} onChange={e => set('dueDays', +e.target.value)} />
                <span className="wf-due-unit">days</span>
                <input type="number" min="0" max="23" className="wf-input wf-input-num"
                  value={action.dueHours ?? 24} onChange={e => set('dueHours', +e.target.value)} />
                <span className="wf-due-unit">hours</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {action.type === 'send_notification' && (
        <div className="wf-action-body">
          <div className="wf-form-row">
            <div className="wf-form-col-half">
              <div className="wf-label">Title</div>
              <input className="wf-input" value={action.notifTitle || ''} onChange={e => set('notifTitle', e.target.value)} />
            </div>
          </div>
          <div className="wf-form-row">
            <div className="wf-form-col-full">
              <div className="wf-label">Body</div>
              <input className="wf-input" value={action.notifBody || ''} onChange={e => set('notifBody', e.target.value)} />
            </div>
          </div>
          <div className="wf-form-row">
            <div className="wf-form-col-full">
              <div className="wf-label" style={{ marginBottom: 8 }}>Notify Roles</div>
              <div className="wf-pill-group">
                {ROLES.map(r => {
                  const checked = (action.notifRoles || []).includes(r);
                  return (
                    <button key={r} type="button"
                      className={`wf-pill-btn${checked ? ' active' : ''}`}
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

  const setTrigger   = (k, v) => setForm(f => ({ ...f, trigger: { ...f.trigger, [k]: v } }));
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

  return (
    <>
      <div className="wf-backdrop" onClick={onClose} />
      <div className="wf-modal-center">
        <div className="wf-modal">

          {/* Header */}
          <div className="wf-modal-header">
            <div>
              <div className="wf-modal-title">{rule ? 'Edit Workflow Rule' : 'New Workflow Rule'}</div>
              <div className="wf-modal-sub">Define what triggers the rule and what actions to take</div>
            </div>
            <button className="wf-modal-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
          </div>

          <form onSubmit={submit}>
            <div className="wf-modal-body">

              {/* Name + Description */}
              <div className="wf-name-row">
                <div>
                  <div className="wf-label">Rule Name <span style={{ color: 'var(--danger)' }}>*</span></div>
                  <input className="wf-input" placeholder="e.g. Notify on arrival"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <div className="wf-label">Description</div>
                  <input className="wf-input" value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>

              {/* ── TRIGGER section ── */}
              <div className="wf-section">
                <div className="wf-section-bar" style={{ background: em.color }}>
                  <i className="bi bi-lightning-charge-fill" style={{ color: '#fff', fontSize: 14 }} />
                </div>
                <div className="wf-section-body">
                  <div className="wf-section-title">When (Trigger)</div>
                  <div className="wf-section-sub">Select the entity and event that fires this rule</div>

                  <div className="wf-entity-row">
                    {Object.entries(ENTITY_META).map(([entity, m]) => (
                      <button key={entity} type="button"
                        className={`wf-entity-btn${form.trigger.entity === entity ? ' active' : ''}`}
                        style={{ '--ec': m.color, '--eb': m.bg }}
                        onClick={() => changeEntity(entity)}
                      >
                        <i className={`bi ${m.icon}`} />{entity}
                      </button>
                    ))}
                  </div>

                  <div className="wf-pill-group" style={{ marginBottom: 20 }}>
                    {(ENTITY_EVENTS[form.trigger.entity] || []).map(ev => (
                      <button key={ev} type="button"
                        className={`wf-pill-btn${form.trigger.event === ev ? ' active' : ''}`}
                        onClick={() => setTrigger('event', ev)}
                      >
                        {EVENT_LABELS[ev] || ev}
                      </button>
                    ))}
                  </div>

                  {/* Conditions */}
                  <div className="wf-cond-block">
                    <div className="wf-cond-header">
                      <span className="wf-label" style={{ margin: 0 }}>
                        Conditions <span className="wf-hint">(all must match — leave empty to match any)</span>
                      </span>
                      <button type="button" className="wf-add-cond-btn" onClick={addCond}>
                        <i className="bi bi-plus" />Add Condition
                      </button>
                    </div>
                    {form.trigger.conditions.length === 0 && (
                      <div className="wf-cond-empty">
                        No conditions — rule fires on every {EVENT_LABELS[form.trigger.event] || form.trigger.event} event
                      </div>
                    )}
                    {form.trigger.conditions.map((c, i) => (
                      <ConditionRow key={i} cond={c} entity={form.trigger.entity}
                        onChange={v => setCond(i, v)} onRemove={() => remCond(i)} />
                    ))}
                  </div>
                </div>
              </div>

              {/* ── ACTIONS section ── */}
              <div className="wf-section">
                <div className="wf-section-bar" style={{ background: '#059669' }}>
                  <i className="bi bi-gear-fill" style={{ color: '#fff', fontSize: 14 }} />
                </div>
                <div className="wf-section-body">
                  <div className="wf-section-title">Then (Actions)</div>
                  <div className="wf-section-sub">What happens when the trigger fires</div>

                  <div style={{ marginTop: 16 }}>
                    {form.actions.map((a, i) => (
                      <ActionCard key={i} action={a} index={i}
                        onChange={v => setAction(i, v)} onRemove={() => remAction(i)} />
                    ))}
                    <button type="button" className="wf-add-action-btn" onClick={addAction}>
                      <i className="bi bi-plus-circle" />Add Another Action
                    </button>
                  </div>
                </div>
              </div>

              {error && <div className="wf-error">{error}</div>}
            </div>

            <div className="wf-modal-footer">
              <button type="submit" className="wf-btn wf-btn-dark" disabled={saving}>
                {saving
                  ? <><span className="wf-spinner" />Saving…</>
                  : rule ? 'Save Changes' : 'Create Rule'
                }
              </button>
              <button type="button" className="wf-btn" onClick={onClose}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

/* ── Rule Card ─────────────────────────────────────────────── */
function RuleCard({ rule, canManage, onToggle, onEdit, onDelete }) {
  const em = ENTITY_META[rule.trigger.entity] || ENTITY_META.Shipment;
  const { entity, event, conds, acts } = rulePreview(rule);

  return (
    <div className={`wf-rule-card${!rule.active ? ' wf-rule-inactive' : ''}`}>
      <div className="wf-rule-card-inner">
        <div className="wf-rule-icon" style={{ background: em.bg, color: em.color }}>
          <i className={`bi ${em.icon}`} />
        </div>

        <div className="wf-rule-body">
          <div className="wf-rule-name-row">
            <span className="wf-rule-name">{rule.name}</span>
            <span className={`wf-status-pill${rule.active ? ' active' : ''}`}>
              <span className="wf-status-dot" />
              {rule.active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="wf-preview-line">
            <span className="wf-preview-entity">{entity}</span>
            <i className="bi bi-arrow-right wf-preview-arrow" />
            <span className="wf-preview-event">{event}</span>
            {conds && <><span className="wf-preview-dot">·</span><span className="wf-preview-cond">{conds}</span></>}
            <i className="bi bi-arrow-right wf-preview-arrow" />
            <span className="wf-preview-act">{acts}</span>
          </div>

          <div className="wf-rule-meta">
            {rule.runCount > 0 && <span><i className="bi bi-play-circle" />{rule.runCount} run{rule.runCount !== 1 ? 's' : ''}</span>}
            {rule.lastRunAt && <span><i className="bi bi-clock-history" />{new Date(rule.lastRunAt).toLocaleDateString()}</span>}
            {rule.createdBy && <span><i className="bi bi-person" />{rule.createdBy.name}</span>}
            <span><i className="bi bi-gear" />{rule.actions?.length || 0} action{rule.actions?.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {canManage && (
          <div className="wf-rule-actions">
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
    <div className="wf-shell">
      {/* Header */}
      <div className="wf-header">
        <div>
          <h1 className="wf-title">Workflow Rules</h1>
          <div className="wf-subtitle">
            Automate task creation and notifications when shipments move, deals advance, or invoices change.
          </div>
        </div>
        {canManage && (
          <button className="wf-btn wf-btn-dark" onClick={() => setModal({})}>
            <i className="bi bi-plus-lg" />New Rule
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="wf-loading">
          <div className="dashboard-loader">
            <div className="dashboard-loader-ring" />
            <i className="bi bi-diagram-3 dashboard-loader-icon" />
          </div>
          <span>Loading rules…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && rules.length === 0 && (
        <div className="wf-empty">
          <i className="bi bi-lightning-charge" style={{ fontSize: 44, color: 'var(--brand)', opacity: .25 }} />
          <div className="wf-empty-title">No workflow rules yet</div>
          <div className="wf-empty-sub">
            Create rules to automatically generate tasks and notify your team when key events happen.
          </div>
          {canManage && (
            <button className="wf-btn wf-btn-dark" onClick={() => setModal({})}>
              Create First Rule
            </button>
          )}
        </div>
      )}

      {/* Rule list */}
      {!loading && rules.length > 0 && (
        <div className="wf-rule-list">
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
      )}

      {/* Modal */}
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
