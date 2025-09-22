const User = require('../src/models/User');

const checkRole = (roles) => async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = checkRole; 