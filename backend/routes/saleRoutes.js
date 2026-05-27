/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * Sale Routes
 * ===========================================
 * Defines all routes related to sales
 * transactions and management.
 */

const express = require('express');
const router = express.Router();

// Import controllers
const {
  getSales,
  getSale,
  createSale,
  cancelSale,
  getSaleStatistics,
  getRecentSales,
  getReceipt
} = require('../controllers/saleController');

// Import middleware
const { protect, restrictTo } = require('../middleware/auth');
const {
  validateSale,
  validateSaleId,
  validatePagination
} = require('../middleware/validator');

// ===========================================
// PROTECTED ROUTES (Require Authentication)
// ===========================================

// Get all sales (with filtering, search, pagination)
router.get('/', protect, validatePagination, getSales);

// Get recent sales
router.get('/recent', protect, getRecentSales);

// Get sale statistics
router.get('/statistics', protect, getSaleStatistics);

// Get sale by ID
router.get('/:id', protect, validateSaleId, getSale);

// Get receipt for sale
router.get('/:id/receipt', protect, validateSaleId, getReceipt);

// ===========================================
// ADMIN/STAFF ROUTES
// ===========================================

// Create new sale (Admin and Staff)
router.post('/', protect, validateSale, createSale);

// Cancel sale (Admin only)
router.put('/:id/cancel', protect, restrictTo('admin'), validateSaleId, cancelSale);

// Export router
module.exports = router;