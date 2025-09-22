const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const auth = require('../middleware/auth');

// All cart routes require authentication
router.use(auth);

// Add item to cart
router.post('/add', cartController.addToCart);

// Get cart
router.get('/', cartController.getCart);

// Update cart item quantity
router.put('/update', cartController.updateCartItem);

// Remove item from cart
router.delete('/remove', cartController.removeFromCart);

// Clear cart
router.delete('/clear', cartController.clearCart);

module.exports = router; 