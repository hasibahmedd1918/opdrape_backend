const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const adminActivityLogger = require('../middleware/adminActivityLogger');
const upload = require('../middleware/upload');

// All routes require authentication and admin role
router.use(auth, adminAuth);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserById);
router.get('/users/:userId/orders', adminController.getUserOrders);
router.patch('/users/:userId', adminActivityLogger('user'), adminController.updateUser);
router.delete('/users/:userId', adminActivityLogger('user'), adminController.deleteUser);

// Order Management
router.get('/orders', adminController.getAllOrders);
router.patch('/orders/:orderId/status', adminActivityLogger('order'), adminController.updateOrderStatus);

// Product Management
router.get('/products', adminController.getAllProducts);
router.get('/products/:_id', adminController.getProductById);
router.post('/products', upload.array('images', 5), adminController.createProduct);
router.patch('/products/:_id', upload.array('images', 5), adminController.updateProduct);
router.delete('/products/:_id', adminController.deleteProduct);
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

// Admin Review Management routes
router.get('/reviews', adminController.getAllReviews);
router.get('/products/:productId/reviews/:reviewId', adminController.getReviewById);
router.patch('/products/:productId/reviews/:reviewId', adminActivityLogger('review'), adminController.updateReviewStatus);
router.delete('/products/:productId/reviews/:reviewId', adminActivityLogger('review'), adminController.deleteReview);

module.exports = router; 