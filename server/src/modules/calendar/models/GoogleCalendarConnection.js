const mongoose = require('mongoose');

const googleCalendarConnectionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  googleEmail: String,
  accessToken: { type: String, select: false },
  refreshToken: { type: String, select: false },
  tokenType: String,
  scope: String,
  expiryDate: Date,
}, { timestamps: true });

module.exports = mongoose.model('GoogleCalendarConnection', googleCalendarConnectionSchema);
