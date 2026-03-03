const express = require('express');
const authController = require('../controllers/authController');
const { validate }   = require('../../../shared/middleware/validation');
const { protect, restrictTo, csrfProtection } = require('../../../shared/middleware/auth');
const {
  authLimiter,
  refreshLimiter,
  forgotPasswordLimiter,
} = require('../../../shared/middleware/rateLimiter');
const auditLogger = require('../../../shared/middleware/auditLog');
const {
  registerSchema,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  updatePasswordSchema,
  verify2FALoginSchema,
  enable2FASchema,
  disable2FASchema,
} = require('../schemas/authSchemas');
const { userAvatarUpload } = require('../../../shared/config/cloudinary');

const router = express.Router();

// ─── Public routes ─────────────────────────────────────────────────────────────

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  auditLogger('USER_REGISTER'),
  authController.register
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  auditLogger('USER_LOGIN'),
  authController.login
);

// refresh: reads token from httpOnly cookie (web) OR body (API/mobile)
router.post(
  '/refresh',
  refreshLimiter,
  validate(refreshTokenSchema),
  authController.refreshToken
);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

// Token comes in the URL; new password comes in the body
router.post(
  '/reset-password/:token',
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);

router.post(
  '/2fa/verify-login',
  authLimiter,
  validate(verify2FALoginSchema),
  authController.verifyLogin2FA
);

// ─── Protected routes ──────────────────────────────────────────────────────────

router.post(
  '/logout',
  protect,
  csrfProtection,
  auditLogger('USER_LOGOUT'),
  authController.logout
);

router.get('/profile', protect, authController.getProfile);
router.patch(
  '/profile',
  protect,
  csrfProtection,
  validate(updateProfileSchema),
  auditLogger('USER_PROFILE_UPDATE'),
  authController.updateProfile
);
router.patch(
  '/profile/password',
  protect,
  csrfProtection,
  validate(updatePasswordSchema),
  auditLogger('USER_PASSWORD_CHANGE'),
  authController.updatePassword
);
router.patch(
  '/profile/avatar',
  protect,
  csrfProtection,
  userAvatarUpload.single('image'),
  auditLogger('USER_AVATAR_UPDATE'),
  authController.updateAvatar
);

router.post(
  '/2fa/setup',
  protect,
  csrfProtection,
  auditLogger('USER_2FA_SETUP'),
  authController.setup2FA
);

router.post(
  '/2fa/enable',
  protect,
  csrfProtection,
  validate(enable2FASchema),
  auditLogger('USER_2FA_ENABLE'),
  authController.enable2FA
);

router.post(
  '/2fa/disable',
  protect,
  csrfProtection,
  validate(disable2FASchema),
  auditLogger('USER_2FA_DISABLE'),
  authController.disable2FA
);

// ─── Audit logs (admin only) ──────────────────────────────────────────────────

router.get(
  '/audit-logs',
  protect,
  restrictTo('admin', 'super_admin'),
  authController.getAuditLogs
);

router.get(
  '/audit-logs/export',
  protect,
  restrictTo('admin', 'super_admin'),
  authController.exportAuditLogs
);

// ─── Admin user management routes ─────────────────────────────────────────────
// Requires authentication + admin or super_admin role

router.post(
  '/admin/users',
  protect,
  csrfProtection,
  restrictTo('admin', 'super_admin'),
  validate(adminCreateUserSchema),
  auditLogger('ADMIN_CREATE_USER'),
  authController.createUserAdmin
);

router.get(
  '/admin/users',
  protect,
  restrictTo('admin', 'super_admin'),
  authController.listUsers
);

router.get(
  '/admin/users/:id/profile',
  protect,
  restrictTo('admin', 'super_admin'),
  authController.getUserAdminProfile
);

router.patch(
  '/admin/users/:id',
  protect,
  csrfProtection,
  restrictTo('admin', 'super_admin'),
  validate(adminUpdateUserSchema),
  auditLogger('ADMIN_UPDATE_USER'),
  authController.updateUser
);

router.post(
  '/admin/users/:id/send-password-reset',
  protect,
  csrfProtection,
  restrictTo('admin', 'super_admin'),
  auditLogger('ADMIN_SEND_PASSWORD_RESET'),
  authController.sendPasswordReset
);

router.post(
  '/admin/users/:id/force-logout',
  protect,
  csrfProtection,
  restrictTo('admin', 'super_admin'),
  auditLogger('ADMIN_FORCE_LOGOUT_USER'),
  authController.forceLogoutUser
);

router.post(
  '/admin/users/:id/lock',
  protect,
  csrfProtection,
  restrictTo('admin', 'super_admin'),
  auditLogger('ADMIN_LOCK_USER'),
  authController.lockUser
);

router.post(
  '/admin/users/:id/unlock',
  protect,
  csrfProtection,
  restrictTo('admin', 'super_admin'),
  auditLogger('ADMIN_UNLOCK_USER'),
  authController.unlockUser
);

router.delete(
  '/admin/users/:id',
  protect,
  csrfProtection,
  restrictTo('admin', 'super_admin'),
  auditLogger('ADMIN_DELETE_USER'),
  authController.deleteUser
);

router.get(
  '/admin/dashboard',
  protect,
  restrictTo('admin', 'super_admin'),
  authController.getAdminDashboard
);

router.get(
  '/admin/role-permissions',
  protect,
  restrictTo('admin', 'super_admin'),
  authController.getRolePermissions
);

router.put(
  '/admin/role-permissions',
  protect,
  csrfProtection,
  restrictTo('admin', 'super_admin'),
  auditLogger('ADMIN_UPDATE_ROLE_PERMISSIONS'),
  authController.updateRolePermissions
);

module.exports = router;
