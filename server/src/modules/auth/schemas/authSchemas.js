const { z } = require('zod');

// Roles that require no special authority to self-register
const PUBLIC_ROLES = [
  'hr',
  'sales',
  'content_creator',
  'seo_manager',
  'support_executive',
  'finance_manager',
  'customer',
];

// Only admins / super_admins may create these
const PRIVILEGED_ROLES = ['admin', 'super_admin'];
const SELF_REGISTER_ROLES = [...PUBLIC_ROLES, 'super_admin'];

const ALL_ROLES = [...PUBLIC_ROLES, ...PRIVILEGED_ROLES];

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Phone: must have 7–15 digits (allows +, spaces, dashes, parentheses)
const phoneSchema = z.string()
  .min(1, 'Phone is required')
  .refine((v) => {
    const digits = (v || '').replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  }, { message: 'Phone must contain 7–15 digits (e.g. +1 234 567 8900)' });

const phoneOptionalSchema = z.string()
  .optional()
  .refine((v) => {
    if (!v || typeof v !== 'string' || v.trim() === '') return true;
    const digits = v.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  }, { message: 'Phone must contain 7–15 digits (e.g. +1 234 567 8900)' });

// Public self-registration allows PUBLIC roles + super_admin bootstrap.
// Service layer still enforces strict privileged-role checks.
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  role: z.enum(SELF_REGISTER_ROLES, {
    errorMap: () => ({ message: `Role must be one of: ${SELF_REGISTER_ROLES.join(', ')}` }),
  }),
});

// Admin-only endpoint: all roles accepted; service layer enforces role-level authority
const adminCreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  roles: z.array(z.enum(ALL_ROLES, {
    errorMap: () => ({ message: `Each role must be one of: ${ALL_ROLES.join(', ')}` }),
  })).min(1, 'At least one role is required'),
  phone: phoneSchema,
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

const adminUpdateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  roles: z.array(z.enum(ALL_ROLES, {
    errorMap: () => ({ message: `Each role must be one of: ${ALL_ROLES.join(', ')}` }),
  })).optional(),
  phone: phoneOptionalSchema,
  jobTitle: z.string().optional(),
  department: z.string().optional(),
}).refine((v) => v.name !== undefined || v.email !== undefined || v.roles !== undefined || v.phone !== undefined || v.jobTitle !== undefined || v.department !== undefined, {
  message: 'At least one field is required',
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

const googleLoginSchema = z.object({
  id_token: z.string().min(1, 'Google ID token is required'),
});

// refreshToken is optional in the body; the controller reads it from the httpOnly
// cookie first (web flow) and falls back to the body (API/mobile flow).
const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  password: passwordSchema,
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
}).refine((v) => v.name || v.email, {
  message: 'At least one field is required (name or email)',
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

const verify2FALoginSchema = z.object({
  tempToken: z.string().min(10, 'tempToken is required'),
  token: z.string().length(6, '2FA token must be 6 digits'),
});

const enable2FASchema = z.object({
  token: z.string().length(6, '2FA token must be 6 digits'),
});

const disable2FASchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

module.exports = {
  registerSchema,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  loginSchema,
  googleLoginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  updatePasswordSchema,
  verify2FALoginSchema,
  enable2FASchema,
  disable2FASchema,
  PUBLIC_ROLES,
  PRIVILEGED_ROLES,
};
