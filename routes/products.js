const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleCheck');
const productController = require('../controllers/productController');

// Get all products
router.get('/', productController.getAllProducts);

// Get single product
router.get('/:id', productController.getProductById);

// Create product (vendor/admin only)
router.post('/', auth, checkRole(['vendor', 'admin']), productController.createProduct);

// Update product (vendor/admin only)
router.put('/:id', auth, checkRole(['vendor', 'admin']), productController.updateProduct);

// Delete product (admin only)
router.delete('/:id', auth, checkRole(['admin']), productController.deleteProduct);

module.exports = router; 