const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const productController = require('../controllers/productController');
const adminAuth = require('../middleware/adminAuth');

// Debug middleware for request size
const debugRequestSize = (req, res, next) => {
  console.log(`Request size: ${JSON.stringify(req.body).length} bytes`);
  next();
};

// Search and filter routes (must come before /:_id route)
router.get('/category/:category', productController.getProductsByCategory);
router.get('/search', productController.searchProducts);
router.get('/banner/:tag', productController.getProductsByTag);
router.get('/related/:_id', productController.getRelatedProducts);

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:_id', productController.getProductById);

// Review routes
router.get('/:_id/reviews', productController.getProductReviews);
router.post('/:_id/reviews', auth, productController.addProductReview);
router.delete('/:_id/reviews', auth, productController.deleteProductReview);

// Protected routes - require authentication
router.post('/', auth, debugRequestSize, productController.createProduct);
router.patch('/:_id', auth, adminAuth, productController.updateProduct);
router.delete('/:_id', auth, productController.deleteProduct);

module.exports = router; 