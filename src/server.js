require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { requestLogger, errorLogger } = require('./middleware/requestLogger');

// Set mongoose strictQuery to false to prepare for Mongoose 7
mongoose.set('strictQuery', false);

// Import routes
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(helmet());

// Add this before your routes
app.use(requestLogger);

// Root path handler
app.get('/', (req, res) => {
  res.json({
    status: 200,
    message: 'Welcome to Opdrape API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      users: '/api/users',
      admin: '/api/admin',
      products: '/api/products',
      orders: '/api/orders'
    },
    documentation: 'API documentation available at /api-docs',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// 404 handler - for undefined routes
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error logging
app.use(errorLogger);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    status: statusCode,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Connected to MongoDB'.green);
    }
  } catch (err) {
    console.error('❌ MongoDB connection error:'.red, err);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

// Initial connection
connectDB();

// Handle MongoDB connection errors
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:'.red, err);
  // Attempt to reconnect
  setTimeout(connectDB, 5000);
});

mongoose.connection.on('disconnected', () => {
  console.error('❌ MongoDB disconnected. Attempting to reconnect...'.red);
  // Attempt to reconnect
  setTimeout(connectDB, 5000);
});

// Start server only after successful database connection
mongoose.connection.once('open', () => {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, '0.0.0.0', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n🚀 Server is running on port ${PORT}`.green);
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`.cyan);
      console.log(`🔗 API URL: http://localhost:${PORT}`.cyan);
      console.log(`🛠️  Environment: ${process.env.NODE_ENV || 'development'}\n`.yellow);
    }
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:'.red, err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:'.red, err);
  process.exit(1);
});

module.exports = app; 