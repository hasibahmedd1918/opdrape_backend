const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function createAdminUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/opdrape');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@opdrape.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@opdrape.com',
      password: 'admin123456',
      role: 'admin',
      isEmailVerified: true
    });

    await adminUser.save();
    console.log('Admin user created successfully with:');
    console.log('Email: admin@opdrape.com');
    console.log('Password: admin123456');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser(); 