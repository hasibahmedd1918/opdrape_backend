const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleCheck');
const orderController = require('../controllers/orderController');

router.post('/', auth, orderController.createOrder);
router.get('/', auth, orderController.getOrders);
router.put('/:id/status', auth, checkRole(['admin', 'vendor']), orderController.updateOrderStatus);

module.exports = router; 