const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  activity: {
    type: String,
    required: true
  },
  details: mongoose.Schema.Types.Mixed,
  ip: String,
  userAgent: String
}, {
  timestamps: true
});

const UserActivity = mongoose.model('UserActivity', userActivitySchema);
module.exports = UserActivity; 