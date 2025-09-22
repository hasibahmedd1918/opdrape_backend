const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    colorVariant: {
      color: {
        name: String,
        hexCode: String
      },
      images: [{
        url: String,
        alt: String
      }]
    },
    size: {
      name: {
        type: String,
        enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      }
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['credit_card', 'debit_card', 'paypal', 'cod', 'bkash', 'nagad']
  },
  paymentDetails: {
    paymentNumber: {
      type: String,
      // Required if payment method is bkash or nagad
      validate: {
        validator: function(v) {
          // Only required for mobile payment methods
          return !['bkash', 'nagad'].includes(this.paymentMethod) || (v && v.length > 0);
        },
        message: 'Payment number is required for bKash and Nagad payments'
      }
    },
    transactionId: {
      type: String,
      // Required if payment method is bkash or nagad
      validate: {
        validator: function(v) {
          // Only required for mobile payment methods
          return !['bkash', 'nagad'].includes(this.paymentMethod) || (v && v.length > 0);
        },
        message: 'Transaction ID is required for bKash and Nagad payments'
      }
    },
    // Store any additional payment-related information
    cardLastFour: String,
    cardType: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  trackingNumber: String,
  notes: String,
  deletedAt: Date
}, {
  timestamps: true
});

// Add indexes for better query performance
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order; 