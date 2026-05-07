const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/rateController');

router.use(protect);
const STAFF = ['admin', 'manager', 'operations', 'sales', 'customer_service'];

router.get('/search', authorize(...STAFF), c.searchRates);
router.route('/').get(authorize(...STAFF), c.listRates).post(authorize('admin', 'manager'), c.createRate);
router.route('/:id').get(authorize(...STAFF), c.getRate).patch(authorize('admin', 'manager'), c.updateRate).delete(authorize('admin', 'manager'), c.deleteRate);

module.exports = router;
