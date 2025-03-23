const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'closed'],
    default: 'new'
  },
  reply: {
    type: String,
    trim: true
  },
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  repliedAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['general', 'order', 'product', 'payment', 'shipping', 'other'],
    default: 'general'
  },
  orderReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  deletedAt: Date
}, {
  timestamps: true
});

// Add indexes for better query performance
messageSchema.index({ user: 1 });
messageSchema.index({ status: 1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 