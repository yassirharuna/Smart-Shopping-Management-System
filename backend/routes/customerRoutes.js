/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * Customer Routes
 * ===========================================
 * Defines all routes related to customer
 * management including CRUD operations.
 */

const express = require('express');
const router = express.Router();

// Import controllers
const {
  getCustomers,
  getCustomer,
  getCustomerDetails,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStatistics,
  addLoyaltyPoints,
  redeemLoyaltyPoints,
  getAllCustomersList
} = require('../controllers/customerController');

// Import middleware
const { protect, restrictTo } = require('../middleware/auth');
const {
  validateCustomer,
  validateCustomerId,
  validatePagination
} = require('../middleware/validator');

// ===========================================
// PUBLIC ROUTES
// ===========================================

// Get all customers for dropdown/autocomplete
router.get('/list/all', getAllCustomersList);

// ===========================================
// PROTECTED ROUTES (Require Authentication)
// ===========================================

// Get all customers (with filtering, search, pagination)
router.get('/', protect, validatePagination, getCustomers);

// Get customer statistics
router.get('/statistics', protect, getCustomerStatistics);

// Get customer by ID
router.get('/:id', protect, validateCustomerId, getCustomer);

// Get customer details with purchase history
router.get('/:id/details', protect, validateCustomerId, getCustomerDetails);

// ===========================================
// ADMIN ROUTES
// ===========================================

// Create new customer (Admin only)
router.post('/', protect, restrictTo('admin'), validateCustomer, createCustomer);

// Update customer (Admin only)
router.put('/:id', protect, restrictTo('admin'), validateCustomerId, validateCustomer, updateCustomer);

// Delete customer (Admin only)
router.delete('/:id', protect, restrictTo('admin'), validateCustomerId, deleteCustomer);

// Add loyalty points (Admin only)
router.post('/:id/loyalty', protect, restrictTo('admin'), validateCustomerId, addLoyaltyPoints);

// Redeem loyalty points (Admin only)
router.post('/:id/redeem', protect, restrictTo('admin'), validateCustomerId, redeemLoyaltyPoints);

// Export router
module.exports = router;