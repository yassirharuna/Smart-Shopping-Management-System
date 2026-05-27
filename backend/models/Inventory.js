/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * Inventory Model
 * ===========================================
 * Defines the schema for inventory tracking
 * and stock movement history. This model
 * maintains a log of all inventory changes.
 */

const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
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

  // Type of inventory movement
  type: {
    type: String,
    enum: ['purchase', 'sale', 'return', 'adjustment', 'damaged', 'expired'],
    required: true
  },

  // Quantity change (positive for additions, negative for reductions)
  quantity: {
    type: Number,
    required: true
  },

  // Quantity before this movement
  previousQuantity: {
    type: Number,
    required: true
  },

  // Quantity after this movement
  newQuantity: {
    type: Number,
    required: true
  },

  // Reference to related document (sale, purchase order, etc.)
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  // Reference type (sale, purchase_order, etc.)
  referenceType: {
    type: String,
    enum: ['sale', 'purchase_order', 'return', 'adjustment', null],
    default: null
  },

  // User who made the change
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // User name (stored for historical reference)
  userName: {
    type: String,
    required: true
  },

  // Reason for the movement
  reason: {
    type: String,
    trim: true,
    maxlength: [200, 'Reason cannot exceed 200 characters']
  },

  // Cost per unit (for purchases)
  costPerUnit: {
    type: Number,
    min: [0, 'Cost cannot be negative']
  },

  // Total value of movement
  totalValue: {
    type: Number,
    min: [0, 'Total value cannot be negative']
  },

  // Date of movement
  movementDate: {
    type: Date,
    default: Date.now
  }
}, {
  // Automatically manage timestamps
  timestamps: true
});

/**
 * Index for efficient querying
 */
InventorySchema.index({ product: 1, movementDate: -1 });
InventorySchema.index({ referenceId: 1, referenceType: 1 });

/**
 * Static method to get inventory history for a product
 * 
 * @param {ObjectId} productId - Product ID
 * @param {Number} limit - Number of records to return
 * @returns {Promise<Array>} - Inventory history
 */
InventorySchema.statics.getProductInventoryHistory = async function(productId, limit = 50) {
  return await this.find({ product: productId })
    .sort({ movementDate: -1 })
    .limit(limit)
    .populate('user', 'name email');
};

/**
 * Static method to get inventory summary
 * 
 * @returns {Promise<Object>} - Inventory summary
 */
InventorySchema.statics.getInventorySummary = async function() {
  const summary = await this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' }
      }
    },
    {
      $project: {
        _id: 0,
        type: '$_id',
        count: 1,
        totalQuantity: 1
      }
    }
  ]);

  return summary;
};

/**
 * Static method to get recent inventory movements
 * 
 * @param {Number} limit - Number of records to return
 * @returns {Promise<Array>} - Recent movements
 */
InventorySchema.statics.getRecentMovements = async function(limit = 20) {
  return await this.find()
    .sort({ movementDate: -1 })
    .limit(limit)
    .populate('product', 'name category')
    .populate('user', 'name email');
};

/**
 * Static method to create inventory record for stock change
 * 
 * @param {Object} data - Inventory data
 * @returns {Promise<Document>} - Created inventory record
 */
InventorySchema.statics.createInventoryRecord = async function(data) {
  return await this.create(data);
};

// Create and export the Inventory model
module.exports = mongoose.model('Inventory', InventorySchema);