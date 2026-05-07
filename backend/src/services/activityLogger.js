const Activity = require('../models/Activity');

/**
 * Fire-and-forget activity logging. Never blocks the request — failures
 * are swallowed so audit-log issues can never break business operations.
 */
const log = ({ req, entityType, entityId, action, summary, diff, metadata }) => {
  Activity.create({
    entityType,
    entityId,
    action,
    summary,
    diff,
    metadata,
    user: req?.user?._id,
    ipAddress: req?.ip,
    userAgent: req?.get?.('user-agent'),
  }).catch((err) => {
    console.error('[activity-log] failed:', err.message);
  });
};

const computeDiff = (before, after, fields) => {
  const diff = {};
  for (const f of fields) {
    const a = JSON.stringify(before?.[f]);
    const b = JSON.stringify(after?.[f]);
    if (a !== b) diff[f] = { from: before?.[f], to: after?.[f] };
  }
  return Object.keys(diff).length ? diff : null;
};

module.exports = { log, computeDiff };
