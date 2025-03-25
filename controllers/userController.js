const User = require('../src/models/User');

const userController = {
  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user.userId).select('-password');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { firstName, lastName } = req.body;
      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { firstName, lastName },
        { new: true }
      ).select('-password');
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const users = await User.find().select('-password');
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = userController; 