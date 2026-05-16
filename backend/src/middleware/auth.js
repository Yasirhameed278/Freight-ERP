const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

/* ----------- 1. protect: verify JWT, attach user ----------- */
const protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    // New short-lived access token cookie
    token = req.cookies.accessToken;
  } else if (req.cookies?.token) {
    // Legacy cookie (backward compat during migration)
    token = req.cookies.token;
  } else if (req.query.token) {
    // EventSource (SSE) cannot send headers — token passed as query param
    token = req.query.token;
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized — no token provided');
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    res.status(401);
    throw new Error('Invalid or expired token');
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    res.status(401);
    throw new Error('User no longer exists');
  }
  if (user.status !== 'active') {
    res.status(403);
    throw new Error('Account is not active');
  }
  if (user.changedPasswordAfter(decoded.iat)) {
    res.status(401);
    throw new Error('Password was recently changed — please log in again');
  }

  req.user = user;
  next();
});

/* ----------- 2. authorize: role gate ----------- */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authenticated');
  }
  if (!roles.includes(req.user.role)) {
    res.status(403);
    throw new Error(`Role '${req.user.role}' is not authorized for this action`);
  }
  next();
};

/* ----------- 3. buildScopeFilter: Mongoose filter per role+resource ----------- */
const buildScopeFilter = (user, resource) => {
  // Full access
  if (user.role === 'admin' || user.role === 'manager') return {};

  // Sales Rep: only assigned records
  if (user.role === 'sales') {
    switch (resource) {
      case 'Deal':
        return { $or: [{ owner: user._id }, { team: user._id }] };
      case 'Client':
        return { $or: [{ salesRep: user._id }, { accountManager: user._id }] };
      case 'Shipment':
        return { $or: [{ salesRep: user._id }, { team: user._id }] };
      case 'Document':
        return { uploadedBy: user._id };
      case 'Quote':
        return { $or: [{ salesRep: user._id }, { createdBy: user._id }] };
      case 'Invoice':
        return { _id: null };
      default:
        return { _id: null };
    }
  }

  // Customer: only their own records via linked Client
  if (user.role === 'customer') {
    if (!user.client) return { _id: null };
    switch (resource) {
      case 'Shipment':
        return {
          $or: [
            { customer: user.client },
            { shipper: user.client },
            { consignee: user.client },
          ],
        };
      case 'Client':
        return { _id: user.client };
      case 'Document':
        return { client: user.client, visibility: { $in: ['client', 'public'] } };
      case 'Deal':
        return { _id: null };
      case 'Quote':
        return { client: user.client };
      case 'Invoice':
        return { client: user.client, type: 'ar' };
      default:
        return { _id: null };
    }
  }

  // Operations / finance / customer_service / agent — broad read for now,
  // tighten in later phases as needed.
  return {};
};

/* ----------- 4. applyScope: middleware that injects req.scope ----------- */
const applyScope = (resource) => (req, res, next) => {
  req.scope = buildScopeFilter(req.user, resource);
  next();
};

module.exports = { protect, authorize, applyScope, buildScopeFilter };
