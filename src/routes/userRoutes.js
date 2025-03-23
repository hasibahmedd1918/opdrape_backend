const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);

// Protected routes
router.get('/profile', auth, userController.getProfile);
router.patch('/profile', auth, userController.updateProfile);
router.post('/change-password', auth, userController.changePassword);
router.get('/orders', auth, userController.getOrders);

// Wishlist routes
router.post('/wishlist/:productId', auth, userController.addToWishlist);
router.delete('/wishlist/:productId', auth, userController.removeFromWishlist);

// Cart routes
router.get('/cart', auth, userController.getCart);
router.post('/cart', auth, userController.addToCart);
router.delete('/cart/:productId', auth, userController.removeFromCart);
router.put('/cart/:productId', auth, userController.updateCartItemQuantity);

// Add these routes
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);
router.post('/verify-email', userController.verifyEmail);
router.post('/resend-verification', auth, userController.resendVerification);

module.exports = router; 