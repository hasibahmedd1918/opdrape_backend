const mongoose = require('mongoose');

const adminActivitySchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete', 'view', 'other']
  },
  entityType: {
    type: String,
    required: true,
    enum: ['product', 'order', 'user', 'promotion', 'category', 'message', 'other']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  details: {
    before: Object,
    after: Object,
    changes: Object,
    metadata: Object
  },
  ip: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
adminActivitySchema.index({ admin: 1 });
adminActivitySchema.index({ entityType: 1 });
adminActivitySchema.index({ createdAt: -1 });

const AdminActivity = mongoose.model('AdminActivity', adminActivitySchema);

module.exports = AdminActivity; 