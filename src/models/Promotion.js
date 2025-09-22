const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  minimumPurchase: {
    type: Number,
    default: 0
  },
  maximumDiscount: {
    type: Number,
    default: null
  },
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  applicableCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  usageLimit: {
    type: Number,
    default: null
  },
  usageCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deletedAt: Date
}, {
  timestamps: true
});

// Add indexes for better query performance
promotionSchema.index({ code: 1 });
promotionSchema.index({ startDate: 1, endDate: 1 });
promotionSchema.index({ isActive: 1 });

const Promotion = mongoose.model('Promotion', promotionSchema);

module.exports = Promotion; 