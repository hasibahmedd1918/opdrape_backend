const User = require('../models/User');
const Order = require('../models/Order');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Product = require('../models/Product');

const userController = {
  // Register new user
  async register(req, res) {
    try {
      const { name, email, password, phone } = req.body;
      const user = new User({ name, email, password, phone });
      await user.save();
      
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
      res.status(201).json({ user, token });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = generateToken(user);
      res.json({
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get user profile
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user._id)
        .populate('wishlist')
        .populate('cart.product');
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Update user profile
  async updateProfile(req, res) {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'email', 'phone', 'address'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ error: 'Invalid updates!' });
    }

    try {
      updates.forEach(update => req.user[update] = req.body[update]);
      await req.user.save();
      res.json(req.user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Change password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }
      
      // Verify current password
      const user = await User.findById(req.user._id);
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      
      // Update password
      user.password = newPassword;
      await user.save();
      
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get user's orders
  async getOrders(req, res) {
    try {
      const orders = await Order.find({ user: req.user._id })
        .populate('items.product')
        .sort({ createdAt: -1 });
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Add to wishlist
  async addToWishlist(req, res) {
    try {
      const user = req.user;
      const productId = req.params.productId;
      
      if (!user.wishlist.includes(productId)) {
        user.wishlist.push(productId);
        await user.save();
      }
      
      res.json(user.wishlist);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Remove from wishlist
  async removeFromWishlist(req, res) {
    try {
      const user = req.user;
      user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productId);
      await user.save();
      res.json(user.wishlist);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Add to cart
  async addToCart(req, res) {
    try {
      const { productId, quantity } = req.body;
      const user = req.user;
      
      // Validate product exists and has colorVariants
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      // Verify product has colorVariants
      if (!product.colorVariants || product.colorVariants.length === 0) {
        return res.status(400).json({ error: 'Product has incomplete data (missing color variants)' });
      }
      
      const cartItemIndex = user.cart.findIndex(item => 
        item.product.toString() === productId
      );

      if (cartItemIndex > -1) {
        user.cart[cartItemIndex].quantity += quantity;
      } else {
        user.cart.push({ product: productId, quantity });
      }

      await user.save();
      res.json(user.cart);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Remove from cart
  async removeFromCart(req, res) {
    try {
      const user = req.user;
      user.cart = user.cart.filter(item => 
        item.product.toString() !== req.params.productId
      );
      await user.save();
      res.json(user.cart);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Update cart item quantity
  async updateCartItemQuantity(req, res) {
    try {
      const { quantity } = req.body;
      const productId = req.params.productId;
      const user = req.user;
      
      // Validate quantity
      if (!quantity || quantity < 1) {
        return res.status(400).json({ error: 'Quantity must be at least 1' });
      }
      
      // Find the cart item
      const cartItemIndex = user.cart.findIndex(item => 
        item.product.toString() === productId
      );
      
      if (cartItemIndex === -1) {
        return res.status(404).json({ error: 'Product not found in cart' });
      }
      
      // Update the quantity
      user.cart[cartItemIndex].quantity = quantity;
      await user.save();
      
      // Return the updated cart
      const updatedUser = await User.findById(user._id)
        .populate({
          path: 'cart.product'
        });
        
      // Format cart items using the same logic as getCart
      const formattedCart = updatedUser.cart.map(item => {
        const product = item.product;
        
        // Get the first image from colorVariants if available
        let imageUrl = null;
        if (product.colorVariants && product.colorVariants.length > 0 && 
            product.colorVariants[0].images && product.colorVariants[0].images.length > 0) {
          imageUrl = product.colorVariants[0].images[0].url;
        }
        
        // Use the same product data structure as getCart
        const productData = product.toObject ? product.toObject() : {...product};
        productData.image = imageUrl;
        
        // Calculate the display price based on what's available
        const displayPrice = 
          product.basePrice !== undefined ? product.basePrice : 
          product.price !== undefined ? product.price : 
          product.salePrice !== undefined ? product.salePrice : 29.99;
        
        return {
          _id: item._id,
          product: productData,
          quantity: item.quantity,
          subtotal: item.quantity * displayPrice
        };
      });
      
      // Calculate cart total
      const cartTotal = formattedCart.reduce((total, item) => {
        return total + item.subtotal;
      }, 0);
      
      res.json({
        items: formattedCart,
        totalItems: formattedCart.length,
        cartTotal: cartTotal
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Get cart contents
  async getCart(req, res) {
    try {
      // Get user cart with full product details (don't limit fields)
      const user = await User.findById(req.user._id)
        .populate({
          path: 'cart.product'
        });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Format cart items to include necessary details
      const formattedCart = user.cart.filter(item => item.product != null).map(item => {
        const product = item.product;
        
        // Get the first image from colorVariants if available
        let imageUrl = null;
        if (product && product.colorVariants && product.colorVariants.length > 0 && 
            product.colorVariants[0].images && product.colorVariants[0].images.length > 0) {
          imageUrl = product.colorVariants[0].images[0].url;
        }
        
        // The product details page returns the complete product with all fields
        // So we will do the same - pass through the product exactly as is
        // This ensures consistency between product details and cart
        const productData = product && product.toObject ? product.toObject() : {...product};
        
        // Add image separately since it's extracted from colorVariants
        productData.image = imageUrl;
        
        // Calculate the display price based on what's available
        const displayPrice = 
          product && product.basePrice !== undefined ? product.basePrice : 
          product && product.price !== undefined ? product.price : 
          product && product.salePrice !== undefined ? product.salePrice : 29.99;
        
        return {
          _id: item._id,
          product: productData,
          quantity: item.quantity,
          subtotal: item.quantity * displayPrice
        };
      });
      
      // Calculate cart total
      const cartTotal = formattedCart.reduce((total, item) => {
        return total + item.subtotal;
      }, 0);
      
      res.json({
        items: formattedCart,
        totalItems: formattedCart.length,
        cartTotal: cartTotal
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Forgot Password
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate reset token
      const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      
      // Send reset email using nodemailer
      // ... email sending logic ...

      res.json({ message: 'Password reset link sent to email' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Reset Password
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      user.password = newPassword;
      await user.save();

      res.json({ message: 'Password successfully reset' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Verify Email
  async verifyEmail(req, res) {
    try {
      const { token } = req.body;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      user.isEmailVerified = true;
      await user.save();

      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Resend Verification Email
  async resendVerification(req, res) {
    try {
      const user = await User.findById(req.user._id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({ error: 'Email already verified' });
      }

      // Generate verification token
      const verificationToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Here you would typically send the verification email
      // ... email sending logic ...

      res.json({ message: 'Verification email sent successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = userController; 