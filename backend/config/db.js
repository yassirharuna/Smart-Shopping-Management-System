/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * Database Configuration
 * ===========================================
 * This file handles the MongoDB connection
 * using Mongoose and the connection string
 * from environment variables.
 */

const mongoose = require('mongoose');
// Attempt to load mongodb-memory-server only when needed (optional)

/**
 * Connect to MongoDB database
 * Uses the MONGO_URI environment variable
 * 
 * @returns {Promise} Mongoose connection promise
 */
const connectDB = async () => {
  try {
    // Get MongoDB URI from environment variables or use in-memory server for dev
    let mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      console.warn('WARNING: MONGO_URI not set — attempting to start in-memory MongoDB for development.');
      try {
        // load lazily so missing optional dependency doesn't crash the app
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        mongoURI = mongod.getUri();
        console.log('Using in-memory MongoDB instance');
      } catch (err) {
        console.warn('mongodb-memory-server not available; falling back to local MongoDB URI.');
        mongoURI = 'mongodb://127.0.0.1:27017/smartshop';
      }
    }

    // Establish connection to MongoDB (Mongoose 6+ uses sane defaults)
    const conn = await mongoose.connect(mongoURI);

    console.log('===========================================');
    console.log('  DATABASE CONNECTION');
    console.log('===========================================');
    console.log(`  Connected to: ${conn.connection.host}`);
    console.log(`  Database: ${conn.connection.name}`);
    console.log('  Status: Connected ✓');
    console.log('===========================================');

    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      console.warn('WARNING: MongoDB disconnected!');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed due to app termination');
        process.exit(0);
      } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });

    return conn;

  } catch (error) {
    console.error('===========================================');
    console.error('  DATABASE CONNECTION ERROR (non-fatal)');
    console.error('===========================================');
    console.error('  Error:', error.message);
    console.error('  The app will continue running without a database connection.');
    console.error('  To enable DB features, ensure MongoDB is available and restart the app.');
    console.error('===========================================');
    return null;
  }
};

// Export the connection function
module.exports = connectDB;