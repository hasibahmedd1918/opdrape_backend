const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  colorVariant: {
    color: {
      name: {
        type: String,
        required: true
      },
      hexCode: {
        type: String,
        required: true
      }
    },
    images: [{
      url: {
        type: String,
        required: true
      },
      alt: String
    }]
  },
  size: {
    name: {
      type: String,
      required: true,
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  },
  price: {
    type: Number,
    required: true
  }
}, { timestamps: true });

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  totalItems: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Pre-save middleware to calculate totals
cartSchema.pre('save', function(next) {
  this.totalItems = this.items.reduce((total, item) => total + item.size.quantity, 0);
  this.totalAmount = this.items.reduce((total, item) => total + (item.price * item.size.quantity), 0);
  next();
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart; 