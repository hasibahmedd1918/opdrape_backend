const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Message = require('../models/Message');
const Promotion = require('../models/Promotion');
const AdminActivity = require('../models/AdminActivity');
const Category = require('../models/Category');
const mongoose = require('mongoose');

const adminController = {
  // Dashboard Statistics
  async getDashboardStats(req, res) {
    try {
      // Get total users (excluding admins)
      const totalUsers = await User.countDocuments({ role: 'user' });
      
      // Get total orders
      const totalOrders = await Order.countDocuments();
      
      // Get total revenue from delivered orders
      const revenueData = await Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;
      
      // Get recent orders
      const recentOrders = await Order.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name email');
      
      res.json({
        totalUsers,
        totalOrders,
        totalRevenue,
        recentOrders
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // User Management
  async getAllUsers(req, res) {
    try {
      const users = await User.find({ role: 'user' })
        .select('-password');
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getUserById(req, res) {
    try {
      const { userId } = req.params;
      
      // Get user data without trying to populate orders
      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get user's orders separately
      const recentOrders = await Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('totalAmount status createdAt');
      
      // Get user's order statistics
      const orderStats = await Order.aggregate([
        { $match: { user: mongoose.Types.ObjectId(userId) } },
        { $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' },
            avgOrderValue: { $avg: '$totalAmount' }
          }
        }
      ]);
      
      // Format response
      const userData = {
        ...user.toObject(),
        recentOrders,
        stats: orderStats.length > 0 ? {
          totalOrders: orderStats[0].totalOrders,
          totalSpent: orderStats[0].totalSpent,
          avgOrderValue: orderStats[0].avgOrderValue
        } : {
          totalOrders: 0,
          totalSpent: 0,
          avgOrderValue: 0
        }
      };
      
      res.json(userData);
    } catch (error) {
      console.error('Error fetching user details:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async updateUser(req, res) {
    try {
      const { userId } = req.params;
      const updates = req.body;
      
      // Define allowed fields to update
      const allowedUpdates = ['name', 'email', 'phone', 'address', 'isEmailVerified', 'role'];
      
      // Filter out any fields that aren't allowed
      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {});
      
      if (Object.keys(filteredUpdates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      
      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        filteredUpdates,
        { new: true, runValidators: true }
      ).select('-password');
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Log admin activity
      await new AdminActivity({
        admin: req.user._id,
        action: 'update',
        entityType: 'user',
        entityId: userId,
        details: {
          before: await User.findById(userId).select('-password'),
          after: updatedUser,
          changes: filteredUpdates
        }
      }).save();
      
      res.json({
        message: 'User updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Order Management
  async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      
      const order = await Order.findByIdAndUpdate(
        orderId,
        { status },
        { new: true }
      );
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getAllOrders(req, res) {
    try {
      const { page = 1, limit = 10, status, search } = req.query;
      
      // Build the query based on filters
      let query = {};
      
      // Filter by status if provided
      if (status) {
        query.status = status;
      }
      
      // Search by order ID or user info if search term provided
      if (search) {
        // First find users matching the search term
        const users = await User.find({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ]
        }).select('_id');
        
        const userIds = users.map(user => user._id);
        
        // Then build the query to search by ID or those users
        query.$or = [
          { _id: search.match(/^[0-9a-fA-F]{24}$/) ? search : null },
          { user: { $in: userIds } }
        ].filter(condition => condition._id !== null || condition.user);
      }
      
      // Execute the query with pagination
      const orders = await Order.find(query)
        .populate('user', 'name email')
        .populate('items.product', 'name category subCategory')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      // Get total count for pagination
      const totalOrders = await Order.countDocuments(query);
      
      res.json({
        orders,
        totalPages: Math.ceil(totalOrders / limit),
        currentPage: Number(page),
        totalOrders
      });
    } catch (error) {
      console.error('Error fetching admin orders:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Product Management
  async createProduct(req, res) {
    try {
      console.log("Admin creating new product...");
      const productData = req.body;
      
      // Validate colorVariants data
      if (!productData.colorVariants || !Array.isArray(productData.colorVariants) || productData.colorVariants.length === 0) {
        return res.status(400).json({ error: 'Product must have at least one color variant' });
      }
      
      // Validate each color variant has images
      for (const variant of productData.colorVariants) {
        if (!variant.color || !variant.color.name || !variant.color.hexCode) {
          return res.status(400).json({ error: 'Each color variant must have color name and hexCode' });
        }
        
        if (!variant.images || !Array.isArray(variant.images) || variant.images.length === 0) {
          return res.status(400).json({ error: `Color variant "${variant.color.name}" must have at least one image` });
        }
        
        // Validate each image has a URL
        for (const image of variant.images) {
          if (!image.url) {
            return res.status(400).json({ error: `Images for color variant "${variant.color.name}" must have URL` });
          }
          
          // Ensure URLs are properly formatted
          if (!image.url.startsWith('/uploads/') && !image.url.startsWith('http')) {
            image.url = `/uploads/products/${image.url}`;
          }
        }
        
        // Ensure sizes are valid
        if (!variant.sizes || !Array.isArray(variant.sizes) || variant.sizes.length === 0) {
          return res.status(400).json({ error: `Color variant "${variant.color.name}" must have at least one size` });
        }
        
        for (const size of variant.sizes) {
          if (!size.name || !['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'].includes(size.name)) {
            return res.status(400).json({ error: `Size name must be one of: XS, S, M, L, XL, XXL, 3XL (found: ${size.name})` });
          }
          
          if (typeof size.quantity !== 'number' || size.quantity < 0) {
            return res.status(400).json({ error: `Size quantity must be a non-negative number (found: ${size.quantity})` });
          }
        }
      }
      
      console.log("Admin creating product with data:", JSON.stringify({
        name: productData.name,
        category: productData.category,
        subCategory: productData.subCategory,
        variants: productData.colorVariants.length
      }));
      
      const product = new Product(productData);
      
      // Set admin as creator
      if (req.user) {
        product.createdBy = req.user._id;
      }
      
      await product.save();
      console.log("Product created successfully with ID:", product._id);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(400).json({ error: error.message });
    }
  },

  async updateProduct(req, res) {
    try {
      const { productId } = req.params;
      const product = await Product.findByIdAndUpdate(
        productId,
        req.body,
        { new: true }
      );
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async deleteProduct(req, res) {
    try {
      const { productId } = req.params;
      const product = await Product.findByIdAndDelete(productId);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async bulkUpdateProducts(req, res) {
    try {
      const { products } = req.body;
      
      if (!Array.isArray(products)) {
        return res.status(400).json({ error: 'Products must be an array' });
      }
      
      const results = await Promise.all(
        products.map(async (product) => {
          if (!product._id) return { error: 'Product ID is required' };
          
          try {
            const updated = await Product.findByIdAndUpdate(
              product._id,
              { $set: product },
              { new: true }
            );
            return updated || { error: 'Product not found', _id: product._id };
          } catch (error) {
            return { error: error.message, _id: product._id };
          }
        })
      );
      
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async manageCategories(req, res) {
    try {
      const { action, category } = req.body;
      
      switch (action) {
        case 'create':
          const newCategory = new Category(category);
          await newCategory.save();
          res.status(201).json(newCategory);
          break;
          
        case 'update':
          if (!category._id) {
            return res.status(400).json({ error: 'Category ID is required' });
          }
          
          const updatedCategory = await Category.findByIdAndUpdate(
            category._id,
            category,
            { new: true }
          );
          
          if (!updatedCategory) {
            return res.status(404).json({ error: 'Category not found' });
          }
          
          res.json(updatedCategory);
          break;
          
        case 'delete':
          if (!category._id) {
            return res.status(400).json({ error: 'Category ID is required' });
          }
          
          const deletedCategory = await Category.findByIdAndDelete(category._id);
          
          if (!deletedCategory) {
            return res.status(404).json({ error: 'Category not found' });
          }
          
          res.json({ message: 'Category deleted successfully' });
          break;
          
        default:
          res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Inventory Management
  async updateInventory(req, res) {
    try {
      const { productId } = req.params;
      const { stock } = req.body;
      
      if (typeof stock !== 'number' || stock < 0) {
        return res.status(400).json({ error: 'Stock must be a non-negative number' });
      }
      
      const product = await Product.findByIdAndUpdate(
        productId,
        { stock },
        { new: true }
      );
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getLowStockProducts(req, res) {
    try {
      const threshold = parseInt(req.query.threshold) || 10;
      
      const products = await Product.find({ stock: { $lte: threshold } })
        .sort({ stock: 1 });
      
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Message Management
  async getMessages(req, res) {
    try {
      const messages = await Message.find()
        .sort({ createdAt: -1 })
        .populate('user', 'name email');
      
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async replyToMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { reply } = req.body;
      
      const message = await Message.findByIdAndUpdate(
        messageId,
        {
          reply,
          status: 'replied',
          repliedBy: req.user._id,
          repliedAt: new Date()
        },
        { new: true }
      );
      
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }
      
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Promotion Management
  async createPromotion(req, res) {
    try {
      const promotion = new Promotion(req.body);
      await promotion.save();
      res.status(201).json(promotion);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async getPromotions(req, res) {
    try {
      const promotions = await Promotion.find()
        .sort({ createdAt: -1 });
      
      res.json(promotions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Activity Logs
  async getActivityLogs(req, res) {
    try {
      const logs = await AdminActivity.find()
        .sort({ createdAt: -1 })
        .populate('admin', 'name email');
      
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Reports
  async getSalesReport(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const query = {};
      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      
      const salesData = await Order.aggregate([
        { $match: query },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ]);
      
      res.json({
        salesData,
        dateRange: {
          startDate: startDate || 'all',
          endDate: endDate || 'all'
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getInventoryReport(req, res) {
    try {
      const inventoryData = await Product.aggregate([
        { $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          averagePrice: { $avg: '$price' }
        }},
        { $sort: { _id: 1 } }
      ]);
      
      const lowStockProducts = await Product.find({ stock: { $lt: 10 } })
        .sort({ stock: 1 });
      
      res.json({
        inventoryData,
        lowStockProducts
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = adminController; 