const Invoice = require('../models/Invoice');
const { AppError } = require('../../../shared/middleware/errorHandler');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const SVGtoPDF = require('svg-to-pdfkit');
const { invalidateDashboardCache } = require('../../../shared/services/dashboardCache');

/** Client: list invoices for the authenticated user (by clientEmail). */
exports.listMyInvoices = async (req, res, next) => {
  try {
    const email = (req.user && req.user.email) ? req.user.email.toLowerCase() : null;
    if (!email) return next(new AppError('Not authenticated', 401));

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const filter = { clientEmail: email };
    if (req.query.status) filter.status = req.query.status;

    const [invoices, total] = await Promise.all([
      Invoice.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit),
      Invoice.countDocuments(filter),
    ]);

    res.json({ status: 'success', data: { invoices, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (err) { next(err); }
};

/** Client: get one invoice (must belong to user). */
exports.getMyInvoice = async (req, res, next) => {
  try {
    const email = (req.user && req.user.email) ? req.user.email.toLowerCase() : null;
    if (!email) return next(new AppError('Not authenticated', 401));

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return next(new AppError('Invoice not found', 404));
    if (invoice.clientEmail.toLowerCase() !== email) return next(new AppError('Invoice not found', 404));

    res.json({ status: 'success', data: { invoice } });
  } catch (err) { next(err); }
};

/** Client: download invoice PDF (must belong to user). */
exports.downloadMyInvoicePdf = async (req, res, next) => {
  try {
    const email = (req.user && req.user.email) ? req.user.email.toLowerCase() : null;
    if (!email) return next(new AppError('Not authenticated', 401));

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return next(new AppError('Invoice not found', 404));
    if (invoice.clientEmail.toLowerCase() !== email) return next(new AppError('Invoice not found', 404));

    const fakeReq = Object.assign({}, req, { params: { id: req.params.id } });
    return exports.downloadPdf(fakeReq, res, next);
  } catch (err) { next(err); }
};

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
    invalidateDashboardCache().catch(() => {});
  } catch (err) { next(err); }
};

exports.updateInvoice = async (req, res, next) => {
  try {
    const updates = req.validated || req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return next(new AppError('Invoice not found', 404));

    Object.entries(updates).forEach(([key, value]) => {
      invoice[key] = value;
    });

    await invoice.save();
    res.json({ status: 'success', data: { invoice } });
    invalidateDashboardCache().catch(() => {});
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
    invalidateDashboardCache().catch(() => {});
  } catch (err) { next(err); }
};

exports.deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return next(new AppError('Invoice not found', 404));
    res.json({ status: 'success', message: 'Invoice deleted' });
    invalidateDashboardCache().catch(() => {});
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

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.invoiceNumber || 'invoice'}.pdf"`
    );

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2);
    const footerReservedHeight = 260;
    const currency = invoice.currency || 'USD';
    const formatCurrency = (value) => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(Number(value) || 0);
    const formatDate = (value) => (
      value
        ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
        : 'N/A'
    );

    // Header band
    const headerHeight = 145;
    doc.save();
    doc.rect(0, 0, pageWidth, headerHeight).fill('#0d2b66');
    doc.rect(0, headerHeight - 4, pageWidth, 4).fill('#26a0f2');
    doc.restore();

    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(26).text('INVOICE', margin, 36, { align: 'right' });
    try {
      const logoPath = path.resolve(__dirname, '../../../../../frontend/public/logos/nowazone_white_tagline.svg');
      const logoSvg = fs.readFileSync(logoPath, 'utf8');
      SVGtoPDF(doc, logoSvg, margin, 32, {
        width: 270,
        height: 74,
        preserveAspectRatio: 'xMinYMin meet',
        assumePt: true,
      });
      doc.fillColor('#c5d8ff').font('Helvetica').fontSize(10).text('www.nowazone.com', margin, 112);
    } catch (logoErr) {
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(24).text('NOWAZONE', margin, 38, { width: 210 });
      doc.fillColor('#c5d8ff').font('Helvetica').fontSize(10).text('www.nowazone.com', margin, 84);
    }

    doc.fillColor('#ffffff').font('Helvetica').fontSize(13).text(`#${invoice.invoiceNumber}`, margin, 80, { align: 'right' });
    doc.fillColor('#e9f2ff').font('Helvetica').fontSize(12).text(`Date: ${formatDate(invoice.createdAt)}`, margin, 102, { align: 'right' });

    const statusText = String(invoice.status || 'draft').toUpperCase();
    const pillWidth = 80;
    const pillX = pageWidth - margin - pillWidth;
    const pillY = 125;
    doc.roundedRect(pillX, pillY, pillWidth, 20, 8).fill('#dce7fb');
    doc.fillColor('#2d3f5f').font('Helvetica-Bold').fontSize(10).text(statusText, pillX, pillY + 6, { width: pillWidth, align: 'center' });

    // Bill To card
    let y = headerHeight + 24;
    doc.roundedRect(margin, y, 250, 80, 8).fill('#f1f5fb');
    doc.fillColor('#1d3557').font('Helvetica-Bold').fontSize(18).text('Bill To', margin + 16, y + 14);
    doc.strokeColor('#2ca3f5').lineWidth(3).moveTo(margin + 12, y + 12).lineTo(margin + 12, y + 68).stroke();

    doc.fillColor('#1f2a44').font('Helvetica-Bold').fontSize(14).text(invoice.clientName || '-', margin + 16, y + 40, { width: 220 });
    doc.fillColor('#354767').font('Helvetica').fontSize(12).text(invoice.clientEmail || '-', margin + 16, y + 60, { width: 220 });

    // Items table
    y += 110;
    const descW = contentWidth * 0.46;
    const qtyW = contentWidth * 0.10;
    const unitW = contentWidth * 0.16;
    const taxW = contentWidth * 0.10;
    const totalW = contentWidth * 0.18;
    const colX = [
      margin,
      margin + descW,
      margin + descW + qtyW,
      margin + descW + qtyW + unitW,
      margin + descW + qtyW + unitW + taxW,
    ];

    const drawTableHeader = (top) => {
      doc.rect(margin, top, contentWidth, 28).fill('#eef3fb');
      doc.strokeColor('#d4dceb').lineWidth(1).moveTo(margin, top + 28).lineTo(margin + contentWidth, top + 28).stroke();

      doc.fillColor('#1f3559').font('Helvetica-Bold').fontSize(11)
        .text('Description', colX[0] + 8, top + 9, { width: descW - 10 })
        .text('Qty', colX[1], top + 9, { width: qtyW - 8, align: 'center' })
        .text('Unit Price', colX[2], top + 9, { width: unitW - 8, align: 'right' })
        .text('Tax', colX[3], top + 9, { width: taxW - 8, align: 'right' })
        .text('Total', colX[4], top + 9, { width: totalW - 8, align: 'right' });
    };

    const ensureSpace = (needed) => {
      if (y + needed <= pageHeight - footerReservedHeight) return;
      doc.addPage();
      y = 60;
      drawTableHeader(y);
      y += 28;
    };

    drawTableHeader(y);
    y += 28;

    (invoice.items || []).forEach((item) => {
      const lineTotal = (item.quantity * item.unitPrice) + ((item.quantity * item.unitPrice) * (item.taxRate || 0)) / 100;
      const descHeight = doc.heightOfString(item.description || '-', { width: descW - 16 });
      const rowHeight = Math.max(30, descHeight + 12);
      ensureSpace(rowHeight + 8);

      doc.fillColor('#ffffff').rect(margin, y, contentWidth, rowHeight).fill();
      doc.strokeColor('#e4e9f3').lineWidth(1).moveTo(margin, y + rowHeight).lineTo(margin + contentWidth, y + rowHeight).stroke();

      doc.fillColor('#1f2a44').font('Helvetica').fontSize(11)
        .text(item.description || '-', colX[0] + 8, y + 8, { width: descW - 16 })
        .text(String(item.quantity || 0), colX[1], y + 8, { width: qtyW - 8, align: 'center' })
        .text(formatCurrency(item.unitPrice || 0), colX[2], y + 8, { width: unitW - 8, align: 'right' })
        .text(`${Number(item.taxRate || 0).toFixed(1)}%`, colX[3], y + 8, { width: taxW - 8, align: 'right' })
        .text(formatCurrency(lineTotal), colX[4], y + 8, { width: totalW - 8, align: 'right' });

      y += rowHeight;
    });

    y += 18;

    // Totals box
    const totalsBoxW = 200;
    const totalsX = margin + contentWidth - totalsBoxW;
    doc.roundedRect(totalsX, y, totalsBoxW, 106, 6).fill('#eef3fb');

    doc.fillColor('#2f3f5c').font('Helvetica-Bold').fontSize(12)
      .text('Subtotal:', totalsX + 12, y + 14)
      .text(formatCurrency(invoice.subtotal || 0), totalsX + 12, y + 14, { width: totalsBoxW - 24, align: 'right' });
    doc.strokeColor('#d2dced').lineWidth(1).moveTo(totalsX, y + 40).lineTo(totalsX + totalsBoxW, y + 40).stroke();

    doc.fillColor('#2f3f5c').font('Helvetica').fontSize(12)
      .text('Tax', totalsX + 12, y + 48)
      .text(formatCurrency(invoice.taxTotal || 0), totalsX + 12, y + 48, { width: totalsBoxW - 24, align: 'right' });

    doc.rect(totalsX, y + 72, totalsBoxW, 34).fill('#113a7a');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(13)
      .text('TOTAL:', totalsX + 12, y + 83)
      .text(formatCurrency(invoice.total || 0), totalsX + 12, y + 83, { width: totalsBoxW - 24, align: 'right' });

    y += 130;

    // Payment + Notes row
    const half = (contentWidth - 18) / 2;
    doc.strokeColor('#d8deea').lineWidth(1).rect(margin, y, half, 84).stroke();
    doc.strokeColor('#d8deea').lineWidth(1).rect(margin + half + 18, y, half, 84).stroke();

    doc.fillColor('#1f3559').font('Helvetica-Bold').fontSize(12).text('Payment Method', margin + 12, y + 12);
    doc.fillColor('#2f3f5c').font('Helvetica').fontSize(11).text('Bank Transfer / Stripe / PayPal', margin + 12, y + 36, { width: half - 24 });

    doc.fillColor('#1f3559').font('Helvetica-Bold').fontSize(12).text('Notes', margin + half + 30, y + 12);
    doc.fillColor('#2f3f5c').font('Helvetica').fontSize(11).text(
      invoice.notes || 'Thank you for your business.',
      margin + half + 30,
      y + 36,
      { width: half - 24 }
    );

    // Footer (keep inside printable area to avoid implicit page break)
    const footerY = pageHeight - margin - 16;
    doc.fillColor('#5a6b86').font('Helvetica-Bold').fontSize(11).text('www.nowazone.com', margin, footerY, {
      width: contentWidth,
      align: 'center',
      lineBreak: false,
    });

    doc.end();
  } catch (err) {
    next(err);
  }
};
