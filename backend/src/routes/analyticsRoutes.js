const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/analyticsController');

router.use(protect);
router.use(authorize('admin', 'manager', 'finance', 'operations'));

router.get('/overview',           c.overview);
router.get('/revenue-by-mode',    c.revenueByMode);
router.get('/shipments-trend',    c.shipmentsTrend);
router.get('/top-customers',      c.topCustomers);
router.get('/pipeline',           c.pipeline);
router.get('/ar-aging',           c.arAging);
router.get('/operational-kpis',   c.operationalKPIs);
router.get('/sales-summary',      c.salesSummary);
router.get('/ar-by-customer',     c.arByCustomer);
router.get('/ap-by-vendor',       c.apByVendor);

module.exports = router;
