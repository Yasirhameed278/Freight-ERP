const express = require('express');
const router = express.Router();
const {
  listShipments, getShipment, createShipment, updateShipment,
  updateMilestone, addMilestone, deleteShipment,
  approveShipment, rejectShipment, generateBL,
} = require('../controllers/shipmentController');
const { protect, authorize, applyScope } = require('../middleware/auth');

router.use(protect);
router.use(applyScope('Shipment'));

const STAFF    = ['admin', 'manager', 'operations', 'sales', 'customer_service'];
const OPS      = ['admin', 'manager', 'operations'];
const APPROVER = ['admin', 'manager'];

router.route('/')
  .get(listShipments)
  .post(authorize(...STAFF), createShipment);

router.route('/:id')
  .get(getShipment)
  .patch(authorize(...STAFF), updateShipment)
  .delete(authorize('admin', 'manager'), deleteShipment);

router.post('/:id/approve',  authorize(...APPROVER), approveShipment);
router.post('/:id/reject',   authorize(...APPROVER), rejectShipment);
router.get( '/:id/bl-pdf',   authorize(...STAFF),    generateBL);

router.post( '/:id/milestones',              authorize(...OPS), addMilestone);
router.patch('/:id/milestones/:milestoneId', authorize(...OPS), updateMilestone);

module.exports = router;
