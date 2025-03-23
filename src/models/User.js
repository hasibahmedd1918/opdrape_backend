const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  phone: {
    type: String,
    trim: true
  },
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  cart: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      default: 1
    }
  }],
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  role: {
    type: String,
    enum: ['user', 'admin', 'vendor'],
    default: 'user'
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  deletedAt: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  const user = this;
  
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 10);
  }
  
  next();
});

// Add method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Add indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

userSchema.methods.getCartTotal = async function() {
  await this.populate('cart.product');
  return this.cart.reduce((total, item) => {
    // Use the first available price field
    const effectivePrice = item.product.salePrice || item.product.price || item.product.basePrice || 0;
    return total + (effectivePrice * item.quantity);
  }, 0);
};

const User = mongoose.model('User', userSchema);
module.exports = User; 