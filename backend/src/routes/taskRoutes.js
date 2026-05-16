const router = require('express').Router();
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createTaskSchema, updateTaskSchema } = require('../schemas/taskSchemas');
const c = require('../controllers/taskController');

router.use(protect);

router.get('/my-counts',     c.myCounts);
router.get('/',              c.listTasks);
router.get('/:id',           c.getTask);
router.post('/',             validate(createTaskSchema), c.createTask);
router.patch('/:id',         validate(updateTaskSchema), c.updateTask);
router.post('/:id/start',    c.startTask);
router.post('/:id/complete', c.completeTask);
router.delete('/:id',        c.deleteTask);

module.exports = router;
