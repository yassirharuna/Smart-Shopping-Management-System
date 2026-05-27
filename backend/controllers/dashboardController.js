/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * Dashboard Controller
 * ===========================================
 * Handles dashboard statistics and overview
 * data for the admin panel.
 */

const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const { asyncHandler, createError } = require('../middleware/errorHandler');

/**
 * Get main dashboard statistics
 * GET /api/dashboard/stats
 * 
 * Returns overview statistics for the dashboard
 * including total products, sales, revenue, etc.
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  // Total products count
  const totalProducts = await Product.countDocuments();

  // Products by stock status
  const lowStockProducts = await Product.countDocuments({ stockStatus: 'low_stock' });
  const outOfStockProducts = await Product.countDocuments({ stockStatus: 'out_of_stock' });

  // Total sales count and revenue
  const salesStats = await Sale.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, totalSales: { $sum: 1 }, totalRevenue: { $sum: '$total' } } }
  ]);

  // Total customers
  const totalCustomers = await Customer.countDocuments({ isActive: true });

  // Total users/staff
  const totalUsers = await User.countDocuments({ isActive: true });

  // Inventory value
  const inventoryValue = await Product.aggregate([
    { $group: { _id: null, totalValue: { $sum: { $multiply: ['$quantity', '$buyingPrice'] } } } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalProducts,
        totalSales: salesStats[0]?.totalSales || 0,
        totalRevenue: salesStats[0]?.totalRevenue || 0,
        totalCustomers,
        totalUsers,
        inventoryValue: inventoryValue[0]?.totalValue || 0
      },
      alerts: {
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts
      }
    }
  });
});

/**
 * Get dashboard charts data
 * GET /api/dashboard/charts
 * 
 * Returns data for dashboard charts including
 * sales trends, category distribution, etc.
 */
const getDashboardCharts = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  // Daily sales for the period
  const dailySales = await Sale.aggregate([
    {
      $match: {
        status: 'completed',
        saleDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$saleDate' },
          month: { $month: '$saleDate' },
          day: { $dayOfMonth: '$saleDate' }
        },
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: '$total' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);

  // Sales by category
  const salesByCategory = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 }, totalValue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } } } },
    { $project: { _id: 0, category: '$_id', count: 1, totalValue: 1 } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  // Sales by payment method
  const salesByPayment = await Sale.aggregate([
    {
      $match: {
        status: 'completed',
        saleDate: { $gte: startDate, $lte: endDate }
      }
    },
    { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$total' } } }
  ]);

  // Top selling products (by quantity)
  const topProducts = await Sale.aggregate([
    { $match: { status: 'completed', saleDate: { $gte: startDate, $lte: endDate } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.product', totalQuantity: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.subtotal' } } },
    { $sort: { totalQuantity: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $project: {
        _id: 0,
        productId: '$_id',
        name: '$product.name',
        category: '$product.category',
        totalQuantity: 1,
        totalRevenue: 1
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      dailySales,
      salesByCategory,
      salesByPayment,
      topProducts
    }
  });
});

/**
 * Get recent activities
 * GET /api/dashboard/activities
 * 
 * Returns recent sales, new customers, and
 * inventory movements for the dashboard.
 */
const getDashboardActivities = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  // Recent sales
  const recentSales = await Sale.find({ status: 'completed' })
    .sort({ saleDate: -1 })
    .limit(parseInt(limit))
    .populate('customer', 'name')
    .populate('staff', 'name');

  // Recent inventory movements
  const recentMovements = await Inventory.find()
    .sort({ movementDate: -1 })
    .limit(parseInt(limit))
    .populate('product', 'name')
    .populate('user', 'name');

  // New customers
  const newCustomers = await Customer.find()
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .select('name email phone membershipTier createdAt');

  res.status(200).json({
    success: true,
    data: {
      recentSales,
      recentMovements,
      newCustomers
    }
  });
});

/**
 * Get today's summary
 * GET /api/dashboard/today
 * 
 * Returns summary statistics for today.
 */
const getTodaySummary = asyncHandler(async (req, res) => {
  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Today's sales
  const todaySales = await Sale.aggregate([
    {
      $match: {
        status: 'completed',
        saleDate: { $gte: today, $lte: tomorrow }
      }
    },
    { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$total' } } }
  ]);

  // Today's new customers
  const todayCustomers = await Customer.countDocuments({
    createdAt: { $gte: today, $lte: tomorrow }
  });

  // Today's new products
  const todayProducts = await Product.countDocuments({
    createdAt: { $gte: today, $lte: tomorrow }
  });

  res.status(200).json({
    success: true,
    data: {
      date: today,
      sales: todaySales[0] || { count: 0, revenue: 0 },
      newCustomers: todayCustomers,
      newProducts: todayProducts
    }
  });
});

/**
 * Get monthly summary
 * GET /api/dashboard/monthly
 * 
 * Returns summary statistics for the current month.
 */
const getMonthlySummary = asyncHandler(async (req, res) => {
  // Get current month date range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Monthly sales
  const monthlySales = await Sale.aggregate([
    {
      $match: {
        status: 'completed',
        saleDate: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$total' } } }
  ]);

  // Monthly new customers
  const monthlyCustomers = await Customer.countDocuments({
    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
  });

  // Compare with previous month
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const prevMonthSales = await Sale.aggregate([
    {
      $match: {
        status: 'completed',
        saleDate: { $gte: prevMonthStart, $lte: prevMonthEnd }
      }
    },
    { $group: { _id: null, revenue: { $sum: '$total' } } }
  ]);

  const currentRevenue = monthlySales[0]?.revenue || 0;
  const previousRevenue = prevMonthSales[0]?.revenue || 0;
  const growthRate = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

  res.status(200).json({
    success: true,
    data: {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      sales: monthlySales[0] || { count: 0, revenue: 0 },
      newCustomers: monthlyCustomers,
      growthRate: Math.round(growthRate * 100) / 100
    }
  });
});

/**
 * Get quick stats for header/navbar
 * GET /api/dashboard/quick-stats
 */
const getQuickStats = asyncHandler(async (req, res) => {
  // Low stock alert count
  const lowStockCount = await Product.countDocuments({ stockStatus: 'low_stock' });
  const outOfStockCount = await Product.countDocuments({ stockStatus: 'out_of_stock' });

  // Pending sales (if any)
  const pendingSales = await Sale.countDocuments({ paymentStatus: 'pending' });

  res.status(200).json({
    success: true,
    data: {
      lowStock: lowStockCount,
      outOfStock: outOfStockCount,
      pendingSales
    }
  });
});

// Export controller functions
module.exports = {
  getDashboardStats,
  getDashboardCharts,
  getDashboardActivities,
  getTodaySummary,
  getMonthlySummary,
  getQuickStats
};