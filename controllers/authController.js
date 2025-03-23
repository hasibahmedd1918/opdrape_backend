const User = require('../models/User');
const jwt = require('jsonwebtoken');

const authController = {
  register: async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Create new user
      user = new User({
        email,
        password,
        firstName,
        lastName
      });

      await user.save();

      // Create JWT token
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      res.status(201).json({ token });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Create JWT token
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      res.json({ token });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = authController; 