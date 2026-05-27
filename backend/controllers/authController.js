/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * Authentication Controller
 * ===========================================
 * Handles user authentication including
 * registration, login, logout, and profile
 * management.
 */

const User = require('../models/User');
const { asyncHandler, createError } = require('../middleware/errorHandler');

/**
 * Register a new user
 * POST /api/auth/register
 * 
 * Creates a new user account with the provided
 * information. Password is automatically hashed.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw createError.conflict('Email already registered');
  }

  // Create new user
  const user = await User.create({
    name,
    email,
    password,
    role: role || 'staff',
    phone
  });

  // Generate JWT token
  const token = user.generateAuthToken();

  // Send response
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        createdAt: user.createdAt
      },
      token
    }
  });
});

/**
 * Login user
 * POST /api/auth/login
 * 
 * Authenticates user with email and password,
 * returns JWT token on success.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate email and password are provided
  if (!email || !password) {
    throw createError.badRequest('Please provide email and password');
  }

  // Find user by email (include password for comparison)
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw createError.unauthorized('Invalid credentials');
  }

  // Check if user is active
  if (!user.isActive) {
    throw createError.unauthorized('Account is deactivated');
  }

  // Check password
  const isPasswordCorrect = await user.comparePassword(password);

  if (!isPasswordCorrect) {
    throw createError.unauthorized('Invalid credentials');
  }

  // Generate JWT token
  const token = user.generateAuthToken();

  // Send response
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        createdAt: user.createdAt
      },
      token
    }
  });
});

/**
 * Get current user profile
 * POST /api/auth/profile
 * (Uses POST to avoid caching issues)
 * 
 * Returns the profile of the currently
 * authenticated user.
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    }
  });
});

/**
 * Update user profile
 * PUT /api/auth/profile
 * 
 * Allows users to update their own profile
 * information.
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar } = req.body;

  // Fields that can be updated
  const updateFields = {};
  if (name) updateFields.name = name;
  if (phone) updateFields.phone = phone;
  if (avatar) updateFields.avatar = avatar;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    updateFields,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { user }
  });
});

/**
 * Change password
 * PUT /api/auth/change-password
 * 
 * Allows users to change their password.
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw createError.badRequest('Please provide current and new password');
  }

  if (newPassword.length < 6) {
    throw createError.badRequest('New password must be at least 6 characters');
  }

  // Get user with password
  const user = await User.findById(req.user.id).select('+password');

  // Verify current password
  const isPasswordCorrect = await user.comparePassword(currentPassword);

  if (!isPasswordCorrect) {
    throw createError.unauthorized('Current password is incorrect');
  }

  // Update password (will be hashed by pre-save middleware)
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
});

/**
 * Get all users (Admin only)
 * GET /api/auth/users
 * 
 * Returns a list of all users. Only accessible
 * by admin users.
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', role = '' } = req.query;

  // Build query
  const query = {};
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (role) {
    query.role = role;
  }

  // Execute query with pagination
  const users = await User.find(query)
    .select('-password')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const count = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    }
  });
});

/**
 * Get user by ID (Admin only)
 * GET /api/auth/users/:id
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    throw createError.notFound('User not found');
  }

  res.status(200).json({
    success: true,
    data: { user }
  });
});

/**
 * Update user (Admin only)
 * PUT /api/auth/users/:id
 */
const updateUser = asyncHandler(async (req, res) => {
  const { name, email, role, phone, isActive } = req.body;

  const updateFields = {};
  if (name) updateFields.name = name;
  if (email) updateFields.email = email;
  if (role) updateFields.role = role;
  if (phone) updateFields.phone = phone;
  if (isActive !== undefined) updateFields.isActive = isActive;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    updateFields,
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw createError.notFound('User not found');
  }

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: { user }
  });
});

/**
 * Delete user (Admin only)
 * DELETE /api/auth/users/:id
 */
const deleteUser = asyncHandler(async (req, res) => {
  // Prevent self-deletion
  if (req.params.id === req.user.id) {
    throw createError.badRequest('Cannot delete your own account');
  }

  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    throw createError.notFound('User not found');
  }

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

// Export controller functions
module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};