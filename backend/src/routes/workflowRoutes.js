const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createRuleSchema, updateRuleSchema } = require('../schemas/workflowSchemas');
const c = require('../controllers/workflowController');

const mgmt = authorize('admin', 'manager');

router.use(protect);

router.get('/',                c.listRules);
router.get('/:id',             c.getRule);
router.post('/',     mgmt,     validate(createRuleSchema),  c.createRule);
router.patch('/:id', mgmt,     validate(updateRuleSchema),  c.updateRule);
router.post('/:id/toggle', mgmt, c.toggleRule);
router.delete('/:id', mgmt,    c.deleteRule);

module.exports = router;
