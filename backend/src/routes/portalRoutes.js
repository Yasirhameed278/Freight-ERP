const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/portalController');

// Public — no auth
router.post('/rates/search',        c.publicSearchRates);
router.post('/quote-request',       c.submitQuoteRequest);
router.get('/quote/:token',         c.getQuoteByToken);
router.post('/quote/:token/accept', c.acceptQuote);
router.post('/quote/:token/decline', c.declineQuote);

// Internal — sales team
router.get('/admin/requests', protect, authorize('admin', 'manager', 'sales'), c.listPortalQuotes);

module.exports = router;
