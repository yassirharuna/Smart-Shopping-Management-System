/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * Product Routes
 * ===========================================
 * Defines all routes related to product
 * management including CRUD operations.
 */

const express = require('express');
const router = express.Router();

// Import controllers
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  updateProductStock,
  deleteProduct,
  getLowStockProducts,
  getOutOfStockProducts,
  getProductCategories,
  getProductStatistics
} = require('../controllers/productController');

// Import middleware
const { protect, restrictTo } = require('../middleware/auth');
const {
  validateProduct,
  validateProductId,
  validatePagination
} = require('../middleware/validator');

// ===========================================
// PUBLIC ROUTES
// ===========================================

// Get all products (with filtering, search, pagination)
router.get('/', validatePagination, getProducts);

// Get product by ID
router.get('/:id', validateProductId, getProduct);

// Get product categories
router.get('/utils/categories', getProductCategories);

// ===========================================
// PROTECTED ROUTES (Require Authentication)
// ===========================================

// Get low stock products
router.get('/alerts/low-stock', protect, getLowStockProducts);

// Get out of stock products
router.get('/alerts/out-of-stock', protect, getOutOfStockProducts);

// Get product statistics
router.get('/utils/statistics', protect, getProductStatistics);

// ===========================================
// ADMIN/STAFF ROUTES (Require Authentication)
// ===========================================

// Create new product (Admin only)
router.post('/', protect, restrictTo('admin'), validateProduct, createProduct);

// Update product (Admin only)
router.put('/:id', protect, restrictTo('admin'), validateProductId, validateProduct, updateProduct);

// Update product stock (Admin and Staff)
router.patch('/:id/stock', protect, validateProductId, updateProductStock);

// Delete product (Admin only)
router.delete('/:id', protect, restrictTo('admin'), validateProductId, deleteProduct);

// Export router
module.exports = router;