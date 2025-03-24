const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const { requestLogger, errorLogger } = require('./middleware/requestLogger');
const path = require('path');

const app = express();

// Import routes
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// Request logger (must be first)
app.use(requestLogger);

// Basic middleware with increased limits for all routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://opdrape.store/',
  credentials: true
}));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/uploads', uploadRoutes);

// Add a test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Test route working' });
});

// 404 handler - for undefined routes
app.use((req, res) => {
    res.status(404).json({
        status: 404,
        message: 'Route not found',
        path: req.originalUrl
    });
});

// Error logger middleware
app.use(errorLogger);

// Error handling middleware
app.use((err, req, res, next) => {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
        status: statusCode,
        message: err.message || 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: req.originalUrl
    });
});

module.exports = app; 