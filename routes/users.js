const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleCheck');
const userController = require('../controllers/userController');

// Get user profile
router.get('/profile', auth, userController.getProfile);

// Update user profile
router.put('/profile', auth, userController.updateProfile);

// Admin route - Get all users
router.get('/', auth, checkRole(['admin']), userController.getAllUsers);

module.exports = router; 