const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0 },
  total: { type: Number },
}, { _id: false });

invoiceItemSchema.pre('save', function () {
  const subtotal = this.quantity * this.unitPrice;
  this.total = subtotal + (subtotal * this.taxRate) / 100;
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  clientName: { type: String, required: true, trim: true },
  clientEmail: { type: String, required: true, lowercase: true },
  clientAddress: { type: String },
  clientPhone: { type: String },
  items: [invoiceItemSchema],
  subtotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], default: 'draft' },
  dueDate: { type: Date },
  paidAt: { type: Date },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isRecurring: { type: Boolean, default: false },
  recurrenceInterval: {
    type: String,
    enum: ['weekly', 'monthly', 'yearly'],
    default: null,
  },
  recurrenceCount: { type: Number, min: 1, max: 120, default: null },
  recurrenceRemaining: { type: Number, min: 0, default: null },
  firstIssueDate: { type: Date },
  nextIssueDate: { type: Date },
  lastIssuedAt: { type: Date },
  parentInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
}, { timestamps: true });

// Auto-generate invoice number
invoiceSchema.pre('save', async function () {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceNumber = `INV-${String(count + 1).padStart(6, '0')}`;
  }

  // Recalculate totals
  this.subtotal = this.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  this.taxTotal = this.items.reduce((s, i) => {
    const sub = i.quantity * i.unitPrice;
    return s + (sub * (i.taxRate || 0)) / 100;
  }, 0);
  this.total = this.subtotal + this.taxTotal;

  if (this.isModified('isRecurring') || this.isModified('recurrenceInterval') || this.isModified('firstIssueDate') || this.isNew) {
    if (this.isRecurring && this.recurrenceInterval && this.firstIssueDate) {
      if (this.recurrenceCount && (this.recurrenceRemaining === null || this.recurrenceRemaining === undefined)) {
        this.recurrenceRemaining = this.recurrenceCount;
      }
      if (!this.nextIssueDate) {
        this.nextIssueDate = this.firstIssueDate;
      }
    } else {
      this.isRecurring = false;
      this.recurrenceInterval = null;
      this.recurrenceCount = null;
      this.recurrenceRemaining = null;
      this.firstIssueDate = undefined;
      this.nextIssueDate = undefined;
    }
  }
});

invoiceSchema.index({ status: 1, createdAt: -1 });
invoiceSchema.index({ clientEmail: 1 });
invoiceSchema.index({ isRecurring: 1, nextIssueDate: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
