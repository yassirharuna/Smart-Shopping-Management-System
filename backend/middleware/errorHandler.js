/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * Error Handler Middleware
 * ===========================================
 * Centralized error handling middleware
 * that formats and logs errors consistently.
 */

/**
 * Custom error class for API errors
 * Extends the native Error class with
 * status code and additional properties.
 */
class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Factory function to create common API errors
 */
const createError = {
  badRequest: (message = 'Bad request') => new ApiError(message, 400),
  unauthorized: (message = 'Unauthorized') => new ApiError(message, 401),
  forbidden: (message = 'Forbidden') => new ApiError(message, 403),
  notFound: (message = 'Resource not found') => new ApiError(message, 404),
  conflict: (message = 'Resource conflict') => new ApiError(message, 409),
  validationError: (message = 'Validation error') => new ApiError(message, 422),
  internal: (message = 'Internal server error') => new ApiError(message, 500)
};

/**
 * Global error handler middleware
 * Handles both operational and programming errors
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const errorHandler = (err, req, res, next) => {
  // Set defaults
  let statusCode = err.statusCode || 500;
  let status = err.status || 'error';
  let message = err.message || 'Internal Server Error';
  let isOperational = err.isOperational || false;

  // Log error for debugging
  console.error('Error:', {
    name: err.name,
    message: err.message,
    statusCode: statusCode,
    stack: err.stack,
    isOperational: isOperational
  });

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    message = `Validation Error: ${errors.join(', ')}`;
    statusCode = 400;
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for field: ${field}`;
    statusCode = 409;
  }

  // Handle Mongoose cast errors (invalid ID format)
  if (err.name === 'CastError') {
    message = `Invalid ${err.path}: ${err.value}`;
    statusCode = 400;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token';
    statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    message = 'Token expired';
    statusCode = 401;
  }

  // Handle Multer errors (file upload)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size too large';
    }
    statusCode = 400;
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err
    })
  });
};

/**
 * Async wrapper to catch errors in async functions
 * Eliminates need for try-catch blocks in controllers
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Export error handling utilities
module.exports = {
  ApiError,
  createError,
  errorHandler,
  asyncHandler
};