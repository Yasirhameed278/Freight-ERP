const router = require('express').Router();
const { protect, authorize, applyScope } = require('../middleware/auth');
const c = require('../controllers/quoteController');

router.use(protect);
router.use(applyScope('Quote'));
const STAFF = ['admin', 'manager', 'sales', 'operations'];

router.route('/').get(authorize(...STAFF), c.listQuotes).post(authorize(...STAFF), c.createQuote);
router.route('/:id').get(authorize(...STAFF), c.getQuote).patch(authorize(...STAFF), c.updateQuote);
router.get('/:id/pdf', authorize(...STAFF), c.downloadQuotePdf);
router.post('/:id/send',    authorize(...STAFF), c.sendQuote);
router.post('/:id/accept',  authorize(...STAFF), c.acceptQuote);
router.post('/:id/reject',  authorize(...STAFF), c.rejectQuote);
router.post('/:id/convert', authorize(...STAFF), c.convertToShipment);

module.exports = router;
