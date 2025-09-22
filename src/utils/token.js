const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id,
      role: user.role 
    }, 
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

module.exports = generateToken; 