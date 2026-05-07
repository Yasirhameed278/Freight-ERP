const express = require('express');
const router = express.Router();

const {
  register,
  login,
  me,
  logout,
  updatePassword,
  bootstrapAdmin,
  createStaffUser,
  listUsers,
  updateUser,
  deactivateUser,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/bootstrap-admin', bootstrapAdmin);
router.post('/register', register);
router.post('/login', login);

router.use(protect);

router.get('/me', me);
router.post('/logout', logout);
router.patch('/password', updatePassword);

router.post('/users',                authorize('admin'),           createStaffUser);
router.get( '/users',                authorize('admin', 'manager'), listUsers);
router.patch('/users/:id',           authorize('admin'),            updateUser);
router.post('/users/:id/deactivate', authorize('admin'),            deactivateUser);

module.exports = router;
