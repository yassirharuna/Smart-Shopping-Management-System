/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * Customer Model
 * ===========================================
 * Defines the schema for customer information.
 * Tracks customer details and links to their
 * purchase history.
 */

const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  // Customer's full name
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },

  // Email address
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    sparse: true // Allows multiple null values
  },

  // Phone number
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },

  // Physical address
  address: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    zipCode: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      default: 'Kenya',
      trim: true
    }
  },

  // Customer loyalty points
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: [0, 'Loyalty points cannot be negative']
  },

  // Customer membership tier
  membershipTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },

  // Total amount spent by customer
  totalSpent: {
    type: Number,
    default: 0,
    min: [0, 'Total spent cannot be negative']
  },

  // Number of purchases
  totalPurchases: {
    type: Number,
    default: 0,
    min: [0, 'Total purchases cannot be negative']
  },

  // Customer status
  isActive: {
    type: Boolean,
    default: true
  },

  // Notes about the customer
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },

  // Date registered
  dateRegistered: {
    type: Date,
    default: Date.now
  }
}, {
  // Automatically manage timestamps
  timestamps: true
});

/**
 * Virtual for full address
 * Returns a formatted address string
 */
CustomerSchema.virtual('fullAddress').get(function() {
  const parts = [];
  if (this.address.street) parts.push(this.address.street);
  if (this.address.city) parts.push(this.address.city);
  if (this.address.state) parts.push(this.address.state);
  if (this.address.zipCode) parts.push(this.address.zipCode);
  if (this.address.country) parts.push(this.address.country);
  return parts.join(', ') || 'No address provided';
});

/**
 * Instance method to add a purchase
 * Updates customer statistics
 * 
 * @param {Number} amount - Purchase amount
 */
CustomerSchema.methods.addPurchase = async function(amount) {
  this.totalSpent += amount;
  this.totalPurchases += 1;
  
  // Update membership tier based on total spent
  if (this.totalSpent >= 100000) {
    this.membershipTier = 'platinum';
  } else if (this.totalSpent >= 50000) {
    this.membershipTier = 'gold';
  } else if (this.totalSpent >= 20000) {
    this.membershipTier = 'silver';
  }
  
  // Add loyalty points (1 point per 100 spent)
  this.loyaltyPoints += Math.floor(amount / 100);
  
  return await this.save();
};

/**
 * Instance method to redeem loyalty points
 * 
 * @param {Number} points - Points to redeem
 * @returns {Number} - Discount amount
 */
CustomerSchema.methods.redeemPoints = async function(points) {
  if (points > this.loyaltyPoints) {
    throw new Error('Insufficient loyalty points');
  }
  
  const discount = points * 10; // 10 currency units per point
  this.loyaltyPoints -= points;
  
  return await this.save();
};

/**
 * Static method to get top customers
 * 
 * @param {Number} limit - Number of customers to return
 * @returns {Promise<Array>} - Top customers by spending
 */
CustomerSchema.statics.getTopCustomers = async function(limit = 10) {
  return await this.find()
    .sort({ totalSpent: -1 })
    .limit(limit);
};

// Include virtuals in JSON output
CustomerSchema.set('toJSON', { virtuals: true });
CustomerSchema.set('toObject', { virtuals: true });

// Create and export the Customer model
module.exports = mongoose.model('Customer', CustomerSchema);