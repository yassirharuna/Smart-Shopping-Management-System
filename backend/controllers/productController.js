/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * Product Controller
 * ===========================================
 * Handles all product-related operations
 * including CRUD operations, search, and
 * inventory management.
 */

const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const fs = require('fs');
const path = require('path');

function loadLocalProducts() {
  try {
    const file = path.join(__dirname, '../data/products.json');
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

/**
 * Get all products with filtering, sorting, and pagination
 * GET /api/products
 * 
 * Supports query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - search: Search in name, description, barcode
 * - category: Filter by category
 * - stockStatus: Filter by stock status
 * - sortBy: Field to sort by
 * - sortOrder: asc or desc
 */
const getProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    category = '',
    stockStatus = '',
    status = '',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  const query = {};

  // Search in name, description, barcode
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { barcode: { $regex: search, $options: 'i' } }
    ];
  }

  // Filter by category
  if (category) {
    query.category = category;
  }

  // Filter by stock status
  if (stockStatus) {
    query.stockStatus = stockStatus;
  }

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  try {
    // Try database first
    const products = await Product.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count
    const total = await Product.countDocuments(query);

    // Get stock status counts
    const stockCounts = await Product.aggregate([
      { $match: query },
      { $group: { _id: '$stockStatus', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        },
        stockCounts: {
          in_stock: stockCounts.find(s => s._id === 'in_stock')?.count || 0,
          low_stock: stockCounts.find(s => s._id === 'low_stock')?.count || 0,
          out_of_stock: stockCounts.find(s => s._id === 'out_of_stock')?.count || 0
        }
      }
    });
  } catch (dbErr) {
    // Fallback to local JSON file when DB not available
    const local = loadLocalProducts();

    // apply filters
    let list = local.filter(p => {
      if (search) {
        const s = search.toLowerCase();
        if (!((p.name || '').toLowerCase().includes(s) || (p.description || '').toLowerCase().includes(s) || (p.barcode || '').toLowerCase().includes(s))) return false;
      }
      if (category && p.category !== category) return false;
      if (stockStatus && p.stockStatus !== stockStatus) return false;
      if (status && p.status !== status) return false;
      return true;
    });

    // sorting
    list.sort((a, b) => {
      const vA = a[sortBy];
      const vB = b[sortBy];
      if (vA === vB) return 0;
      if (sortOrder === 'asc') return vA > vB ? 1 : -1;
      return vA < vB ? 1 : -1;
    });

    const total = list.length;
    const start = (page - 1) * limit;
    const products = list.slice(start, start + limit);

    const stockCounts = {
      in_stock: list.filter(p => p.stockStatus === 'in_stock').length,
      low_stock: list.filter(p => p.stockStatus === 'low_stock').length,
      out_of_stock: list.filter(p => p.stockStatus === 'out_of_stock').length
    };

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        },
        stockCounts
      }
    });
  }
});

/**
 * Get single product by ID
 * GET /api/products/:id
 */
const getProduct = asyncHandler(async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw createError.notFound('Product not found');
    return res.status(200).json({ success: true, data: { product } });
  } catch (dbErr) {
    const local = loadLocalProducts();
    const product = local.find(p => p._id === req.params.id || p._id === String(req.params.id));
    if (!product) throw createError.notFound('Product not found');
    return res.status(200).json({ success: true, data: { product } });
  }
});

/**
 * Create new product
 * POST /api/products
 */
const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    category,
    barcode,
    quantity,
    minStock,
    buyingPrice,
    sellingPrice
  } = req.body;

  // Check if barcode already exists
  if (barcode) {
    const existingProduct = await Product.findOne({ barcode });
    if (existingProduct) {
      throw createError.conflict('Barcode already exists');
    }
  }

  // Create product
  const product = await Product.create({
    name,
    description,
    category,
    barcode,
    quantity: quantity || 0,
    minStock: minStock || 10,
    buyingPrice,
    sellingPrice
  });

  // Create inventory record for initial stock
  if (product.quantity > 0) {
    await Inventory.create({
      product: product._id,
      productName: product.name,
      type: 'purchase',
      quantity: product.quantity,
      previousQuantity: 0,
      newQuantity: product.quantity,
      user: req.user.id,
      userName: req.user.name,
      reason: 'Initial stock',
      costPerUnit: product.buyingPrice,
      totalValue: product.buyingPrice * product.quantity
    });
  }

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: { product }
  });
});

/**
 * Update product
 * PUT /api/products/:id
 */
const updateProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    category,
    barcode,
    quantity,
    minStock,
    buyingPrice,
    sellingPrice,
    status
  } = req.body;

  // Check if barcode already exists (for different product)
  if (barcode) {
    const existingProduct = await Product.findOne({ barcode });
    if (existingProduct && existingProduct._id.toString() !== req.params.id) {
      throw createError.conflict('Barcode already exists');
    }
  }

  // Get current product for inventory tracking
  const currentProduct = await Product.findById(req.params.id);
  if (!currentProduct) {
    throw createError.notFound('Product not found');
  }

  // Build update object
  const updateFields = {
    name,
    description,
    category,
    barcode,
    minStock,
    buyingPrice,
    sellingPrice,
    status
  };

  // Handle quantity change
  if (quantity !== undefined && quantity !== currentProduct.quantity) {
    const quantityDiff = quantity - currentProduct.quantity;
    
    updateFields.quantity = quantity;

    // Create inventory record for quantity change
    await Inventory.create({
      product: currentProduct._id,
      productName: currentProduct.name,
      type: 'adjustment',
      quantity: quantityDiff,
      previousQuantity: currentProduct.quantity,
      newQuantity: quantity,
      user: req.user.id,
      userName: req.user.name,
      reason: 'Stock adjustment',
      costPerUnit: currentProduct.buyingPrice,
      totalValue: currentProduct.buyingPrice * Math.abs(quantityDiff)
    });
  }

  // Update product using document save to trigger pre-save middleware
  Object.assign(currentProduct, updateFields);
  const product = await currentProduct.save();

  res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    data: { product }
  });
});

/**
 * Update product stock
 * PATCH /api/products/:id/stock
 */
const updateProductStock = asyncHandler(async (req, res) => {
  const { quantity, type = 'adjustment', reason = '' } = req.body;

  const product = await Product.findById(req.params.id);
  if (!product) {
    throw createError.notFound('Product not found');
  }

  const previousQuantity = product.quantity;
  const quantityChange = parseInt(quantity);

  // Update stock
  product.quantity = Math.max(0, product.quantity + quantityChange);
  await product.save();

  // Create inventory record
  await Inventory.create({
    product: product._id,
    productName: product.name,
    type,
    quantity: quantityChange,
    previousQuantity,
    newQuantity: product.quantity,
    user: req.user.id,
    userName: req.user.name,
    reason: reason || `${type} adjustment`,
    costPerUnit: product.buyingPrice,
    totalValue: product.buyingPrice * Math.abs(quantityChange)
  });

  res.status(200).json({
    success: true,
    message: 'Stock updated successfully',
    data: { product }
  });
});

/**
 * Delete product
 * DELETE /api/products/:id
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    throw createError.notFound('Product not found');
  }

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully'
  });
});

/**
 * Get low stock products
 * GET /api/products/low-stock
 */
const getLowStockProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({
    $or: [
      { stockStatus: 'low_stock' },
      { stockStatus: 'out_of_stock' }
    ]
  }).sort({ quantity: 1 });

  res.status(200).json({
    success: true,
    data: { products, count: products.length }
  });
});

/**
 * Get out of stock products
 * GET /api/products/out-of-stock
 */
const getOutOfStockProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ quantity: 0 });

  res.status(200).json({
    success: true,
    data: { products, count: products.length }
  });
});

/**
 * Get product categories
 * GET /api/products/categories
 */
const getProductCategories = asyncHandler(async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    return res.status(200).json({ success: true, data: { categories } });
  } catch (dbErr) {
    const local = loadLocalProducts();
    const categories = Array.from(new Set(local.map(p => p.category))).filter(Boolean);
    return res.status(200).json({ success: true, data: { categories } });
  }
});

/**
 * Get product statistics
 * GET /api/products/statistics
 */
const getProductStatistics = asyncHandler(async (req, res) => {
  // Total products
  const totalProducts = await Product.countDocuments();

  // Products by category
  const byCategory = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 }, totalValue: { $sum: { $multiply: ['$quantity', '$buyingPrice'] } } } },
    { $project: { _id: 0, category: '$_id', count: 1, totalValue: 1 } }
  ]);

  // Stock status summary
  const stockStatus = await Product.aggregate([
    { $group: { _id: '$stockStatus', count: { $sum: 1 } } }
  ]);

  // Total inventory value
  const inventoryValue = await Product.aggregate([
    { $group: { _id: null, totalValue: { $sum: { $multiply: ['$quantity', '$buyingPrice'] } }, potentialRevenue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } } } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalProducts,
      byCategory,
      stockStatus: {
        in_stock: stockStatus.find(s => s._id === 'in_stock')?.count || 0,
        low_stock: stockStatus.find(s => s._id === 'low_stock')?.count || 0,
        out_of_stock: stockStatus.find(s => s._id === 'out_of_stock')?.count || 0
      },
      inventoryValue: inventoryValue[0] || { totalValue: 0, potentialRevenue: 0 }
    }
  });
});

// Export controller functions
module.exports = {
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
};