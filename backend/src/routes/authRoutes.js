const express = require('express');
const router = express.Router();

const {
  register, login, refresh, me, logout,
  updatePassword, bootstrapAdmin,
  createStaffUser, listUsers, updateUser, deactivateUser,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter, strictLimiter } = require('../middleware/rateLimiter');
const {
  loginSchema, registerSchema, createStaffSchema,
  updatePasswordSchema, bootstrapSchema,
} = require('../schemas/authSchemas');

/* Public */
router.post('/bootstrap-admin', strictLimiter, validate(bootstrapSchema), bootstrapAdmin);
router.post('/register',        authLimiter,   validate(registerSchema),   register);
router.post('/login',           authLimiter,   validate(loginSchema),      login);
router.post('/refresh',                                                     refresh);

/* Protected */
router.use(protect);

router.get('/me', me);
router.post('/logout', logout);
router.patch('/password', validate(updatePasswordSchema), updatePassword);

router.post('/users',                authorize('admin'),            validate(createStaffSchema), createStaffUser);
router.get( '/users',                authorize('admin', 'manager'), listUsers);
router.patch('/users/:id',           authorize('admin'),            updateUser);
router.post('/users/:id/deactivate', authorize('admin'),            deactivateUser);

module.exports = router;
