const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] // Add more sizes as needed
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  }
});

const colorVariantSchema = new mongoose.Schema({
  color: {
    name: {
      type: String,
      required: true
    },
    hexCode: {
      type: String,
      required: true,
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide valid hex color']
    }
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: String
  }],
  sizes: [sizeSchema]
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['men', 'women', 'kids', 'accessories']
  },
  subCategory: {
    type: String,
    required: true,
    enum: [
      't-shirts', 'shirts', 'pants', 'jeans', 'dresses', 
      'skirts', 'jackets', 'sweaters', 'hoodies', 'shorts',
      'activewear', 'underwear', 'socks', 'accessories'
    ]
  },
  brand: {
    type: String,
    required: true
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  salePrice: {
    type: Number,
    min: 0
  },
  colorVariants: [colorVariantSchema],
  features: [{
    type: String
  }],
  material: {
    type: String,
    required: true
  },
  careInstructions: [{
    type: String
  }],
  tags: [{
    type: String
  }],
  ratings: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      review: {
        type: String,
        required: true
      },
      images: [String],
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      featured: {
        type: Boolean,
        default: false
      },
      adminResponse: {
        type: String,
        default: ''
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  averageRating: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  displayPage: {
    type: String,
    enum: ['home', 'featured', 'new-arrivals', 'best-sellers', 'sale', null],
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    isNewArrival: {
      type: Boolean,
      default: false
    },
    isBestSeller: {
      type: Boolean,
      default: false
    },
    isSale: {
      type: Boolean,
      default: false
    },
    salePercentage: {
      type: Number,
      min: 0,
      max: 100
    }
  }
}, {
  timestamps: true
});

// Calculate average rating before saving
productSchema.pre('save', function(next) {
  if (this.ratings.length > 0) {
    this.averageRating = this.ratings.reduce((acc, item) => acc + item.rating, 0) / this.ratings.length;
    this.totalReviews = this.ratings.length;
  }
  next();
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product; 