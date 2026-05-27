/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * Sale Model
 * ===========================================
 * Defines the schema for sales transactions.
 * Tracks items sold, payment details, and
 * links to customers and staff.
 */

const mongoose = require('mongoose');

// Sub-schema for individual items in a sale
const SaleItemSchema = new mongoose.Schema({
  // Reference to the product
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },

  // Product name (stored for historical reference)
  productName: {
    type: String,
    required: true
  },

  // Product barcode (stored for historical reference)
  productBarcode: {
    type: String
  },

  // Quantity sold
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },

  // Selling price at time of sale
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },

  // Subtotal for this item
  subtotal: {
    type: Number,
    required: true
  }
});

// Main sale schema
const SaleSchema = new mongoose.Schema({
  // Unique sale/invoice number
  invoiceNumber: {
    type: String,
    unique: true,
    required: true
  },

  // Reference to the customer (optional for walk-in customers)
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },

  // Customer name (stored for walk-in customers)
  customerName: {
    type: String,
    default: 'Walk-in Customer'
  },

  // Reference to the staff who made the sale
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Staff name (stored for historical reference)
  staffName: {
    type: String,
    required: true
  },

  // Items in the sale
  items: {
    type: [SaleItemSchema],
    required: true,
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'Sale must have at least one item'
    }
  },

  // Total quantity of items
  totalItems: {
    type: Number,
    required: true,
    default: 0
  },

  // Subtotal before discount
  subtotal: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Subtotal cannot be negative']
  },

  // Discount amount
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },

  // Discount percentage
  discountPercent: {
    type: Number,
    default: 0,
    min: [0, 'Discount percent cannot be negative'],
    max: [100, 'Discount percent cannot exceed 100']
  },

  // Tax amount
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },

  // Tax rate percentage
  taxRate: {
    type: Number,
    default: 0,
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100']
  },

  // Grand total
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  },

  // Payment method
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'mobile_money', 'cheque', 'credit'],
    required: true
  },

  // Amount paid by customer
  amountPaid: {
    type: Number,
    required: true,
    min: [0, 'Amount paid cannot be negative']
  },

  // Change returned
  change: {
    type: Number,
    default: 0
  },

  // Payment status
  paymentStatus: {
    type: String,
    enum: ['paid', 'partial', 'pending', 'refunded'],
    default: 'paid'
  },

  // Sale status
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'refunded'],
    default: 'completed'
  },

  // Notes
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },

  // Date of sale
  saleDate: {
    type: Date,
    default: Date.now
  }
}, {
  // Automatically manage timestamps
  timestamps: true
});

/**
 * Pre-save middleware to calculate totals
 */
SaleSchema.pre('save', function(next) {
  // Calculate total items
  this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);

  // Calculate discount
  const discountAmount = (this.subtotal * this.discountPercent) / 100;
  const afterDiscount = this.subtotal - discountAmount;

  // Calculate tax
  const taxAmount = (afterDiscount * this.taxRate) / 100;

  // Calculate grand total
  this.total = afterDiscount + taxAmount;
  this.discount = discountAmount;
  this.tax = taxAmount;

  // Calculate change
  this.change = this.amountPaid - this.total;

  next();
});

/**
 * Static method to generate unique invoice number
 * Format: INV-YYYYMMDD-XXXX
 */
SaleSchema.statics.generateInvoiceNumber = async function() {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  
  // Get count of sales today
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));
  
  const todaySales = await this.countDocuments({
    saleDate: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  });
  
  const sequence = String(todaySales + 1).padStart(4, '0');
  return `INV-${dateStr}-${sequence}`;
};

/**
 * Static method to get sales by date range
 */
SaleSchema.statics.getSalesByDateRange = async function(startDate, endDate) {
  return await this.find({
    saleDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    status: 'completed'
  }).populate('customer', 'name phone').populate('staff', 'name email');
};

/**
 * Static method to get daily sales summary
 */
SaleSchema.statics.getDailySalesSummary = async function(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const sales = await this.find({
    saleDate: {
      $gte: startOfDay,
      $lte: endOfDay
    },
    status: 'completed'
  });

  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalItems = sales.reduce((sum, sale) => sum + sale.totalItems, 0);

  return {
    date,
    totalSales,
    totalRevenue,
    totalItems,
    averageSale: totalSales > 0 ? totalRevenue / totalSales : 0
  };
};

// Create and export the Sale model
module.exports = mongoose.model('Sale', SaleSchema);