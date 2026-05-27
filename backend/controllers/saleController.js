/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * Sale Controller
 * ===========================================
 * Handles all sales-related operations
 * including creating sales, processing
 * payments, and generating reports.
 */

const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');
const { asyncHandler, createError } = require('../middleware/errorHandler');

/**
 * Get all sales with filtering, sorting, and pagination
 * GET /api/sales
 */
const getSales = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = '',
    paymentStatus = '',
    paymentMethod = '',
    startDate = '',
    endDate = '',
    sortBy = 'saleDate',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  const query = {};

  // Search by invoice number or customer name
  if (search) {
    query.$or = [
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } }
    ];
  }

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by payment status
  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }

  // Filter by payment method
  if (paymentMethod) {
    query.paymentMethod = paymentMethod;
  }

  // Filter by date range
  if (startDate || endDate) {
    query.saleDate = {};
    if (startDate) query.saleDate.$gte = new Date(startDate);
    if (endDate) query.saleDate.$lte = new Date(endDate);
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query with pagination and population
  const sales = await Sale.find(query)
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('customer', 'name phone email')
    .populate('staff', 'name email');

  // Get total count
  const total = await Sale.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      sales,
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
 * Get single sale by ID
 * GET /api/sales/:id
 */
const getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id)
    .populate('customer', 'name phone email address')
    .populate('staff', 'name email')
    .populate('items.product', 'name barcode category');

  if (!sale) {
    throw createError.notFound('Sale not found');
  }

  res.status(200).json({
    success: true,
    data: { sale }
  });
});

/**
 * Create new sale
 * POST /api/sales
 * 
 * This is the main point of sale function that:
 * 1. Validates product availability
 * 2. Updates product stock
 * 3. Creates inventory records
 * 4. Updates customer purchase history
 * 5. Generates invoice number
 */
const createSale = asyncHandler(async (req, res) => {
  const {
    items,
    customer,
    customerName,
    paymentMethod,
    amountPaid,
    discountPercent = 0,
    taxRate = 0,
    notes = ''
  } = req.body;

  // Validate items
  if (!items || items.length === 0) {
    throw createError.badRequest('At least one item is required');
  }

  // Check product availability and calculate totals
  const processedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = await Product.findById(item.product);

    if (!product) {
      throw createError.notFound(`Product not found: ${item.product}`);
    }

    if (product.quantity < item.quantity) {
      throw createError.badRequest(`Insufficient stock for ${product.name}. Available: ${product.quantity}`);
    }

    if (product.stockStatus === 'out_of_stock') {
      throw createError.badRequest(`Product ${product.name} is out of stock`);
    }

    const itemSubtotal = product.sellingPrice * item.quantity;
    subtotal += itemSubtotal;

    processedItems.push({
      product: product._id,
      productName: product.name,
      productBarcode: product.barcode,
      quantity: item.quantity,
      price: product.sellingPrice,
      subtotal: itemSubtotal
    });
  }

  // Generate invoice number
  const invoiceNumber = await Sale.generateInvoiceNumber();

  // Get customer info if provided
  let customerData = null;
  let customerFullName = customerName || 'Walk-in Customer';

  if (customer) {
    const customerDoc = await Customer.findById(customer);
    if (customerDoc) {
      customerData = customerDoc._id;
      customerFullName = customerDoc.name;
    }
  }

  // Create sale
  const sale = await Sale.create({
    invoiceNumber,
    customer: customerData,
    customerName: customerFullName,
    staff: req.user.id,
    staffName: req.user.name,
    items: processedItems,
    paymentMethod,
    amountPaid,
    discountPercent,
    taxRate,
    notes
  });

  // Update product stock and create inventory records
  for (const item of processedItems) {
    const product = await Product.findById(item.product);

    // Store previous quantity for inventory record
    const previousQuantity = product.quantity;

    // Update stock
    product.quantity -= item.quantity;
    await product.save();

    // Create inventory record
    await Inventory.create({
      product: product._id,
      productName: product.name,
      type: 'sale',
      quantity: -item.quantity,
      previousQuantity,
      newQuantity: product.quantity,
      referenceId: sale._id,
      referenceType: 'sale',
      user: req.user.id,
      userName: req.user.name,
      reason: `Sale ${invoiceNumber}`,
      costPerUnit: product.buyingPrice,
      totalValue: product.buyingPrice * item.quantity
    });
  }

  // Update customer purchase history if customer provided
  if (customerData) {
    const customerDoc = await Customer.findById(customerData);
    if (customerDoc) {
      await customerDoc.addPurchase(sale.total);
    }
  }

  // Populate the sale for response
  const populatedSale = await Sale.findById(sale._id)
    .populate('customer', 'name phone email')
    .populate('staff', 'name email');

  res.status(201).json({
    success: true,
    message: 'Sale completed successfully',
    data: { sale: populatedSale }
  });
});

/**
 * Cancel sale
 * PUT /api/sales/:id/cancel
 * 
 * Cancels a sale and restores product stock
 */
const cancelSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id);

  if (!sale) {
    throw createError.notFound('Sale not found');
  }

  if (sale.status !== 'completed') {
    throw createError.badRequest('Sale cannot be cancelled');
  }

  // Restore product stock
  for (const item of sale.items) {
    const product = await Product.findById(item.product);
    if (product) {
      const previousQuantity = product.quantity;
      product.quantity += item.quantity;
      await product.save();

      // Create inventory record for return
      await Inventory.create({
        product: product._id,
        productName: product.name,
        type: 'return',
        quantity: item.quantity,
        previousQuantity,
        newQuantity: product.quantity,
        referenceId: sale._id,
        referenceType: 'sale',
        user: req.user.id,
        userName: req.user.name,
        reason: `Cancelled sale ${sale.invoiceNumber}`,
        costPerUnit: product.buyingPrice,
        totalValue: product.buyingPrice * item.quantity
      });
    }
  }

  // Update sale status
  sale.status = 'cancelled';
  await sale.save();

  res.status(200).json({
    success: true,
    message: 'Sale cancelled successfully',
    data: { sale }
  });
});

/**
 * Get sales statistics
 * GET /api/sales/statistics
 */
const getSaleStatistics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  // Build date filter
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  // Total sales count and revenue
  const salesStats = await Sale.aggregate([
    { $match: { status: 'completed', saleDate: dateFilter } },
    { $group: { _id: null, totalSales: { $sum: 1 }, totalRevenue: { $sum: '$total' }, totalItems: { $sum: '$totalItems' } } }
  ]);

  // Sales by payment method
  const byPaymentMethod = await Sale.aggregate([
    { $match: { status: 'completed', saleDate: dateFilter } },
    { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$total' } } }
  ]);

  // Daily sales for the past 7 days
  const today = new Date();
  const weekAgo = new Date(today.setDate(today.getDate() - 7));
  
  const dailySales = await Sale.aggregate([
    { $match: { status: 'completed', saleDate: { $gte: weekAgo } } },
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

  res.status(200).json({
    success: true,
    data: {
      overview: salesStats[0] || { totalSales: 0, totalRevenue: 0, totalItems: 0 },
      byPaymentMethod,
      dailySales
    }
  });
});

/**
 * Get recent sales
 * GET /api/sales/recent
 */
const getRecentSales = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const sales = await Sale.find({ status: 'completed' })
    .sort({ saleDate: -1 })
    .limit(limit)
    .populate('customer', 'name')
    .populate('staff', 'name');

  res.status(200).json({
    success: true,
    data: { sales }
  });
});

/**
 * Generate receipt data
 * GET /api/sales/:id/receipt
 */
const getReceipt = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id)
    .populate('customer', 'name phone email address')
    .populate('staff', 'name email')
    .populate('items.product', 'name barcode');

  if (!sale) {
    throw createError.notFound('Sale not found');
  }

  res.status(200).json({
    success: true,
    data: {
      receipt: {
        invoiceNumber: sale.invoiceNumber,
        date: sale.saleDate,
        customer: sale.customer,
        customerName: sale.customerName,
        staff: sale.staff,
        staffName: sale.staffName,
        items: sale.items,
        subtotal: sale.subtotal,
        discount: sale.discount,
        discountPercent: sale.discountPercent,
        tax: sale.tax,
        taxRate: sale.taxRate,
        total: sale.total,
        amountPaid: sale.amountPaid,
        change: sale.change,
        paymentMethod: sale.paymentMethod,
        paymentStatus: sale.paymentStatus
      }
    }
  });
});

// Export controller functions
module.exports = {
  getSales,
  getSale,
  createSale,
  cancelSale,
  getSaleStatistics,
  getRecentSales,
  getReceipt
};