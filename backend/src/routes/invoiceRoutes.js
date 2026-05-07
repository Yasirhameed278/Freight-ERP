const router = require('express').Router();
const { protect, authorize, applyScope } = require('../middleware/auth');
const c = require('../controllers/invoiceController');

router.use(protect);
router.use(applyScope('Invoice'));
const STAFF = ['admin', 'manager', 'finance', 'operations'];

router.route('/').get(c.listInvoices).post(authorize(...STAFF), c.createInvoice);
router.route('/:id').get(c.getInvoice);
router.get('/:id/pdf', c.downloadInvoicePdf);
router.post('/:id/send',    authorize(...STAFF), c.sendInvoice);
router.post('/:id/payments', authorize(...STAFF), c.recordPayment);
router.post('/:id/cancel',  authorize('admin', 'manager', 'finance'), c.cancelInvoice);

module.exports = router;
