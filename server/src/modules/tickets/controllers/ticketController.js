const Ticket = require('../models/Ticket');
const ChatSession = require('../../chatbot/models/ChatSession');
const { AppError } = require('../../../shared/middleware/errorHandler');

exports.listTickets = async (req, res, next) => {
  try {
    const page  = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const filter = {};
    // By default, hide closed tickets from the main list.
    // Closed tickets are only returned when an explicit status filter is provided.
    if (req.query.status)   filter.status   = req.query.status;
    else                    filter.status   = { $ne: 'closed' };
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
    if (req.query.search) filter.$or = [
      { subject:        { $regex: req.query.search, $options: 'i' } },
      { ticketNumber:   { $regex: req.query.search, $options: 'i' } },
      { requesterEmail: { $regex: req.query.search, $options: 'i' } },
    ];
    // Badge: count tickets updated after this timestamp (so badge clears when admin visits page)
    const updatedAfter = req.query.updatedAfter && Number(req.query.updatedAfter);
    if (Number.isFinite(updatedAfter)) filter.updatedAt = { $gt: new Date(updatedAfter) };

    const [tickets, total] = await Promise.all([
      Ticket.find(filter).select('-messages').populate('assignedTo', 'name').sort('-createdAt').skip((page - 1) * limit).limit(limit),
      Ticket.countDocuments(filter),
    ]);

    res.json({ status: 'success', data: { tickets, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (err) { next(err); }
};

exports.getTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('assignedTo', 'name email').populate('messages.sender', 'name');
    if (!ticket) return next(new AppError('Ticket not found', 404));
    res.json({ status: 'success', data: { ticket } });
  } catch (err) { next(err); }
};

exports.createTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ status: 'success', data: { ticket } });
  } catch (err) { next(err); }
};

exports.updateTicket = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.status === 'resolved' && !updates.resolvedAt) updates.resolvedAt = new Date();

    const ticket = await Ticket.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!ticket) return next(new AppError('Ticket not found', 404));
    res.json({ status: 'success', data: { ticket } });
  } catch (err) { next(err); }
};

exports.addMessage = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return next(new AppError('Ticket not found', 404));

    const message = {
      sender:     req.user._id,
      senderName: req.user.name,
      content:    req.body.content,
      isInternal: req.body.isInternal || false,
    };

    ticket.messages.push(message);
    if (!ticket.firstResponseAt && req.user) ticket.firstResponseAt = new Date();
    await ticket.save();

    // If this ticket is linked to a widget chat session, push the reply to the client in real time
    if (!message.isInternal) {
      const sessions = await ChatSession.find({ escalatedTicketId: ticket._id, channel: 'widget' }).lean();
      const io = req.app.get('io');
      const chatNs = io ? io.of('/chat') : null;
      const from = req.user ? { id: req.user._id.toString(), name: req.user.name, email: req.user.email } : null;
      for (const session of sessions) {
        if (chatNs) {
          chatNs.to(`chat:${session._id}`).emit('agent:message', {
            sessionId: session._id.toString(),
            message: message.content,
            from,
          });
        }
        // Keep chat session history in sync with the ticket reply
        await ChatSession.updateOne(
          { _id: session._id },
          { $push: { messages: { role: 'agent', content: message.content, source: 'system' } } }
        );
      }
    }

    res.status(201).json({ status: 'success', data: { message: ticket.messages[ticket.messages.length - 1] } });
  } catch (err) { next(err); }
};

exports.deleteTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) return next(new AppError('Ticket not found', 404));
    res.json({ status: 'success', message: 'Ticket deleted' });
  } catch (err) { next(err); }
};

exports.getStats = async (req, res, next) => {
  try {
    const [byStatus] = await Ticket.aggregate([{
      $group: { _id: '$status', count: { $sum: 1 } },
    }]);

    const stats = await Promise.all([
      Ticket.countDocuments({ status: 'open' }),
      Ticket.countDocuments({ status: 'in_progress' }),
      Ticket.countDocuments({ status: 'resolved' }),
      Ticket.countDocuments({ priority: 'critical', status: { $ne: 'resolved' } }),
    ]);

    res.json({ status: 'success', data: { open: stats[0], inProgress: stats[1], resolved: stats[2], critical: stats[3] } });
  } catch (err) { next(err); }
};
