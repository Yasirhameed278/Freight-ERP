const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/activityController');

router.use(protect);
router.get('/', authorize('admin', 'manager', 'finance'), c.list);

module.exports = router;
