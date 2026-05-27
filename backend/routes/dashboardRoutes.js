/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * Dashboard Routes
 * ===========================================
 * Defines all routes related to dashboard
 * statistics and overview data.
 */

const express = require('express');
const router = express.Router();

// Import controllers
const {
  getDashboardStats,
  getDashboardCharts,
  getDashboardActivities,
  getTodaySummary,
  getMonthlySummary,
  getQuickStats
} = require('../controllers/dashboardController');

// Import middleware
const { protect } = require('../middleware/auth');

// ===========================================
// PROTECTED ROUTES (Require Authentication)
// ===========================================

// Get main dashboard statistics
router.get('/stats', protect, getDashboardStats);

// Get dashboard charts data
router.get('/charts', protect, getDashboardCharts);

// Get recent activities
router.get('/activities', protect, getDashboardActivities);

// Get today's summary
router.get('/today', protect, getTodaySummary);

// Get monthly summary
router.get('/monthly', protect, getMonthlySummary);

// Get quick stats for header/navbar
router.get('/quick-stats', protect, getQuickStats);

// Export router
module.exports = router;