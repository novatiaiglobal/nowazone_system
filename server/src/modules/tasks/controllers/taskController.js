const Task = require('../models/Task');
const User = require('../../auth/models/User');
const { AppError } = require('../../../shared/middleware/errorHandler');
const notificationController = require('../../notifications/controllers/notificationController');

const toDate = (value) => (value ? new Date(value) : undefined);

const canViewTask = (task, user) => {
  if (user.role === 'super_admin' || user.role === 'admin') return true;
  return String(task.createdBy) === String(user._id) || String(task.assignedTo) === String(user._id);
};

const canEditTask = (task, user) => {
  if (user.role === 'super_admin' || user.role === 'admin') return true;
  return String(task.createdBy) === String(user._id);
};

async function processDueReminders(req, { onlyUserId, dryRun = false } = {}) {
  const now = new Date();
  const reminderQuery = {
    reminderAt: { $lte: now },
    reminderSentAt: { $exists: false },
    status: { $nin: ['done'] },
    isArchived: false,
    assignedTo: { $exists: true },
  };

  if (onlyUserId) reminderQuery.assignedTo = onlyUserId;

  const dueTasks = await Task.find(reminderQuery).populate('assignedTo', 'name');
  if (dryRun) return dueTasks.length;

  const io = req.app.get('io');
  for (const task of dueTasks) {
    await notificationController.createAndEmit(io, {
      title: 'Task reminder',
      message: `Task "${task.title}" is due soon.`,
      type: 'system',
      userId: task.assignedTo?._id,
      link: '/dashboard/tasks',
      metadata: { taskId: task._id },
    });
    task.reminderSentAt = now;
    await task.save({ validateBeforeSave: false });
  }

  return dueTasks.length;
}

exports.listTasks = async (req, res, next) => {
  try {
    await processDueReminders(req, { onlyUserId: req.user._id });

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const query = { isArchived: false };
    const andConditions = [];

    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.assignedTo) query.assignedTo = req.query.assignedTo;
    if (req.query.search) {
      andConditions.push({ $or: [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ] });
    }

    const scope = req.query.scope || 'my';
    if (scope !== 'team') {
      andConditions.push({ $or: [{ assignedTo: req.user._id }, { createdBy: req.user._id }] });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('assignedTo', 'name email profileImage')
        .populate('createdBy', 'name email')
        .sort({ dueDate: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Task.countDocuments(query),
    ]);

    res.json({
      status: 'success',
      data: { tasks, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (err) {
    next(err);
  }
};

exports.listAssignableUsers = async (req, res, next) => {
  try {
    const users = await User.find({ isActive: true })
      .select('name email profileImage role')
      .sort({ name: 1 })
      .limit(200);
    res.json({ status: 'success', data: { users } });
  } catch (err) {
    next(err);
  }
};

exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email profileImage')
      .populate('createdBy', 'name email');
    if (!task) return next(new AppError('Task not found', 404));
    if (!canViewTask(task, req.user)) return next(new AppError('Not allowed to access this task', 403));

    res.json({ status: 'success', data: { task } });
  } catch (err) {
    next(err);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const payload = req.validated;
    const task = await Task.create({
      ...payload,
      dueDate: toDate(payload.dueDate),
      reminderAt: toDate(payload.reminderAt),
      createdBy: req.user._id,
    });

    const fullTask = await Task.findById(task._id).populate('assignedTo', 'name email');
    if (fullTask.assignedTo) {
      const io = req.app.get('io');
      await notificationController.createAndEmit(io, {
        title: 'New task assigned',
        message: `You were assigned "${fullTask.title}".`,
        type: 'system',
        userId: fullTask.assignedTo._id,
        link: '/dashboard/tasks',
        metadata: { taskId: fullTask._id },
      });
    }

    res.status(201).json({ status: 'success', data: { task: fullTask } });
  } catch (err) {
    next(err);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const payload = req.validated;
    const task = await Task.findById(req.params.id);
    if (!task) return next(new AppError('Task not found', 404));
    if (!canEditTask(task, req.user)) return next(new AppError('Not allowed to update this task', 403));

    const previousAssignee = task.assignedTo ? String(task.assignedTo) : null;

    Object.assign(task, payload);
    if (payload.dueDate !== undefined) task.dueDate = toDate(payload.dueDate);
    if (payload.reminderAt !== undefined) {
      task.reminderAt = toDate(payload.reminderAt);
      task.reminderSentAt = undefined;
    }
    await task.save();

    const result = await Task.findById(task._id).populate('assignedTo', 'name email').populate('createdBy', 'name email');

    if (result.assignedTo && String(result.assignedTo._id) !== previousAssignee) {
      const io = req.app.get('io');
      await notificationController.createAndEmit(io, {
        title: 'Task assigned',
        message: `You were assigned "${result.title}".`,
        type: 'system',
        userId: result.assignedTo._id,
        link: '/dashboard/tasks',
        metadata: { taskId: result._id },
      });
    }

    res.json({ status: 'success', data: { task: result } });
  } catch (err) {
    next(err);
  }
};

exports.assignTask = async (req, res, next) => {
  try {
    const { assignedTo } = req.validated;
    const assignee = await User.findById(assignedTo).select('_id isActive');
    if (!assignee || !assignee.isActive) return next(new AppError('Assignee not found or inactive', 404));

    const task = await Task.findById(req.params.id);
    if (!task) return next(new AppError('Task not found', 404));
    if (!canEditTask(task, req.user)) return next(new AppError('Not allowed to assign this task', 403));

    task.assignedTo = assignedTo;
    await task.save();

    const io = req.app.get('io');
    await notificationController.createAndEmit(io, {
      title: 'Task assigned',
      message: `You were assigned "${task.title}".`,
      type: 'system',
      userId: assignedTo,
      link: '/dashboard/tasks',
      metadata: { taskId: task._id },
    });

    res.json({ status: 'success', data: { task } });
  } catch (err) {
    next(err);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return next(new AppError('Task not found', 404));
    if (!canEditTask(task, req.user)) return next(new AppError('Not allowed to delete this task', 403));

    task.isArchived = true;
    await task.save({ validateBeforeSave: false });
    res.json({ status: 'success', message: 'Task archived' });
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const scope = req.query.scope || 'my';
    const baseQuery = { isArchived: false };
    if (scope !== 'team') {
      baseQuery.$or = [{ assignedTo: req.user._id }, { createdBy: req.user._id }];
    }

    const [todo, inProgress, done, overdue] = await Promise.all([
      Task.countDocuments({ ...baseQuery, status: 'todo' }),
      Task.countDocuments({ ...baseQuery, status: 'in_progress' }),
      Task.countDocuments({ ...baseQuery, status: 'done' }),
      Task.countDocuments({ ...baseQuery, dueDate: { $lt: new Date() }, status: { $nin: ['done'] } }),
    ]);

    res.json({ status: 'success', data: { todo, inProgress, done, overdue } });
  } catch (err) {
    next(err);
  }
};

exports.processReminders = async (req, res, next) => {
  try {
    const onlyUserId = req.body?.userId || undefined;
    const processed = await processDueReminders(req, { onlyUserId });
    res.json({ status: 'success', data: { processed } });
  } catch (err) {
    next(err);
  }
};
