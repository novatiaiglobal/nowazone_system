const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator(v) {
        if (!v || v.trim() === '') return true; // optional at DB level for backwards compatibility
        const digits = v.replace(/\D/g, '');
        return digits.length >= 7 && digits.length <= 15;
      },
      message: 'Phone must contain 7–15 digits',
    },
  },
  jobTitle: { type: String, trim: true },
  department: { type: String, trim: true },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false,
  },
  role: {
    type: String,
    enum: [
      'super_admin',
      'admin',
      'hr',
      'sales',
      'content_creator',
      'seo_manager',
      'support_executive',
      'finance_manager',
      'customer',
    ],
  },
  roles: {
    type: [String],
    enum: [
      'super_admin',
      'admin',
      'hr',
      'sales',
      'content_creator',
      'seo_manager',
      'support_executive',
      'finance_manager',
      'customer',
    ],
    default: function () {
      return this.role ? [this.role] : [];
    },
  },
  permissions: [{
    type: String,
  }],
  profileImage: {
    url: String,
    publicId: String,
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: {
    type: String,
    select: false,
  },
  twoFactorCodeHash: {
    type: String,
    select: false,
  },
  twoFactorCodeExpires: {
    type: Date,
    select: false,
  },
  twoFactorLastSentAt: {
    type: Date,
    select: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: Date,
  // Brute-force lockout
  failedLoginAttempts: {
    type: Number,
    default: 0,
    select: false,
  },
  lockoutUntil: {
    type: Date,
    select: false,
  },
  tokenInvalidBefore: {
    type: Date,
  },
  // Password reset
  passwordResetToken: {
    type: String,
    select: false,
  },
  passwordResetExpires: {
    type: Date,
    select: false,
  },
}, {
  timestamps: true,
});

userSchema.pre('init', function () {
  if ((!this.roles || this.roles.length === 0) && this.role) {
    this.roles = [this.role];
  }
});

const ROLE_PRIORITY = ['super_admin', 'admin', 'hr', 'sales', 'content_creator', 'seo_manager', 'support_executive', 'finance_manager', 'customer'];

userSchema.pre('save', function () {
  if (this.roles?.length) {
    // Primary role = highest-priority role in the array (admin > hr > ...)
    this.role = ROLE_PRIORITY.find((r) => this.roles.includes(r)) || this.roles[0];
  } else if (this.role && (!this.roles || this.roles.length === 0)) {
    this.roles = [this.role];
  }
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
  if (rounds < 10) throw new Error('BCRYPT_ROUNDS must be at least 10');
  this.password = await bcrypt.hash(this.password, rounds);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.hasPermission = function (permission) {
  const r = this.roles?.length ? this.roles : (this.role ? [this.role] : []);
  if (r.includes('super_admin')) return true;
  return this.permissions?.includes(permission) || this.permissions?.includes('*');
};

module.exports = mongoose.model('User', userSchema);
