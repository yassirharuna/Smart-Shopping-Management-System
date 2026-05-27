/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * Authentication Routes
 * ===========================================
 * Defines all routes related to user
 * authentication and management.
 */

const express = require('express');
const router = express.Router();

// Import controllers
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} = require('../controllers/authController');

// Import middleware
const { protect, restrictTo } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validatePagination
} = require('../middleware/validator');

// ===========================================
// PUBLIC ROUTES
// ===========================================

// Register new user
router.post('/register', validateRegister, register);

// Login user
router.post('/login', validateLogin, login);

// ===========================================
// PROTECTED ROUTES (Require Authentication)
// ===========================================

// Get current user profile
router.post('/profile', protect, getProfile);

// Update user profile
router.put('/profile', protect, updateProfile);

// Change password
router.put('/change-password', protect, changePassword);

// ===========================================
// ADMIN ROUTES (Require Admin Role)
// ===========================================

// Get all users (Admin only)
router.get('/users', protect, restrictTo('admin'), validatePagination, getAllUsers);

// Get user by ID (Admin only)
router.get('/users/:id', protect, restrictTo('admin'), getUserById);

// Update user (Admin only)
router.put('/users/:id', protect, restrictTo('admin'), updateUser);

// Delete user (Admin only)
router.delete('/users/:id', protect, restrictTo('admin'), deleteUser);

// Export router
module.exports = router;