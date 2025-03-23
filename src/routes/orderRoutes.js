const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const orderController = require('../controllers/orderController');

// Create new order
router.post('/', auth, orderController.createOrder);

// Get all orders for authenticated user
router.get('/', auth, orderController.getUserOrders);

// Get specific order by ID
router.get('/:id', auth, orderController.getOrderById);

// Update order status (admin only)
router.patch('/:id/status', auth, orderController.updateOrderStatus);

// Cancel order
router.post('/:id/cancel', auth, orderController.cancelOrder);

module.exports = router; 