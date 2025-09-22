const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const auth = require('../middleware/auth');
const { body } = require('express-validator');

// Validation middleware for AI chat
const validateMessage = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters'),
  body('conversationHistory')
    .optional()
    .isArray()
    .withMessage('Conversation history must be an array')
];

/**
 * @route   POST /api/ai/chat
 * @desc    Send a message to AI and get response
 * @access  Private (requires authentication)
 * @body    { message: string, conversationHistory?: array }
 */
router.post('/chat', auth, validateMessage, aiController.sendMessage);

/**
 * @route   GET /api/ai/suggestions
 * @desc    Get AI chat suggestions for common queries
 * @access  Private (requires authentication)
 */
router.get('/suggestions', auth, aiController.getSuggestions);

/**
 * @route   GET /api/ai/health
 * @desc    Check AI service health status
 * @access  Private (requires authentication)
 */
router.get('/health', auth, aiController.healthCheck);

module.exports = router;