const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const adminActivityLogger = require('../middleware/adminActivityLogger');

// All routes require authentication and admin role
router.use(auth, adminAuth);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserById);
router.patch('/users/:userId', adminActivityLogger('user'), adminController.updateUser);

// Order Management
router.get('/orders', adminController.getAllOrders);
router.patch('/orders/:orderId/status', adminActivityLogger('order'), adminController.updateOrderStatus);

// Product Management
router.post('/products', adminActivityLogger('product'), adminController.createProduct);
router.patch('/products/:productId', adminActivityLogger('product'), adminController.updateProduct);
router.delete('/products/:productId', adminActivityLogger('product'), adminController.deleteProduct);
router.post('/products/bulk-update', adminController.bulkUpdateProducts);
router.post('/categories', adminController.manageCategories);

// Message Management
router.get('/messages', adminController.getMessages);
router.post('/messages/:messageId/reply', adminController.replyToMessage);

// Analytics routes
router.get('/reports/sales', adminController.getSalesReport);
router.get('/reports/inventory', adminController.getInventoryReport);

// Add promotion routes
router.post('/promotions', adminActivityLogger('promotion'), adminController.createPromotion);
router.get('/promotions', adminController.getPromotions);

// Add activity log viewing route
router.get('/activity-logs', adminController.getActivityLogs);

// Add these routes
router.patch('/products/:productId/inventory', adminActivityLogger('product'), adminController.updateInventory);
router.get('/products/low-stock', adminController.getLowStockProducts);

module.exports = router; 