const WorkflowRule = require('../models/WorkflowRule');
const Task         = require('../models/Task');
const User         = require('../models/User');
const notify       = require('./notificationService');

/* ── condition evaluator ──────────────────────────────────── */
function evalCondition(entity, cond) {
  const val = entity[cond.field];
  switch (cond.operator) {
    case 'eq':      return val === cond.value;
    case 'neq':     return val !== cond.value;
    case 'in':      return Array.isArray(cond.value) && cond.value.includes(val);
    case 'not_in':  return Array.isArray(cond.value) && !cond.value.includes(val);
    default:        return false;
  }
}

/* ── resolve assigned user for create_task actions ─────────── */
async function resolveAssignee(action, context) {
  if (action.assignToType === 'creator' && context.actorId) return context.actorId;
  if (action.assignToType === 'assignedTo' && context.entity.assignedTo) return context.entity.assignedTo;
  if (action.assignToType === 'role' && action.assignRole) {
    // Pick the first active user with that role (round-robin could come later)
    const u = await User.findOne({ role: action.assignRole, isActive: { $ne: false } }).select('_id').lean();
    return u?._id || null;
  }
  return null;
}

/* ── execute a single action ──────────────────────────────── */
async function execAction(action, rule, entity, entityType, context) {
  if (action.type === 'create_task') {
    const assignedTo = await resolveAssignee(action, context);
    const dueAt = new Date(
      Date.now() + ((action.dueDays || 0) * 86400 + (action.dueHours || 24) * 3600) * 1000
    );

    // Interpolate entity fields into title/desc
    const fill = (str = '') =>
      str
        .replace(/\{status\}/g,   entity.status || '')
        .replace(/\{stage\}/g,    entity.stage  || '')
        .replace(/\{ref\}/g,      entity.shipmentNumber || entity.dealCode || entity.invoiceNumber || '')
        .replace(/\{entity\}/g,   entityType);

    await Task.create({
      title:        fill(action.taskTitle) || `${rule.name} task`,
      description:  fill(action.taskDesc),
      priority:     action.priority || 'normal',
      assignedTo,
      createdBy:    context.actorId || null,
      dueAt,
      linkedTo: {
        kind:  entityType,
        id:    entity._id,
        label: entity.shipmentNumber || entity.dealCode || entity.invoiceNumber || String(entity._id),
      },
      workflowRule: rule._id,
    });

    // Notify the assignee
    if (assignedTo) {
      notify.create(assignedTo, {
        type:  'shipment_milestone',  // reuse closest type; task type could be added later
        title: `New task: ${fill(action.taskTitle) || rule.name}`,
        body:  `Due ${dueAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${entityType} ${entity.shipmentNumber || entity.dealCode || ''}`,
        metadata: { taskRule: rule._id },
      }).catch(() => {});
    }
  }

  if (action.type === 'send_notification') {
    if (action.notifRoles?.length) {
      notify.createForRoles(action.notifRoles, {
        type:  'shipment_milestone',
        title: action.notifTitle || rule.name,
        body:  action.notifBody  || '',
        metadata: { workflowRule: rule._id, entityId: entity._id },
      }).catch(() => {});
    }
  }
}

/* ── public API ───────────────────────────────────────────── */

/**
 * Fire a workflow trigger.
 * @param {object}  opts
 * @param {string}  opts.entity       - The Mongoose document (must have _id, status/stage etc.)
 * @param {string}  opts.entityType   - 'Shipment' | 'Deal' | 'Invoice'
 * @param {string}  opts.event        - 'status_changed' | 'stage_changed' | 'milestone_completed' | 'created'
 * @param {object}  opts.context      - { actorId }
 */
async function fire({ entity, entityType, event, context = {} }) {
  try {
    const rules = await WorkflowRule.find({
      'trigger.entity': entityType,
      'trigger.event':  event,
      active: true,
    }).lean();

    if (!rules.length) return;

    const matched = rules.filter((r) =>
      (r.trigger.conditions || []).every((c) => evalCondition(entity, c))
    );

    for (const rule of matched) {
      for (const action of rule.actions) {
        await execAction(action, rule, entity, entityType, context);
      }
      // Update run stats (fire-and-forget, no await needed)
      WorkflowRule.findByIdAndUpdate(rule._id, {
        $inc: { runCount: 1 },
        lastRunAt: new Date(),
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[workflow] fire error:', err.message);
  }
}

module.exports = { fire };
