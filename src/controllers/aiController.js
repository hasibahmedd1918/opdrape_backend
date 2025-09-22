const { GoogleGenerativeAI } = require('@google/generative-ai');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Category = require('../models/Category');
const Promotion = require('../models/Promotion');
const User = require('../models/User');

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

// Helper functions to fetch relevant data
const getRelevantData = async (message, userId) => {
  const data = {
    products: [],
    categories: [],
    promotions: [],
    userOrders: [],
    bestSellers: [],
    newArrivals: [],
    saleItems: []
  };

  try {
    // Get categories
    data.categories = await Category.find({ isActive: true }).select('name description slug').limit(10);

    // Get active promotions
    data.promotions = await Promotion.find({ 
      isActive: true, 
      startDate: { $lte: new Date() }, 
      endDate: { $gte: new Date() } 
    }).select('name code description type value').limit(5);

    // Get best sellers
    data.bestSellers = await Product.find({ 
      isActive: true, 
      'metadata.isBestSeller': true 
    }).select('name description basePrice salePrice category subCategory averageRating totalReviews').limit(5);

    // Get new arrivals
    data.newArrivals = await Product.find({ 
      isActive: true, 
      'metadata.isNewArrival': true 
    }).select('name description basePrice salePrice category subCategory').limit(5);

    // Get sale items
    data.saleItems = await Product.find({ 
      isActive: true, 
      'metadata.isSale': true 
    }).select('name description basePrice salePrice category subCategory metadata.salePercentage').limit(5);

    // Get user's recent orders if userId is provided
    if (userId) {
      data.userOrders = await Order.find({ user: userId })
        .populate('items.product', 'name basePrice salePrice')
        .sort({ createdAt: -1 })
        .limit(3)
        .select('status totalAmount createdAt items');
    }

    // Search for products based on message keywords
    const keywords = message.toLowerCase().split(' ').filter(word => word.length > 2);
    if (keywords.length > 0) {
      const searchQuery = {
        isActive: true,
        $or: [
          { name: { $regex: keywords.join('|'), $options: 'i' } },
          { description: { $regex: keywords.join('|'), $options: 'i' } },
          { category: { $regex: keywords.join('|'), $options: 'i' } },
          { subCategory: { $regex: keywords.join('|'), $options: 'i' } },
          { tags: { $in: keywords } }
        ]
      };
      
      data.products = await Product.find(searchQuery)
        .select('name description basePrice salePrice category subCategory averageRating totalReviews colorVariants')
        .limit(8);
    }

  } catch (error) {
    console.error('Error fetching data for AI:', error);
  }

  return data;
};

const formatDataForAI = (data) => {
  let context = "OPDRAPE E-COMMERCE STORE INFORMATION:\n\n";
  
  // Categories
  if (data.categories.length > 0) {
    context += "AVAILABLE CATEGORIES:\n";
    data.categories.forEach(cat => {
      if (cat && cat.name) {
        context += `- ${cat.name}: ${cat.description || 'No description'}\n`;
      }
    });
    context += "\n";
  }

  // Best Sellers
  if (data.bestSellers.length > 0) {
    context += "BEST SELLING PRODUCTS:\n";
    data.bestSellers.forEach(product => {
      if (product && product.name) {
        const price = product.salePrice || product.basePrice;
        const rating = product.averageRating ? ` (${product.averageRating.toFixed(1)}★, ${product.totalReviews} reviews)` : '';
        context += `- ${product.name}: $${price} - ${product.category}/${product.subCategory}${rating}\n`;
      }
    });
    context += "\n";
  }

  // New Arrivals
  if (data.newArrivals.length > 0) {
    context += "NEW ARRIVALS:\n";
    data.newArrivals.forEach(product => {
      if (product && product.name) {
        const price = product.salePrice || product.basePrice;
        context += `- ${product.name}: $${price} - ${product.category}/${product.subCategory}\n`;
      }
    });
    context += "\n";
  }

  // Sale Items
  if (data.saleItems.length > 0) {
    context += "CURRENT SALE ITEMS:\n";
    data.saleItems.forEach(product => {
      if (product && product.name) {
        const discount = product.metadata?.salePercentage ? ` (${product.metadata.salePercentage}% OFF)` : '';
        const originalPrice = product.basePrice;
        const salePrice = product.salePrice || product.basePrice;
        context += `- ${product.name}: $${salePrice} (was $${originalPrice})${discount} - ${product.category}/${product.subCategory}\n`;
      }
    });
    context += "\n";
  }

  // Active Promotions
  if (data.promotions.length > 0) {
    context += "ACTIVE PROMOTIONS:\n";
    data.promotions.forEach(promo => {
      let promoText = `- ${promo.name} (Code: ${promo.code}): `;
      if (promo.type === 'percentage') {
        promoText += `${promo.value}% off`;
      } else if (promo.type === 'fixed_amount') {
        promoText += `$${promo.value} off`;
      } else if (promo.type === 'free_shipping') {
        promoText += 'Free shipping';
      }
      if (promo.minimumPurchase > 0) {
        promoText += ` (min purchase: $${promo.minimumPurchase})`;
      }
      context += promoText + "\n";
    });
    context += "\n";
  }

  // User's Recent Orders
  if (data.userOrders.length > 0) {
    context += "USER'S RECENT ORDERS:\n";
    data.userOrders.forEach(order => {
      context += `- Order #${order._id.toString().slice(-6)}: $${order.totalAmount} - Status: ${order.status} - ${order.createdAt.toDateString()}\n`;
      order.items.forEach(item => {
        if (item.product && item.product.name) {
          context += `  * ${item.product.name} (Qty: ${item.quantity})\n`;
        } else {
          context += `  * Product ID: ${item.product} (Qty: ${item.quantity})\n`;
        }
      });
    });
    context += "\n";
  }

  // Search Results
  if (data.products.length > 0) {
    context += "RELEVANT PRODUCTS:\n";
    data.products.forEach(product => {
      if (product && product.name) {
        const price = product.salePrice || product.basePrice;
        const rating = product.averageRating ? ` (${product.averageRating.toFixed(1)}★, ${product.totalReviews} reviews)` : '';
        const colors = product.colorVariants?.map(cv => cv.color?.name).filter(Boolean).join(', ') || '';
        context += `- ${product.name}: $${price} - ${product.category}/${product.subCategory}${rating}\n`;
        if (colors) context += `  Colors: ${colors}\n`;
        if (product.description) {
          context += `  Description: ${product.description.substring(0, 100)}...\n`;
        }
      }
    });
    context += "\n";
  }

  context += "STORE POLICIES:\n";
  context += "- Free shipping on orders over $50\n";
  context += "- 30-day return policy\n";
  context += "- International shipping available\n";
  context += "- Multiple payment methods: Credit/Debit cards, PayPal, bKash, Nagad\n";
  context += "- Customer support available 24/7\n\n";

  context += "INSTRUCTIONS: Use this information to provide accurate, helpful responses about our products, services, and policies. Always be friendly and professional. If asked about specific products, provide details from the information above. If a customer asks about their orders, reference their recent order history if available.\n\n";

  return context;
};

const aiController = {
  // Send a message to AI and get response
  sendMessage: async (req, res) => {
    try {
      const { message, conversationHistory = [] } = req.body;
      const userId = req.user._id;

      // Validate input
      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message is required and cannot be empty'
        });
      }

      // Check if message is too long
      if (message.length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'Message is too long. Please keep it under 2000 characters'
        });
      }

      // Fetch relevant data from database
      let relevantData, dataContext;
      try {
        relevantData = await getRelevantData(message, userId);
        dataContext = formatDataForAI(relevantData);
      } catch (dbError) {
        console.error('Database error in AI controller:', dbError);
        // Continue without database data if there's an error
        relevantData = { products: [], categories: [], promotions: [], userOrders: [], bestSellers: [], newArrivals: [], saleItems: [] };
        dataContext = "OPDRAPE E-COMMERCE STORE INFORMATION:\n\nSTORE POLICIES:\n- Free shipping on orders over $50\n- 30-day return policy\n- International shipping available\n- Multiple payment methods: Credit/Debit cards, PayPal, bKash, Nagad\n- Customer support available 24/7\n\nINSTRUCTIONS: Provide helpful responses about our products and services. Always be friendly and professional.\n\n";
      }

      // Get the generative model
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Prepare conversation context
      let conversationContext = '';
      if (conversationHistory && conversationHistory.length > 0) {
        conversationContext = conversationHistory
          .slice(-10) // Keep only last 10 messages for context
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n') + '\n';
      }

      // Create the full prompt with database context
      const fullPrompt = `${dataContext}${conversationContext}User: ${message}\nAI:`;

      // Generate content
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const aiResponse = response.text();

      // Log the interaction (optional - for analytics)
      console.log(`AI Chat - User: ${userId}, Message: ${message.substring(0, 100)}...`);

      res.json({
        success: true,
        data: {
          message: aiResponse,
          timestamp: new Date().toISOString(),
          conversationId: `conv_${userId}_${Date.now()}`,
          dataUsed: {
            productsFound: relevantData.products.length,
            categoriesFound: relevantData.categories.length,
            promotionsFound: relevantData.promotions.length,
            userOrdersFound: relevantData.userOrders.length
          }
        }
      });

    } catch (error) {
      console.error('AI Chat Error:', error);
      
      // Handle specific Gemini API errors
      if (error.message.includes('API key')) {
        return res.status(500).json({
          success: false,
          message: 'AI service configuration error. Please contact support.'
        });
      }

      if (error.message.includes('quota') || error.message.includes('limit')) {
        return res.status(429).json({
          success: false,
          message: 'AI service is temporarily unavailable due to high usage. Please try again later.'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to process your message. Please try again.'
      });
    }
  },

  // Get AI suggestions for common queries
  getSuggestions: async (req, res) => {
    try {
      const userId = req.user._id;
      
      // Get some basic data for dynamic suggestions
      let categories = [], bestSellers = [], newArrivals = [], userOrders = 0;
      try {
        [categories, bestSellers, newArrivals, userOrders] = await Promise.all([
          Category.find({ isActive: true }).select('name').limit(5),
          Product.find({ isActive: true, 'metadata.isBestSeller': true }).select('name').limit(3),
          Product.find({ isActive: true, 'metadata.isNewArrival': true }).select('name').limit(3),
          userId ? Order.find({ user: userId }).countDocuments() : 0
        ]);
      } catch (dbError) {
        console.error('Database error in suggestions:', dbError);
        // Continue with empty arrays if database error
      }

      const suggestions = [
        "What are your best-selling products?",
        "Show me new arrivals",
        "What categories do you have?",
        "How can I track my order?",
        "What is your return policy?",
        "Do you offer international shipping?",
        "What payment methods do you accept?",
        "How long does shipping take?"
      ];

      // Add dynamic suggestions based on available data
      if (categories.length > 0) {
        suggestions.push(`Show me ${categories[0].name.toLowerCase()} products`);
      }
      
      if (bestSellers.length > 0) {
        suggestions.push(`Tell me about ${bestSellers[0].name}`);
      }
      
      if (newArrivals.length > 0) {
        suggestions.push(`What's new in ${newArrivals[0].name}?`);
      }

      if (userOrders > 0) {
        suggestions.push("Show me my recent orders");
      }

      res.json({
        success: true,
        data: {
          suggestions: suggestions.slice(0, 10), // Limit to 10 suggestions
          timestamp: new Date().toISOString(),
          dynamicData: {
            categoriesAvailable: categories.length,
            bestSellersAvailable: bestSellers.length,
            newArrivalsAvailable: newArrivals.length,
            userHasOrders: userOrders > 0
          }
        }
      });

    } catch (error) {
      console.error('AI Suggestions Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get suggestions'
      });
    }
  },

  // Health check for AI service
  healthCheck: async (req, res) => {
    try {
      // Test the AI service with a simple query
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent("Hello");
      const response = await result.response;
      
      res.json({
        success: true,
        data: {
          status: 'AI service is operational',
          timestamp: new Date().toISOString(),
          apiKeyConfigured: !!process.env.GOOGLE_GEMINI_API_KEY
        }
      });

    } catch (error) {
      console.error('AI Health Check Error:', error);
      res.status(500).json({
        success: false,
        data: {
          status: 'AI service is not available',
          timestamp: new Date().toISOString(),
          error: error.message
        }
      });
    }
  }
};

module.exports = aiController;