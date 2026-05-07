const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Client = require('../models/Client');
const { signToken } = require('../utils/jwt');

const sendAuth = (user, statusCode, res) => {
  const token = signToken({ id: user._id, role: user.role });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
  res.cookie('token', token, cookieOptions);

  const safeUser = user.toJSON();

  res.status(statusCode).json({
    success: true,
    token,
    user: safeUser,
  });
};

exports.register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, phone, clientCode } = req.body;

  if (!firstName || !lastName || !email || !password) {
    res.status(400);
    throw new Error('firstName, lastName, email, password are required');
  }

  if (await User.findOne({ email: email.toLowerCase() })) {
    res.status(409);
    throw new Error('Email already registered');
  }

  if (!clientCode) {
    res.status(400);
    throw new Error('clientCode is required for customer registration');
  }
  const client = await Client.findOne({ clientCode: clientCode.toUpperCase() });
  if (!client) {
    res.status(404);
    throw new Error('No client found with that code — contact your account manager');
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    phone,
    role: 'customer',
    client: client._id,
    status: 'active',
  });

  sendAuth(user, 201, res);
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

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

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

  sendAuth(user, 200, res);
});

exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('client', 'companyName clientCode');
  res.json({ success: true, user });
});

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
};

exports.updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('currentPassword and newPassword are required');
  }
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    res.status(401);
    throw new Error('Current password is incorrect');
  }
  user.password = newPassword;
  await user.save();
  sendAuth(user, 200, res);
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
    { status: 'inactive' },
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
  if (!firstName || !lastName || !email || !password) {
    res.status(400);
    throw new Error('firstName, lastName, email, password are required');
  }
  const user = await User.create({
    firstName, lastName, email, password,
    role: 'admin',
    status: 'active',
  });
  sendAuth(user, 201, res);
});
