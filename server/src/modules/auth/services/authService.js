const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const RolePermission = require('../models/RolePermission');
const redisClient = require('../../../shared/config/redis');
const { AppError } = require('../../../shared/middleware/errorHandler');
const { PUBLIC_ROLES, PRIVILEGED_ROLES } = require('../schemas/authSchemas');
const { sendPasswordResetEmail, send2FACodeEmail } = require('../../../shared/services/emailService');
const { addEmailJob } = require('../../../shared/queues/emailQueue');

// Maximum failed login attempts before account lockout.
// Hard capped at 10 to prevent brute force if .env is misconfigured, minimum lockout of 5 minutes.
const MAX_FAILED_ATTEMPTS  = Math.min(parseInt(process.env.MAX_FAILED_ATTEMPTS, 10) || 5, 10);
const LOCKOUT_DURATION_MS  = Math.max(parseInt(process.env.LOCKOUT_DURATION_MS, 10) || 15 * 60 * 1000, 5 * 60 * 1000);

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const hash2FACode = (code) =>
  crypto.createHash('sha256').update(String(code)).digest('hex');

const generate2FACode = () =>
  String(Math.floor(100000 + Math.random() * 900000));

class AuthService {
  generateAccessToken(userId) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
    );
  }

  generateRawRefreshToken() {
    // 64 random bytes = 128 hex chars of entropy
    return crypto.randomBytes(64).toString('hex');
  }

  // ─── Registration ───────────────────────────────────────────────────────────

  async register(userData) {
    // Public registration normally blocks privileged roles.
    // Exception: allow bootstrapping the *first* super_admin account, or explicit dev override.
    if (PRIVILEGED_ROLES.includes(userData.role)) {
      const allowPrivilegedSelfRegister = process.env.ALLOW_PRIVILEGED_SELF_REGISTER === 'true';
      const isBootstrapSuperAdmin = userData.role === 'super_admin' && !(await User.exists({}));

      if (!allowPrivilegedSelfRegister && !isBootstrapSuperAdmin) {
        throw new AppError(
          'You cannot self-register with a privileged role. Ask an existing admin to create this account.',
          403
        );
      }
    }

    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const permissions = await this.getDefaultPermissions(userData.role);
    const user = await User.create({ ...userData, permissions });

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  // Admin-only: create any account role; caller role is checked in the controller
  async createUserAdmin(userData, callerRole) {
    const roles = Array.isArray(userData.roles) ? userData.roles : (userData.role ? [userData.role] : []);
    if (roles.includes('super_admin') && callerRole !== 'super_admin') {
      throw new AppError('Only super_admin can create super_admin accounts', 403);
    }

    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const permissions = userData.permissions || await this.getMergedPermissionsForRoles(roles);
    const user = await User.create({ ...userData, roles, permissions });

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      roles: user.roles,
    };
  }

  async getMergedPermissionsForRoles(roles) {
    if (!roles?.length) return ['dashboard.read'];
    const all = new Set();
    for (const r of roles) {
      const perms = await this.getDefaultPermissions(r);
      if (perms.includes('*')) return ['*'];
      perms.forEach((p) => all.add(p));
    }
    return Array.from(all);
  }

  async updateProfile(userId, updates) {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 404);
    }

    if (updates.name) {
      user.name = updates.name.trim();
    }

    if (updates.email) {
      const normalizedEmail = updates.email.trim().toLowerCase();
      const existing = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: userId },
      });
      if (existing) {
        throw new AppError('Email already registered', 409);
      }
      user.email = normalizedEmail;
    }

    await user.save();

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
    };
  }

  async updatePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 404);
    }

    const isCurrentValid = await user.comparePassword(currentPassword);
    if (!isCurrentValid) {
      throw new AppError('Current password is incorrect', 401);
    }

    user.password = newPassword;
    await user.save();

    return { message: 'Password updated successfully' };
  }

  // ─── Login ──────────────────────────────────────────────────────────────────

  async login(email, password, ipAddress, userAgent, rememberMe = false) {
    // Fetch user including lockout/attempt fields (not selected by default)
    const user = await User.findOne({ email })
      .select('+password +failedLoginAttempts +lockoutUntil');

    // Use a constant-time check pattern to prevent user enumeration via timing
    if (!user || !user.isActive) {
      // Still run a dummy bcrypt to prevent timing attacks when user doesn't exist
      await bcryptDummy();
      throw new AppError('Invalid credentials', 401);
    }

    // Check lockout BEFORE expensive bcrypt to save CPU
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const minutes = Math.ceil((user.lockoutUntil - Date.now()) / 60000);
      throw new AppError(`Account locked. Try again in ${minutes} minute(s).`, 423);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await this._handleFailedLogin(user);
      throw new AppError('Invalid credentials', 401);
    }

    // Reset lockout state on successful login
    if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
      user.failedLoginAttempts = 0;
      user.lockoutUntil = undefined;
      await user.save({ validateBeforeSave: false });
    }

    if (user.twoFactorEnabled) {
      await this.issue2FACode(user);
      const tempToken = jwt.sign(
        { id: user._id, temp: true, rememberMe: Boolean(rememberMe) },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '5m' }
      );
      return { requiresTwoFactor: true, tempToken, message: '2FA code sent' };
    }

    return this.createSession(user, ipAddress, userAgent, rememberMe);
  }

  async _handleFailedLogin(user) {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    user.failedLoginAttempts = attempts;

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      user.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    }

    await user.save({ validateBeforeSave: false });
  }

  async issue2FACode(user) {
    const code = generate2FACode();
    user.twoFactorCodeHash = hash2FACode(code);
    user.twoFactorCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    user.twoFactorLastSentAt = new Date();
    await user.save({ validateBeforeSave: false });

    try {
      await addEmailJob('2fa', { to: user.email, name: user.name, code });
    } catch (e) {
      const sent = await send2FACodeEmail({ to: user.email, name: user.name, code });
      if (!sent?.sent && process.env.NODE_ENV !== 'production') {
        console.log(`[DEBUG] 2FA code for ${user.email}: ${code}`);
      }
    }
  }

  async verifyLogin2FA(tempToken, token, ipAddress, userAgent) {
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_ACCESS_SECRET);
    } catch {
      throw new AppError('2FA session expired. Please login again.', 401);
    }

    if (!decoded?.temp || !decoded?.id) {
      throw new AppError('Invalid 2FA session. Please login again.', 401);
    }

    const user = await User.findById(decoded.id)
      .select('+twoFactorCodeHash +twoFactorCodeExpires +password');

    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }
    if (!user.twoFactorEnabled) {
      throw new AppError('2FA is not enabled for this account', 400);
    }
    if (!user.twoFactorCodeHash || !user.twoFactorCodeExpires || user.twoFactorCodeExpires < new Date()) {
      throw new AppError('2FA code expired. Please login again.', 401);
    }

    const isValid = hash2FACode(token) === user.twoFactorCodeHash;
    if (!isValid) {
      throw new AppError('Invalid 2FA code', 401);
    }

    user.twoFactorCodeHash = undefined;
    user.twoFactorCodeExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return this.createSession(user, ipAddress, userAgent, Boolean(decoded.rememberMe));
  }

  async setup2FA(userId) {
    const user = await User.findById(userId).select('+twoFactorCodeHash +twoFactorCodeExpires');
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 404);
    }

    await this.issue2FACode(user);
    return { message: 'Verification code sent to your registered email.' };
  }

  async enable2FA(userId, token) {
    const user = await User.findById(userId).select('+twoFactorCodeHash +twoFactorCodeExpires');
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 404);
    }

    if (!user.twoFactorCodeHash || !user.twoFactorCodeExpires || user.twoFactorCodeExpires < new Date()) {
      throw new AppError('2FA setup code expired. Request a new one.', 400);
    }

    const isValid = hash2FACode(token) === user.twoFactorCodeHash;
    if (!isValid) {
      throw new AppError('Invalid 2FA verification code', 400);
    }

    user.twoFactorEnabled = true;
    user.twoFactorCodeHash = undefined;
    user.twoFactorCodeExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return { message: '2FA enabled successfully.' };
  }

  async disable2FA(userId, password) {
    const user = await User.findById(userId).select('+password +twoFactorCodeHash +twoFactorCodeExpires');
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 404);
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      throw new AppError('Invalid password', 401);
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorCodeHash = undefined;
    user.twoFactorCodeExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return { message: '2FA disabled successfully.' };
  }

  // ─── Session creation ────────────────────────────────────────────────────────

  async createSession(user, ipAddress, userAgent, rememberMe = false) {
    const accessToken = this.generateAccessToken(user._id);
    const rawRefreshToken = this.generateRawRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const family = crypto.randomBytes(16).toString('hex');
    const refreshTokenTtlMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + refreshTokenTtlMs);

    await Session.create({
      user: user._id,
      tokenHash,
      family,
      ipAddress,
      userAgent,
      rememberMe: Boolean(rememberMe),
      expiresAt,
    });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    await redisClient.setex(
      `session:${user._id}`,
      900,
      JSON.stringify({ lastActivity: Date.now() })
    );

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      refreshTokenTtlMs,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: user.roles || (user.role ? [user.role] : []),
        permissions: user.permissions,
      },
    };
  }

  // ─── Token refresh with rotation + reuse detection ──────────────────────────

  async refreshAccessToken(rawRefreshToken, ipAddress, userAgent) {
    const incomingHash = hashToken(rawRefreshToken);

    // Find the session by hash (includes inactive/consumed ones for reuse detection)
    const session = await Session.findOne({ tokenHash: incomingHash }).populate('user');

    if (!session) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Reuse detection: if this token was already consumed (rotated), revoke the entire family
    if (session.isConsumed || !session.isActive) {
      await Session.updateMany(
        { family: session.family },
        { isActive: false, isConsumed: true }
      );
      throw new AppError('Refresh token already used. All sessions have been revoked.', 401);
    }

    if (session.expiresAt < new Date()) {
      session.isActive = false;
      await session.save();
      throw new AppError('Refresh token expired', 401);
    }

    if (!session.user || !session.user.isActive) {
      throw new AppError('User no longer exists or is inactive', 401);
    }

    // Mark the current session as consumed (rotated) — no longer usable
    session.isConsumed = true;
    session.isActive = false;
    await session.save();

    // Issue new access + refresh tokens, maintaining the same family
    const newAccessToken = this.generateAccessToken(session.user._id);
    const newRawRefreshToken = this.generateRawRefreshToken();
    const newTokenHash = hashToken(newRawRefreshToken);
    const refreshTokenTtlMs = session.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + refreshTokenTtlMs);

    await Session.create({
      user: session.user._id,
      tokenHash: newTokenHash,
      family: session.family,
      ipAddress: ipAddress || session.ipAddress,
      userAgent: userAgent || session.userAgent,
      rememberMe: Boolean(session.rememberMe),
      expiresAt,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      refreshTokenTtlMs,
      user: {
        id: session.user._id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        roles: session.user.roles || (session.user.role ? [session.user.role] : []),
        permissions: session.user.permissions,
      },
    };
  }

  // ─── Logout ─────────────────────────────────────────────────────────────────

  async logout(userId, accessToken, rawRefreshToken) {
    // Blacklist the current access token for its remaining TTL
    if (accessToken) {
      await redisClient.setex(`blacklist:${accessToken}`, 900, '1');
    }

    // Invalidate only the specific refresh session, not all sessions
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await Session.findOneAndUpdate(
        { tokenHash, user: userId },
        { isActive: false }
      );
    }

    await redisClient.del(`session:${userId}`);
  }

  // ─── Password reset ──────────────────────────────────────────────────────────

  async sendPasswordResetForUser(userId) {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 404);
    }
    return this.forgotPassword(user.email);
  }

  async forgotPassword(email) {
    const user = await User.findOne({ email });

    // Always return a success message to prevent email enumeration
    if (!user || !user.isActive) {
      return { message: 'If that email is registered, a reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    const base = process.env.CLIENT_URL || 'http://localhost:3000';
    const resetUrl = `${base}/auth/reset-password/${resetToken}`;
    try {
      await addEmailJob('password_reset', { to: user.email, name: user.name, resetUrl });
    } catch (e) {
      await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
    }

    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  async resetPassword(token, newPassword) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      throw new AppError('Reset token is invalid or has expired', 400);
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockoutUntil = undefined;
    await user.save();

    // Revoke all existing sessions for this user
    await Session.updateMany({ user: user._id }, { isActive: false });
    await redisClient.del(`session:${user._id}`);

    return { message: 'Password has been reset successfully.' };
  }

  // ─── Permissions ─────────────────────────────────────────────────────────────

  async getDefaultPermissions(role) {
    const roleOverride = await RolePermission.findOne({ role }).select('permissions');
    if (roleOverride?.permissions?.length) {
      return roleOverride.permissions;
    }

    const permissionMatrix = {
      super_admin: ['*'],
      admin: [
        'users.read', 'users.create', 'users.update', 'users.delete',
        'reports.read', 'dashboard.read', 'settings.read', 'settings.update',
        'analytics.read',
        'cms.read', 'cms.create', 'cms.update', 'cms.delete',
        'media.read', 'media.upload',
        'crm.read', 'crm.write', 'leads.read', 'leads.create', 'leads.update', 'leads.delete',
        'finance.read', 'finance.write', 'invoices.read', 'invoices.create', 'invoices.update', 'invoices.delete',
        'expenses.read', 'expenses.create', 'expenses.update', 'expenses.delete',
        'tickets.read', 'tickets.create', 'tickets.update',
        'chatbot.manage', 'chatbot.chat',
      ],
      hr: ['users.read', 'users.create', 'users.update', 'reports.read', 'dashboard.read'],
      sales: [
        'leads.read', 'leads.create', 'leads.update', 'leads.delete',
        'crm.read', 'crm.write',
        'forms.read', 'forms.update',
        'dashboard.read',
      ],
      content_creator: ['cms.read', 'cms.create', 'cms.update', 'media.read', 'media.upload', 'dashboard.read'],
      seo_manager: ['cms.read', 'cms.update', 'seo.read', 'seo.write', 'seo.publish', 'analytics.read', 'dashboard.read'],
      support_executive: [
        'tickets.read', 'tickets.create', 'tickets.update',
        'customers.read', 'dashboard.read',
        'chatbot.manage', 'chatbot.chat',
      ],
      finance_manager: [
        'finance.read', 'finance.write', 'reports.read',
        'invoices.read', 'invoices.create', 'invoices.update', 'invoices.delete',
        'expenses.read', 'expenses.create', 'expenses.update', 'expenses.delete',
        'dashboard.read',
      ],
      customer: ['dashboard.read'],
    };

    return permissionMatrix[role] || ['dashboard.read'];
  }

  /** In-code default permissions for a role (no DB lookup). Used to merge into saved role permissions so new defaults (e.g. chatbot for support_executive) appear. */
  getDefaultPermissionsFromMatrix(role) {
    const permissionMatrix = {
      super_admin: ['*'],
      admin: [
        'users.read', 'users.create', 'users.update', 'users.delete',
        'reports.read', 'dashboard.read', 'settings.read', 'settings.update',
        'analytics.read',
        'cms.read', 'cms.create', 'cms.update', 'cms.delete',
        'media.read', 'media.upload',
        'crm.read', 'crm.write', 'leads.read', 'leads.create', 'leads.update', 'leads.delete',
        'finance.read', 'finance.write', 'invoices.read', 'invoices.create', 'invoices.update', 'invoices.delete',
        'expenses.read', 'expenses.create', 'expenses.update', 'expenses.delete',
        'tickets.read', 'tickets.create', 'tickets.update',
        'chatbot.manage', 'chatbot.chat',
      ],
      hr: ['users.read', 'users.create', 'users.update', 'reports.read', 'dashboard.read'],
      sales: [
        'leads.read', 'leads.create', 'leads.update', 'leads.delete',
        'crm.read', 'crm.write',
        'forms.read', 'forms.update',
        'dashboard.read',
      ],
      content_creator: ['cms.read', 'cms.create', 'cms.update', 'media.read', 'media.upload', 'dashboard.read'],
      seo_manager: ['cms.read', 'cms.update', 'seo.read', 'seo.write', 'seo.publish', 'analytics.read', 'dashboard.read'],
      support_executive: [
        'tickets.read', 'tickets.create', 'tickets.update',
        'customers.read', 'dashboard.read',
        'chatbot.manage', 'chatbot.chat',
      ],
      finance_manager: [
        'finance.read', 'finance.write', 'reports.read',
        'invoices.read', 'invoices.create', 'invoices.update', 'invoices.delete',
        'expenses.read', 'expenses.create', 'expenses.update', 'expenses.delete',
        'dashboard.read',
      ],
      customer: ['dashboard.read'],
    };
    return permissionMatrix[role] || ['dashboard.read'];
  }

  /**
   * Verify Google ID token and find or create user (role: customer), then create session.
   * @param {string} idToken - Google ID token from client
   * @param {string} ipAddress
   * @param {string} userAgent
   * @returns {Promise<{ accessToken, refreshToken, refreshTokenTtlMs, user }>}
   */
  async googleLoginOrRegister(idToken, ipAddress, userAgent) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new AppError('Google sign-in is not configured', 503);
    }

    let payload;
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error_description || data.error || 'Invalid token');
      }
      if (data.aud !== clientId) {
        throw new Error('Token audience mismatch');
      }
      payload = data;
    } catch (e) {
      throw new AppError(e.message || 'Invalid Google token', 401);
    }

    const email = (payload.email || '').toLowerCase().trim();
    if (!email) throw new AppError('Google account has no email', 400);

    const name = payload.name || payload.given_name || email.split('@')[0] || 'User';
    let user = await User.findOne({ email });

    if (!user) {
      const permissions = await this.getDefaultPermissions('customer');
      user = await User.create({
        name: name.trim(),
        email,
        password: crypto.randomBytes(24).toString('hex'),
        role: 'customer',
        roles: ['customer'],
        permissions,
        isActive: true,
      });
    } else if (!user.isActive) {
      throw new AppError('Account is disabled', 403);
    }

    return this.createSession(user, ipAddress, userAgent, true);
  }
}

// Dummy bcrypt to maintain constant-time behavior when a user is not found
async function bcryptDummy() {
  const bcrypt = require('bcryptjs');
  await bcrypt.compare('dummy', '$2a$12$invalid.hash.that.prevents.short.circuit.padding.here');
}

module.exports = new AuthService();
