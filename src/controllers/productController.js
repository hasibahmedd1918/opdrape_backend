const Product = require('../models/Product');

const productController = {
  // Get all products
  async getAllProducts(req, res) {
    try {
      const { page = 1, limit = 10, sort, category } = req.query;
      
      let query = {};
      if (category) {
        query.category = category;
      }

      const products = await Product.find(query)
        .sort(sort ? { [sort]: 1 } : { createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const count = await Product.countDocuments(query);

      res.json({
        products,
        totalPages: Math.ceil(count / limit),
        currentPage: page
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get product by ID
  async getProductById(req, res) {
    try {
      const product = await Product.findById(req.params._id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Create new product
  async createProduct(req, res) {
    try {
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
      
      const product = new Product(productData);
      
      // Set the creator if user is authenticated
      if (req.user) {
        product.createdBy = req.user._id;
      }
      
      await product.save();
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Update product
  async updateProduct(req, res) {
    try {
      const product = await Product.findByIdAndUpdate(
        req.params._id,
        req.body,
        { new: true, runValidators: true }
      );
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      // Set the updater if user is authenticated
      if (req.user) {
        product.updatedBy = req.user._id;
        await product.save();
      }
      
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Delete product
  async deleteProduct(req, res) {
    try {
      const product = await Product.findByIdAndDelete(req.params._id);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get products by category
  async getProductsByCategory(req, res) {
    try {
      const { category } = req.params;
      const products = await Product.find({ category });
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Search products
  async searchProducts(req, res) {
    try {
      const { q, category, minPrice, maxPrice } = req.query;
      
      let query = {};
      
      if (q) {
        query.$or = [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { tags: { $in: [new RegExp(q, 'i')] } }
        ];
      }
      
      if (category) {
        query.category = category;
      }
      
      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseFloat(minPrice);
        if (maxPrice) query.price.$lte = parseFloat(maxPrice);
      }

      const products = await Product.find(query);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get product reviews
  async getProductReviews(req, res) {
    try {
      const product = await Product.findById(req.params._id)
        .populate({
          path: 'ratings.user',
          select: 'name email'
        })
        .select('ratings');

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Sort reviews by date (newest first)
      const sortedReviews = [...product.ratings].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );

      res.json({
        reviews: sortedReviews,
        totalReviews: product.ratings.length,
        averageRating: product.averageRating || 0
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Add a product review
  async addProductReview(req, res) {
    try {
      const { rating, review, images = [] } = req.body;
      const productId = req.params._id;
      
      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const reviewData = {
        user: req.user._id,
        rating,
        review: review || '',
        images,
        createdAt: new Date()
      };

      // Check if user already reviewed this product
      const existingReviewIndex = product.ratings.findIndex(
        r => r.user && r.user.toString() === req.user._id.toString()
      );

      let updateResult;
      
      if (existingReviewIndex >= 0) {
        // Update existing review using $set to avoid full document validation
        updateResult = await Product.updateOne(
          { 
            _id: productId,
            'ratings.user': req.user._id 
          },
          { 
            $set: { 
              [`ratings.${existingReviewIndex}`]: reviewData 
            } 
          }
        );
      } else {
        // Add new review using $push to avoid full document validation
        updateResult = await Product.updateOne(
          { _id: productId },
          { $push: { ratings: reviewData } }
        );
      }

      if (!updateResult.modifiedCount) {
        return res.status(400).json({ error: 'Failed to update review' });
      }

      // Recalculate average rating separately
      const updatedProduct = await Product.findById(productId);
      if (updatedProduct.ratings.length > 0) {
        const avgRating = updatedProduct.ratings.reduce((acc, item) => acc + item.rating, 0) / updatedProduct.ratings.length;
        await Product.updateOne(
          { _id: productId },
          { 
            $set: { 
              averageRating: avgRating,
              totalReviews: updatedProduct.ratings.length
            } 
          }
        );
      }

      res.status(201).json({
        message: existingReviewIndex >= 0 ? 'Review updated successfully' : 'Review added successfully',
        review: reviewData
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Delete a product review
  async deleteProductReview(req, res) {
    try {
      const productId = req.params._id;
      
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Find the review by the current user
      const reviewIndex = product.ratings.findIndex(
        r => r.user && r.user.toString() === req.user._id.toString()
      );

      if (reviewIndex === -1) {
        return res.status(404).json({ error: 'Review not found' });
      }

      // Remove the review using $pull operator to avoid full document validation
      await Product.updateOne(
        { _id: productId },
        { $pull: { ratings: { user: req.user._id } } }
      );

      // Recalculate average rating separately
      const updatedProduct = await Product.findById(productId);
      if (updatedProduct.ratings.length > 0) {
        const avgRating = updatedProduct.ratings.reduce((acc, item) => acc + item.rating, 0) / updatedProduct.ratings.length;
        await Product.updateOne(
          { _id: productId },
          { 
            $set: { 
              averageRating: avgRating,
              totalReviews: updatedProduct.ratings.length
            } 
          }
        );
      } else {
        // No ratings left
        await Product.updateOne(
          { _id: productId },
          { 
            $set: { 
              averageRating: 0,
              totalReviews: 0
            } 
          }
        );
      }

      res.json({ message: 'Review deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get related products
  async getRelatedProducts(req, res) {
    try {
      const productId = req.params._id;
      
      // Find the current product to get its attributes for finding related products
      const product = await Product.findById(productId);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      // Set up query to find products with similar attributes
      const query = {
        _id: { $ne: productId }, // Exclude current product
      };
      
      if (product.category) {
        query.category = product.category;
      }
      
      if (product.subCategory) {
        query.subCategory = product.subCategory;
      }
      
      // If product has tags, also match products that share at least one tag
      if (product.tags && product.tags.length > 0) {
        query.tags = { $in: product.tags };
      }
      
      // Find related products with limit and sort by relevance
      const relatedProducts = await Product.find(query)
        .limit(6); // Limit to 6 related products

      // Get the main product data to see how prices are structured
      const mainProduct = await Product.findById(productId).lean();
      let samplePricing = {};
      
      // Figure out which price fields are available in your product database
      if (mainProduct) {
        if (mainProduct.price) samplePricing.price = mainProduct.price;
        if (mainProduct.basePrice) samplePricing.basePrice = mainProduct.basePrice;
        if (mainProduct.salePrice) samplePricing.salePrice = mainProduct.salePrice;
      }
      
      // Transform the response with guaranteed price fields
      const formattedRelatedProducts = relatedProducts.map(product => {
        // Extract real price data from the product if available
        const productData = product.toObject ? product.toObject() : product;
        
        // Create pricing object based on whatever fields exist on the main product
        const pricing = {};
        
        if (samplePricing.price !== undefined) {
          pricing.price = productData.price || 29.99;
        }
        
        if (samplePricing.basePrice !== undefined) {
          pricing.basePrice = productData.basePrice || 39.99;
        }
        
        if (samplePricing.salePrice !== undefined) {
          pricing.salePrice = productData.salePrice || 29.99;
        }
        
        // If we found no pricing fields in the main product, use defaults
        if (Object.keys(pricing).length === 0) {
          pricing.price = 29.99;
          pricing.basePrice = 39.99;
          pricing.salePrice = 29.99;
        }
        
        // Create a clean object with just the fields we want
        return {
          _id: product._id,
          name: product.name,
          description: product.description,
          category: product.category,
          subCategory: product.subCategory,
          
          // Apply the pricing structure from the main product
          ...pricing,
          
          // Include first image from any possible structure
          image: (product.colorVariants && product.colorVariants[0]?.images?.length > 0)
                ? product.colorVariants[0].images[0].url 
                : (product.images && product.images.length > 0)
                ? product.images[0]
                : "https://via.placeholder.com/300x400?text=No+Image",
                
          // Rating information
          averageRating: product.averageRating || 0,
          totalReviews: product.totalReviews || 0
        };
      });
      
      res.json({
        relatedProducts: formattedRelatedProducts,
        count: formattedRelatedProducts.length
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get products by tag (for banner displays)
  async getProductsByTag(req, res) {
    try {
      const { tag } = req.params;
      
      if (!tag) {
        return res.status(400).json({ error: 'Tag parameter is required' });
      }
      
      // Find products that include this tag (case insensitive)
      const products = await Product.find({ 
        tags: { $regex: new RegExp(tag, 'i') } 
      });
      
      res.json(products);
    } catch (error) {
      console.error('Error fetching products by tag:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = productController; 