const Product = require('../models/Product');

const productController = {
  getAllProducts: async (req, res) => {
    try {
      const products = await Product.find();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  getProductById: async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  createProduct: async (req, res) => {
    try {
      const { name, description, price, category, stock } = req.body;
      const product = new Product({
        name,
        description,
        price,
        category,
        stock,
        vendor: req.user.userId
      });
      await product.save();
      res.status(201).json(product);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  updateProduct: async (req, res) => {
    try {
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const product = await Product.findByIdAndDelete(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = productController; 