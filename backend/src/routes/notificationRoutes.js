const router = require('express').Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/notificationController');

router.use(protect);

// SSE stream — must be first to avoid /:id capture
router.get('/stream',      c.stream);
router.get('/unread-count', c.unreadCount);
router.get('/',            c.list);

// read-all before /:id/read to prevent route shadowing
router.patch('/read-all',  c.markAllRead);
router.patch('/:id/read',  c.markRead);
router.delete('/:id',      c.deleteNotification);

module.exports = router;
