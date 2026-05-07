const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const { protect, applyScope } = require('../middleware/auth');
const {
  uploadDocument,
  reprocessDocument,
  getDocument,
  listDocuments,
  downloadDocument,
} = require('../controllers/documentController');

router.use(protect);

router.post('/upload',     applyScope('Shipment'), upload.single('file'), uploadDocument);
router.post('/:id/reprocess', applyScope('Shipment'), reprocessDocument);

router.get('/',           applyScope('Document'), listDocuments);
router.get('/:id',        applyScope('Document'), getDocument);
router.get('/:id/download', applyScope('Document'), downloadDocument);

module.exports = router;
