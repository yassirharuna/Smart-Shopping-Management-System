/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * User Model
 * ===========================================
 * Defines the schema for user accounts with
 * role-based authentication (Admin/Staff).
 * Passwords are hashed using bcrypt.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  // User's full name
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },

  // Unique email for login
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },

  // Hashed password
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password in queries by default
  },

  // User role - determines access level
  role: {
    type: String,
    enum: ['admin', 'staff'],
    default: 'staff'
  },

  // Phone number (optional)
  phone: {
    type: String,
    trim: true
  },

  // Profile image URL
  avatar: {
    type: String,
    default: 'default-avatar.png'
  },

  // Account status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  // Automatically manage timestamps
  timestamps: true
});

/**
 * Pre-save middleware to hash password
 * Only hashes password if it has been modified
 */
UserSchema.pre('save', async function(next) {
  // Skip if password hasn't been modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Instance method to compare passwords
 * Used during login to verify credentials
 * 
 * @param {String} candidatePassword - Password provided by user
 * @returns {Boolean} - True if passwords match
 */
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Instance method to generate JWT token
 * 
 * @returns {String} - JWT token
 */
UserSchema.methods.generateAuthToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Remove sensitive data from JSON output
 */
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

// Create and export the User model
module.exports = mongoose.model('User', UserSchema);