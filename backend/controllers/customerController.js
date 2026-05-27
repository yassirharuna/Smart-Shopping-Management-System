/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * Customer Controller
 * ===========================================
 * Handles all customer-related operations
 * including CRUD operations and purchase
 * history tracking.
 */

const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const { asyncHandler, createError } = require('../middleware/errorHandler');

/**
 * Get all customers with filtering, sorting, and pagination
 * GET /api/customers
 */
const getCustomers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    membershipTier = '',
    isActive = '',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  const query = {};

  // Search in name, email, phone
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  // Filter by membership tier
  if (membershipTier) {
    query.membershipTier = membershipTier;
  }

  // Filter by active status
  if (isActive !== '') {
    query.isActive = isActive === 'true';
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query with pagination
  const customers = await Customer.find(query)
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  // Get total count
  const total = await Customer.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      customers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * Get single customer by ID
 * GET /api/customers/:id
 */
const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    throw createError.notFound('Customer not found');
  }

  res.status(200).json({
    success: true,
    data: { customer }
  });
});

/**
 * Get customer with purchase history
 * GET /api/customers/:id/details
 */
const getCustomerDetails = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    throw createError.notFound('Customer not found');
  }

  // Get customer's purchase history
  const purchases = await Sale.find({ customer: customer._id })
    .sort({ saleDate: -1 })
    .limit(20)
    .populate('staff', 'name');

  res.status(200).json({
    success: true,
    data: {
      customer,
      purchases
    }
  });
});

/**
 * Create new customer
 * POST /api/customers
 */
const createCustomer = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    address,
    notes
  } = req.body;

  // Check if email already exists
  if (email) {
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      throw createError.conflict('Email already registered');
    }
  }

  // Create customer
  const customer = await Customer.create({
    name,
    email,
    phone,
    address: address || {},
    notes
  });

  res.status(201).json({
    success: true,
    message: 'Customer created successfully',
    data: { customer }
  });
});

/**
 * Update customer
 * PUT /api/customers/:id
 */
const updateCustomer = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    address,
    notes,
    isActive
  } = req.body;

  // Check if email already exists (for different customer)
  if (email) {
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer && existingCustomer._id.toString() !== req.params.id) {
      throw createError.conflict('Email already registered');
    }
  }

  // Build update object
  const updateFields = {
    name,
    email,
    phone,
    address,
    notes
  };

  if (isActive !== undefined) {
    updateFields.isActive = isActive;
  }

  const customer = await Customer.findByIdAndUpdate(
    req.params.id,
    updateFields,
    { new: true, runValidators: true }
  );

  if (!customer) {
    throw createError.notFound('Customer not found');
  }

  res.status(200).json({
    success: true,
    message: 'Customer updated successfully',
    data: { customer }
  });
});

/**
 * Delete customer
 * DELETE /api/customers/:id
 */
const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndDelete(req.params.id);

  if (!customer) {
    throw createError.notFound('Customer not found');
  }

  res.status(200).json({
    success: true,
    message: 'Customer deleted successfully'
  });
});

/**
 * Get customer statistics
 * GET /api/customers/statistics
 */
const getCustomerStatistics = asyncHandler(async (req, res) => {
  // Total customers
  const totalCustomers = await Customer.countDocuments();

  // Active customers
  const activeCustomers = await Customer.countDocuments({ isActive: true });

  // Customers by membership tier
  const byTier = await Customer.aggregate([
    { $group: { _id: '$membershipTier', count: { $sum: 1 } } }
  ]);

  // Top customers by spending
  const topCustomers = await Customer.find()
    .sort({ totalSpent: -1 })
    .limit(10)
    .select('name email totalSpent membershipTier');

  // Total revenue from customers
  const revenueData = await Customer.aggregate([
    { $group: { _id: null, totalRevenue: { $sum: '$totalSpent' } } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalCustomers,
      activeCustomers,
      inactiveCustomers: totalCustomers - activeCustomers,
      byTier: {
        bronze: byTier.find(t => t._id === 'bronze')?.count || 0,
        silver: byTier.find(t => t._id === 'silver')?.count || 0,
        gold: byTier.find(t => t._id === 'gold')?.count || 0,
        platinum: byTier.find(t => t._id === 'platinum')?.count || 0
      },
      topCustomers,
      totalRevenue: revenueData[0]?.totalRevenue || 0
    }
  });
});

/**
 * Add loyalty points to customer
 * POST /api/customers/:id/loyalty
 */
const addLoyaltyPoints = asyncHandler(async (req, res) => {
  const { points, reason } = req.body;

  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    throw createError.notFound('Customer not found');
  }

  if (!points || points <= 0) {
    throw createError.badRequest('Points must be a positive number');
  }

  customer.loyaltyPoints += points;
  await customer.save();

  res.status(200).json({
    success: true,
    message: `Added ${points} points to customer`,
    data: {
      customer,
      newBalance: customer.loyaltyPoints
    }
  });
});

/**
 * Redeem loyalty points
 * POST /api/customers/:id/redeem
 */
const redeemLoyaltyPoints = asyncHandler(async (req, res) => {
  const { points } = req.body;

  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    throw createError.notFound('Customer not found');
  }

  if (!points || points <= 0) {
    throw createError.badRequest('Points must be a positive number');
  }

  if (points > customer.loyaltyPoints) {
    throw createError.badRequest('Insufficient loyalty points');
  }

  const discount = points * 10; // 10 currency units per point
  customer.loyaltyPoints -= points;
  await customer.save();

  res.status(200).json({
    success: true,
    message: `Redeemed ${points} points for ${discount} discount`,
    data: {
      discount,
      pointsRedeemed: points,
      remainingPoints: customer.loyaltyPoints
    }
  });
});

/**
 * Get all customers for dropdown/autocomplete
 * GET /api/customers/list/all
 */
const getAllCustomersList = asyncHandler(async (req, res) => {
  const { search = '' } = req.query;

  const query = { isActive: true };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const customers = await Customer.find(query)
    .select('name phone email membershipTier loyaltyPoints')
    .sort({ name: 1 })
    .limit(50);

  res.status(200).json({
    success: true,
    data: { customers }
  });
});

// Export controller functions
module.exports = {
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
};