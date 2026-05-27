/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * Validation Middleware
 * ===========================================
 * Input validation middleware using
 * express-validator for request data.
 */

const { body, param, query, validationResult } = require('express-validator');
const { createError } = require('./errorHandler');

/**
 * Validation error handler
 * Checks for validation errors and returns formatted response
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  
  next();
};

// ===========================================
// AUTHENTICATION VALIDATORS
// ===========================================

const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
  body('role')
    .optional()
    .isIn(['admin', 'staff']).withMessage('Role must be either admin or staff'),
  
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  handleValidationErrors
];

// ===========================================
// PRODUCT VALIDATORS
// ===========================================

const validateProduct = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Product name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['Groceries', 'Accessories', 'Devices', 'Food', 'Clothing', 'Cosmetics', 'Gadgets', 'Furniture', 'Other'])
    .withMessage('Please select a valid category'),
  
  body('quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Quantity must be a non-negative number'),
  
  body('minStock')
    .optional()
    .isInt({ min: 0 }).withMessage('Minimum stock must be a non-negative number'),
  
  body('buyingPrice')
    .notEmpty().withMessage('Buying price is required')
    .isFloat({ min: 0 }).withMessage('Buying price must be a non-negative number'),
  
  body('sellingPrice')
    .notEmpty().withMessage('Selling price is required')
    .isFloat({ min: 0 }).withMessage('Selling price must be a non-negative number'),
  
  body('barcode')
    .optional()
    .trim(),
  
  handleValidationErrors
];

const validateProductId = [
  param('id')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID format'),
  
  handleValidationErrors
];

// ===========================================
// SALE VALIDATORS
// ===========================================

const validateSale = [
  body('items')
    .isArray({ min: 1 }).withMessage('Sale must have at least one item'),
  
  body('items.*.product')
    .notEmpty().withMessage('Product ID is required for each item')
    .isMongoId().withMessage('Invalid product ID format'),
  
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  
  body('paymentMethod')
    .notEmpty().withMessage('Payment method is required')
    .isIn(['cash', 'card', 'mobile_money', 'cheque', 'credit'])
    .withMessage('Invalid payment method'),
  
  body('amountPaid')
    .notEmpty().withMessage('Amount paid is required')
    .isFloat({ min: 0 }).withMessage('Amount paid must be a non-negative number'),
  
  body('customerName')
    .optional()
    .trim(),
  
  body('discountPercent')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Discount percent must be between 0 and 100'),
  
  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  
  handleValidationErrors
];

const validateSaleId = [
  param('id')
    .notEmpty().withMessage('Sale ID is required')
    .isMongoId().withMessage('Invalid sale ID format'),
  
  handleValidationErrors
];

// ===========================================
// CUSTOMER VALIDATORS
// ===========================================

const validateCustomer = [
  body('name')
    .trim()
    .notEmpty().withMessage('Customer name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Customer name must be between 2 and 100 characters'),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required'),
  
  body('address.street')
    .optional()
    .trim(),
  
  body('address.city')
    .optional()
    .trim(),
  
  body('address.state')
    .optional()
    .trim(),
  
  body('address.zipCode')
    .optional()
    .trim(),
  
  body('address.country')
    .optional()
    .trim(),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  
  handleValidationErrors
];

const validateCustomerId = [
  param('id')
    .notEmpty().withMessage('Customer ID is required')
    .isMongoId().withMessage('Invalid customer ID format'),
  
  handleValidationErrors
];

// ===========================================
// QUERY VALIDATORS (for pagination, search, etc.)
// ===========================================

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

// Export all validators
module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateProduct,
  validateProductId,
  validateSale,
  validateSaleId,
  validateCustomer,
  validateCustomerId,
  validatePagination
};