const { AppError } = require('./errorHandler');

/**
 * Validate req.body with a Zod schema. Use on POST/PUT/PATCH routes.
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        // Log detailed error in development
        if (process.env.NODE_ENV === 'development') {
          console.log('=== Validation Error ===');
          console.log('Request Body:', JSON.stringify(req.body, null, 2));
          console.log('Validation Errors:', JSON.stringify(result.error.errors, null, 2));
          console.log('=======================');
        }

        // Format errors with field names
        if (result.error && result.error.errors && Array.isArray(result.error.errors)) {
          const errors = result.error.errors.map(err => {
            const field = err.path.join('.') || 'field';
            const message = err.message;
            // Capitalize first letter of field name
            const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
            return `${fieldName} ${message}`;
          });
          const errorMessage = errors.join(', ');
          return next(new AppError(errorMessage, 400));
        } else {
          // Fallback error message
          return next(new AppError('Validation failed: ' + (result.error.message || 'Invalid input'), 400));
        }
      }

      req.validated = result.data;
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      next(new AppError('Validation error: ' + error.message, 500));
    }
  };
};

/**
 * Validate req.query with a Zod schema. Use on GET routes with query params.
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.query);
      if (!result.success) {
        const errors = result.error?.errors;
        const msg = Array.isArray(errors)
          ? errors.map((e) => `${(e.path || []).join('.')} ${e.message}`).join(', ')
          : result.error?.message || 'Invalid query';
        return next(new AppError(msg, 400));
      }
      req.validatedQuery = result.data;
      next();
    } catch (err) {
      next(new AppError('Validation error: ' + err.message, 500));
    }
  };
};

module.exports = { validate, validateQuery };
