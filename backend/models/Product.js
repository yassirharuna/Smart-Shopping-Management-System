/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * Product Model
 * ===========================================
 * Defines the schema for products in the shop.
 * Includes fields for inventory tracking,
 * pricing, and product categorization.
 */

const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  // Product name
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [2, 'Product name must be at least 2 characters'],
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },

  // Product description
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  // Product category
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    enum: {
      values: [
        'Groceries',
        'Accessories',
        'Devices',
        'Food',
        'Clothing',
        'Cosmetics',
        'Gadgets',
        'Furniture',
        'Other'
      ],
      message: 'Please select a valid category'
    }
  },

  // Unique barcode/SKU
  barcode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },

  // Stock quantity
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },

  // Minimum stock level for low stock alerts
  minStock: {
    type: Number,
    default: 10,
    min: [0, 'Minimum stock cannot be negative']
  },

  // Buying price (cost price)
  buyingPrice: {
    type: Number,
    required: [true, 'Buying price is required'],
    min: [0, 'Buying price cannot be negative']
  },

  // Selling price (retail price)
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Selling price cannot be negative']
  },

  // Product image URL
  image: {
    type: String,
    default: 'default-product.png'
  },

  // Product status
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },

  // Stock status (computed)
  stockStatus: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock'],
    default: 'in_stock'
  },

  // Profit margin (computed)
  profitMargin: {
    type: Number
  },

  // Date added
  dateAdded: {
    type: Date,
    default: Date.now
  }
}, {
  // Automatically manage timestamps
  timestamps: true
});

/**
 * Pre-save middleware to update computed fields
 * - Updates stock status based on quantity
 * - Calculates profit margin
 */
ProductSchema.pre('save', function(next) {
  // Update stock status
  if (this.quantity === 0) {
    this.stockStatus = 'out_of_stock';
  } else if (this.quantity <= this.minStock) {
    this.stockStatus = 'low_stock';
  } else {
    this.stockStatus = 'in_stock';
  }

  // Calculate profit margin
  if (this.buyingPrice > 0) {
    this.profitMargin = ((this.sellingPrice - this.buyingPrice) / this.buyingPrice) * 100;
  } else {
    this.profitMargin = 0;
  }

  next();
});

/**
 * Static method to get low stock products
 * 
 * @returns {Promise<Array>} - Products with low stock
 */
ProductSchema.statics.getLowStockProducts = async function() {
  return await this.find({
    $or: [
      { $expr: { $lte: ["$quantity", "$minStock"] } },
      { stockStatus: { $in: ['low_stock', 'out_of_stock'] } }
    ]
  }).sort({ quantity: 1 });
};

/**
 * Static method to get out of stock products
 * 
 * @returns {Promise<Array>} - Products that are out of stock
 */
ProductSchema.statics.getOutOfStockProducts = async function() {
  return await this.find({ quantity: 0 });
};

/**
 * Static method to find product by barcode
 * 
 * @param {String} barcode - Product barcode
 * @returns {Promise<Document>} - Product found
 */
ProductSchema.statics.findByBarcode = async function(barcode) {
  return await this.findOne({ barcode, status: 'active' });
};

/**
 * Instance method to update stock
 * 
 * @param {Number} amount - Amount to add (positive) or subtract (negative)
 * @returns {Promise<Document>} - Updated product
 */
ProductSchema.methods.updateStock = async function(amount) {
  this.quantity = Math.max(0, this.quantity + amount);
  return await this.save();
};

// Create and export the Product model
module.exports = mongoose.model('Product', ProductSchema);