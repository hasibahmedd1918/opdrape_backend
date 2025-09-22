const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const upload = require('../middleware/uploadMiddleware');
const auth = require('../middleware/auth');

// Single file upload route - public
router.post('/:type?', auth, upload.single('file'), uploadController.uploadFile);

// Multiple files upload route - protected
router.post('/multiple/:type?', auth, upload.array('files', 20), uploadController.uploadMultipleFiles);

// Get uploaded files
router.get('/:type?', auth, uploadController.getUploadedFiles);

module.exports = router; 