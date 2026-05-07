const express = require('express');
const router = express.Router();
const {
  getKanban, listDeals, getDeal, createDeal,
  updateDeal, moveDeal, reorderDeals, deleteDeal,
} = require('../controllers/dealController');
const { protect, authorize, applyScope } = require('../middleware/auth');

router.use(protect);

const DEAL_ROLES = ['admin', 'manager', 'sales', 'operations', 'customer_service'];

router.use(authorize(...DEAL_ROLES));
router.use(applyScope('Deal'));

router.get('/kanban', getKanban);
router.patch('/reorder', reorderDeals);

router.route('/')
  .get(listDeals)
  .post(createDeal);

router.route('/:id')
  .get(getDeal)
  .patch(updateDeal)
  .delete(deleteDeal);

router.patch('/:id/move', moveDeal);

module.exports = router;
