const router = require('express').Router();
const { protect, authorize, applyScope } = require('../middleware/auth');
const c = require('../controllers/clientController');

router.use(protect);
router.use(applyScope('Client'));
const STAFF = ['admin', 'manager', 'sales', 'operations', 'customer_service', 'finance'];

router.route('/').get(authorize(...STAFF), c.listClients).post(authorize('admin', 'manager', 'sales'), c.createClient);
router.route('/:id').get(authorize(...STAFF), c.getClient)
  .patch(authorize('admin', 'manager', 'sales'), c.updateClient)
  .delete(authorize('admin', 'manager'), c.deleteClient);
router.get('/:id/360', authorize(...STAFF), c.getClient360);

module.exports = router;
