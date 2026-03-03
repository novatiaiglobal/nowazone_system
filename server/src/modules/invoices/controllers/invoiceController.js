const Invoice = require('../models/Invoice');
const { AppError } = require('../../../shared/middleware/errorHandler');
const PDFDocument = require('pdfkit');

exports.listInvoices = async (req, res, next) => {
  try {
    const page  = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) filter.$or = [
      { clientName:   { $regex: req.query.search, $options: 'i' } },
      { clientEmail:  { $regex: req.query.search, $options: 'i' } },
      { invoiceNumber:{ $regex: req.query.search, $options: 'i' } },
    ];

    const [invoices, total] = await Promise.all([
      Invoice.find(filter).populate('createdBy', 'name').sort('-createdAt').skip((page - 1) * limit).limit(limit),
      Invoice.countDocuments(filter),
    ]);

    res.json({ status: 'success', data: { invoices, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (err) { next(err); }
};

exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('createdBy', 'name email');
    if (!invoice) return next(new AppError('Invoice not found', 404));
    res.json({ status: 'success', data: { invoice } });
  } catch (err) { next(err); }
};

exports.createInvoice = async (req, res, next) => {
  try {
    const payload = req.validated || req.body;
    const base = {
      ...payload,
      createdBy: req.user._id,
    };

    const invoice = await Invoice.create(base);
    res.status(201).json({ status: 'success', data: { invoice } });
  } catch (err) { next(err); }
};

exports.updateInvoice = async (req, res, next) => {
  try {
    const updates = req.validated || req.body;
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!invoice) return next(new AppError('Invoice not found', 404));
    res.json({ status: 'success', data: { invoice } });
  } catch (err) { next(err); }
};

exports.markPaid = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status: 'paid', paidAt: new Date() },
      { new: true }
    );
    if (!invoice) return next(new AppError('Invoice not found', 404));
    res.json({ status: 'success', data: { invoice } });
  } catch (err) { next(err); }
};

exports.deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return next(new AppError('Invoice not found', 404));
    res.json({ status: 'success', message: 'Invoice deleted' });
  } catch (err) { next(err); }
};

exports.getStats = async (req, res, next) => {
  try {
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const [stats] = await Invoice.aggregate([
      {
        $facet: {
          total:   [{ $count: 'count' }],
          paid:    [{ $match: { status: 'paid' } }, { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$total' } } }],
          pending: [{ $match: { status: { $in: ['draft', 'sent'] } } }, { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$total' } } }],
          overdue: [{ $match: { status: 'overdue' } }, { $count: 'count' }],
          monthlyRevenue: [{ $match: { status: 'paid', paidAt: { $gte: startOfMonth } } }, { $group: { _id: null, amount: { $sum: '$total' } } }],
        },
      },
    ]);

    res.json({
      status: 'success',
      data: {
        total:          stats.total[0]?.count || 0,
        paid:           { count: stats.paid[0]?.count || 0, amount: stats.paid[0]?.amount || 0 },
        pending:        { count: stats.pending[0]?.count || 0, amount: stats.pending[0]?.amount || 0 },
        overdue:        stats.overdue[0]?.count || 0,
        monthlyRevenue: stats.monthlyRevenue[0]?.amount || 0,
      },
    });
  } catch (err) { next(err); }
};

const addInterval = (date, interval) => {
  const d = new Date(date);
  if (interval === 'weekly') d.setDate(d.getDate() + 7);
  if (interval === 'monthly') d.setMonth(d.getMonth() + 1);
  if (interval === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return d;
};

exports.processRecurring = async (req, res, next) => {
  try {
    const now = new Date();
    const filter = {
      isRecurring: true,
      nextIssueDate: { $lte: now },
    };

    const templates = await Invoice.find(filter);
    let createdCount = 0;

    for (const template of templates) {
      if (!template.recurrenceInterval || !template.nextIssueDate) continue;
      if (typeof template.recurrenceRemaining === 'number' && template.recurrenceRemaining <= 0) {
        // No more occurrences to create
        template.isRecurring = false;
        template.recurrenceRemaining = 0;
        await template.save();
        // eslint-disable-next-line no-continue
        continue;
      }

      const issueDate = template.nextIssueDate;
      const instance = new Invoice({
        clientName: template.clientName,
        clientEmail: template.clientEmail,
        clientAddress: template.clientAddress,
        clientPhone: template.clientPhone,
        items: template.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
        })),
        currency: template.currency,
        status: 'sent',
        dueDate: template.dueDate || issueDate,
        notes: template.notes,
        createdBy: template.createdBy,
        isRecurring: false,
        parentInvoiceId: template._id,
      });
      await instance.save();
      createdCount += 1;

      template.lastIssuedAt = issueDate;
      template.nextIssueDate = addInterval(issueDate, template.recurrenceInterval);
      if (typeof template.recurrenceRemaining === 'number') {
        template.recurrenceRemaining = Math.max(0, template.recurrenceRemaining - 1);
      }
      await template.save();
    }

    res.json({
      status: 'success',
      data: { processedTemplates: templates.length, createdInstances: createdCount },
    });
  } catch (err) {
    next(err);
  }
};

exports.downloadPdf = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('createdBy', 'name email');
    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.invoiceNumber || 'invoice'}.pdf"`
    );

    doc.pipe(res);

    doc
      .fontSize(20)
      .text('Invoice', { align: 'right' })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .text(`Invoice #: ${invoice.invoiceNumber}`, { align: 'right' })
      .text(`Status: ${invoice.status}`, { align: 'right' })
      .text(
        `Date: ${new Date(invoice.createdAt).toLocaleDateString()}`,
        { align: 'right' }
      )
      .moveDown(1);

    doc
      .fontSize(12)
      .text('Bill To:', { underline: true })
      .moveDown(0.3);
    doc
      .fontSize(10)
      .text(invoice.clientName)
      .text(invoice.clientEmail);
    if (invoice.clientAddress) {
      doc.text(invoice.clientAddress);
    }
    if (invoice.clientPhone) {
      doc.text(invoice.clientPhone);
    }

    doc.moveDown(1);
    const tableTop = doc.y;

    const column = (x, text, opts = {}) => {
      doc.text(text, x, doc.y, opts);
    };

    doc.fontSize(10).text('Description', 50, tableTop);
    column(260, 'Qty', { width: 40, align: 'right' });
    column(310, 'Unit', { width: 70, align: 'right' });
    column(390, 'Tax %', { width: 50, align: 'right' });
    column(450, 'Total', { width: 90, align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(540, doc.y).stroke();

    invoice.items.forEach((item) => {
      const y = doc.y + 4;
      doc.fontSize(10).text(item.description, 50, y, { width: 190 });
      column(260, String(item.quantity), { width: 40, align: 'right' });
      column(310, item.unitPrice.toFixed(2), { width: 70, align: 'right' });
      column(390, (item.taxRate || 0).toFixed(1), { width: 50, align: 'right' });
      const subtotal = item.quantity * item.unitPrice;
      const total = subtotal + (subtotal * (item.taxRate || 0)) / 100;
      column(450, total.toFixed(2), { width: 90, align: 'right' });
      doc.moveDown(1);
    });

    doc.moveDown(0.5);
    doc.moveTo(300, doc.y).lineTo(540, doc.y).stroke();

    const currency = invoice.currency || 'USD';
    const format = (value) => `${currency} ${value.toFixed(2)}`;

    doc
      .fontSize(10)
      .text(`Subtotal: ${format(invoice.subtotal || 0)}`, 300, doc.y + 4, { align: 'right' })
      .moveDown(0.3);
    doc
      .text(`Tax: ${format(invoice.taxTotal || 0)}`, { align: 'right' })
      .moveDown(0.3);
    doc
      .fontSize(12)
      .text(`Total: ${format(invoice.total || 0)}`, { align: 'right' })
      .moveDown(1);

    if (invoice.notes) {
      doc.moveDown(1);
      doc.fontSize(10).text('Notes:', { underline: true }).moveDown(0.3);
      doc.text(invoice.notes);
    }

    doc.end();
  } catch (err) {
    next(err);
  }
};
