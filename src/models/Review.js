const mongoose = require('mongoose');

const reviewImageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: 'Product review image'
  }
});

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
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
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  review: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  images: [reviewImageSchema],
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
    trim: true,
    maxlength: 500
  },
  verified: {
    type: Boolean,
    default: false
  },
  votesHelpful: {
    type: Number,
    default: 0
  },
  votesUnhelpful: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Compound index to ensure a user can only review a product once
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review; 