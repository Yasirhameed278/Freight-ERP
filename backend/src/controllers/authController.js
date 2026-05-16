const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Client = require('../models/Client');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

/* ── Cookie helpers ──────────────────────────────────────────── */
const ACCESS_MS  = 15 * 60 * 1000;        // 15 minutes
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const setCookies = (res, accessToken, refreshToken) => {
  const secure = process.env.NODE_ENV === 'production';
  res.cookie('accessToken', accessToken, {
    httpOnly: true, secure, sameSite: 'lax', maxAge: ACCESS_MS,
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, secure, sameSite: 'lax', maxAge: REFRESH_MS, path: '/api/auth/refresh',
  });
};

const clearCookies = (res) => {
  res.clearCookie('token');
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
};

const sendAuth = async (user, statusCode, res) => {
  // Load tokenVersion (select: false by default)
  const fullUser = await User.findById(user._id).select('+tokenVersion');
  const payload = { id: user._id, role: user.role, version: fullUser.tokenVersion };

  const accessToken  = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  setCookies(res, accessToken, refreshToken);

  res.status(statusCode).json({
    success: true,
    token: accessToken, // kept for clients that read Authorization header from localStorage
    user: user.toJSON(),
  });
};

/* ── Auth endpoints ──────────────────────────────────────────── */
exports.register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, phone, clientCode } = req.body;

  if (await User.findOne({ email: email.toLowerCase() })) {
    res.status(409);
    throw new Error('Email already registered');
  }

  const client = await Client.findOne({ clientCode: clientCode.toUpperCase() });
  if (!client) {
    res.status(404);
    throw new Error('No client found with that code — contact your account manager');
  }

  const user = await User.create({
    firstName, lastName, email, password, phone,
    role: 'customer',
    client: client._id,
    status: 'active',
  });

  await sendAuth(user, 201, res);
});

exports.createStaffUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, phone, role, department, branch } = req.body;

  if (role === 'customer') {
    res.status(400);
    throw new Error('Use /api/auth/register for customer accounts');
  }

  if (await User.findOne({ email: email.toLowerCase() })) {
    res.status(409);
    throw new Error('Email already registered');
  }

  const user = await User.create({
    firstName, lastName, email, password, phone,
    role: role || 'operations',
    department, branch,
    status: 'active',
  });

  res.status(201).json({ success: true, user: user.toJSON() });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }
  if (user.status !== 'active') {
    res.status(403);
    throw new Error(`Account is ${user.status} — contact admin`);
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  await sendAuth(user, 200, res);
});

exports.refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401);
    throw new Error('No refresh token');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    res.status(401);
    throw new Error('Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.id).select('+tokenVersion');
  if (!user || user.status !== 'active') {
    res.status(401);
    throw new Error('User not found or inactive');
  }
  if (decoded.version !== user.tokenVersion) {
    res.status(401);
    throw new Error('Refresh token has been revoked');
  }

  // Issue fresh pair
  const payload = { id: user._id, role: user.role, version: user.tokenVersion };
  const accessToken  = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  setCookies(res, accessToken, refreshToken);

  res.json({ success: true, token: accessToken });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('client', 'companyName clientCode');
  res.json({ success: true, user });
});

exports.logout = asyncHandler(async (req, res) => {
  if (req.user) {
    // Revoke all refresh tokens for this user
    await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });
  }
  clearCookies(res);
  res.json({ success: true, message: 'Logged out successfully' });
});

exports.updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password +tokenVersion');
  if (!(await user.comparePassword(currentPassword))) {
    res.status(401);
    throw new Error('Current password is incorrect');
  }
  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1; // revoke existing refresh tokens
  await user.save();

  await sendAuth(user, 200, res);
});

exports.listUsers = asyncHandler(async (req, res) => {
  const page  = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 25, 100);
  const skip  = (page - 1) * limit;

  const filter = {};
  if (req.query.role)   filter.role = req.query.role;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const re = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ firstName: re }, { lastName: re }, { email: re }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('client', 'companyName clientCode'),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    items: users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const ALLOWED = ['firstName', 'lastName', 'phone', 'role', 'department', 'branch', 'status', 'permissions'];
  const updates = {};
  for (const key of ALLOWED) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (updates.role === 'admin' && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only admins can promote to admin role');
  }

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!user) { res.status(404); throw new Error('User not found'); }

  res.json({ success: true, user });
});

exports.deactivateUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot deactivate your own account');
  }
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: 'inactive', $inc: { tokenVersion: 1 } },
    { new: true }
  );
  if (!user) { res.status(404); throw new Error('User not found'); }
  res.json({ success: true, user });
});

exports.bootstrapAdmin = asyncHandler(async (req, res) => {
  const adminExists = await User.findOne({ role: 'admin' });
  if (adminExists) {
    res.status(403);
    throw new Error('An admin already exists — bootstrap is disabled');
  }
  const { firstName, lastName, email, password } = req.body;
  const user = await User.create({
    firstName, lastName, email, password,
    role: 'admin',
    status: 'active',
  });
  await sendAuth(user, 201, res);
});
