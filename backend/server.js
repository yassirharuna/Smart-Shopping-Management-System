/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * Main Server Entry Point
 * ===========================================
 * This file initializes the Express server,
 * connects to MongoDB, and sets up all routes
 * and middleware for the application.
 */

// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import database configuration
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const saleRoutes = require('./routes/saleRoutes');
const customerRoutes = require('./routes/customerRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Initialize Express application
const app = express();

// Connect to MongoDB database
connectDB();

// ===========================================
// MIDDLEWARE CONFIGURATION
// ===========================================

// Security headers middleware
app.use(helmet());

// CORS configuration - Allow frontend to communicate with backend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// HTTP request logger for development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve repository root assets (user-uploaded JPEGs) under /assets-img
app.use('/assets-img', express.static(path.join(__dirname, '..')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// ===========================================
// API ROUTES
// ===========================================

// Authentication routes (login, register, logout)
app.use('/api/auth', authRoutes);

// Product management routes (CRUD operations)
app.use('/api/products', productRoutes);

// Sales management routes
app.use('/api/sales', saleRoutes);

// Customer management routes
app.use('/api/customers', customerRoutes);

// Dashboard statistics routes
app.use('/api/dashboard', dashboardRoutes);

// ===========================================
// FRONTEND ROUTES
// ===========================================

// Serve HTML pages for different routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/register.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

app.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/products.html'));
});

app.get('/sales', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/sales.html'));
});

app.get('/customers', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/customers.html'));
});

app.get('/reports', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/reports.html'));
});

// ===========================================
// ERROR HANDLING MIDDLEWARE
// ===========================================

// 404 Not Found handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use(errorHandler);

// ===========================================
// SERVER STARTUP
// ===========================================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('===========================================');
  console.log('  SMART SHOP MANAGEMENT SYSTEM');
  console.log('===========================================');
  console.log(`  Server running on port ${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV}`);
  console.log(`  Frontend: http://localhost:${PORT}`);
  console.log(`  API: http://localhost:${PORT}/api`);
  console.log('===========================================');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});

// Export app for testing
module.exports = app;