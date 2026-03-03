const express = require('express');
const ctrl = require('../controllers/taskController');
const { protect, restrictTo } = require('../../../shared/middleware/auth');
const { validate } = require('../../../shared/middleware/validation');
const { createTaskSchema, updateTaskSchema, assignTaskSchema } = require('../schemas/taskSchemas');

const router = express.Router();

router.use(protect);

router.get('/stats', ctrl.getStats);
router.get('/users', ctrl.listAssignableUsers);
router.post('/reminders/process', restrictTo('admin', 'super_admin'), ctrl.processReminders);

router.get('/', ctrl.listTasks);
router.post('/', validate(createTaskSchema), ctrl.createTask);
router.get('/:id', ctrl.getTask);
router.patch('/:id', validate(updateTaskSchema), ctrl.updateTask);
router.patch('/:id/assign', validate(assignTaskSchema), ctrl.assignTask);
router.delete('/:id', ctrl.deleteTask);

module.exports = router;
