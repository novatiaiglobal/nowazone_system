const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    default: '',
  },
  startAt: {
    type: Date,
    required: true,
  },
  endAt: {
    type: Date,
    required: true,
  },
  isAllDay: {
    type: Boolean,
    default: false,
  },
  location: {
    type: String,
    default: '',
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  visibility: {
    type: String,
    enum: ['team', 'private'],
    default: 'team',
  },
  color: {
    type: String,
    default: '#22d3ee',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  source: {
    type: String,
    enum: ['manual', 'google'],
    default: 'manual',
  },
  googleEventId: String,
  meetingUrl: {
    type: String,
    default: '',
  },
}, { timestamps: true });

calendarEventSchema.index({ startAt: 1, endAt: 1 });
calendarEventSchema.index({ participants: 1, visibility: 1 });
calendarEventSchema.index({ createdBy: 1 });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
