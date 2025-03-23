const path = require('path');
const fs = require('fs');

const uploadController = {
  // Upload a single file
  uploadFile: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Get file information
      const file = req.file;
      const type = req.params.type || 'products';
      
      // Create file URL for response
      const fileUrl = `/uploads/${type}/${file.filename}`;
      
      // Return success response with file details
      res.status(201).json({
        message: 'File uploaded successfully',
        file: {
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          url: fileUrl
        }
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Upload multiple files
  uploadMultipleFiles: async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const type = req.params.type || 'products';
      
      // Process all uploaded files
      const uploadedFiles = req.files.map(file => {
        return {
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          url: `/uploads/${type}/${file.filename}`
        };
      });

      // Return success response with file details
      res.status(201).json({
        message: 'Files uploaded successfully',
        count: uploadedFiles.length,
        files: uploadedFiles
      });
    } catch (error) {
      console.error('Error uploading multiple files:', error);
      res.status(500).json({ error: error.message });
    }
  },
  
  // Get uploaded files
  getUploadedFiles: async (req, res) => {
    try {
      const type = req.params.type || 'products';
      const dirPath = path.join(__dirname, '../../uploads', type);
      
      if (!fs.existsSync(dirPath)) {
        return res.status(404).json({ error: 'Directory not found' });
      }
      
      const files = fs.readdirSync(dirPath);
      const fileData = files.map(filename => {
        return {
          filename,
          url: `/uploads/${type}/${filename}`
        };
      });
      
      res.json({
        count: fileData.length,
        files: fileData
      });
    } catch (error) {
      console.error('Error getting uploaded files:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = uploadController; 