require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../modules/auth/models/User');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is undefined in .env');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedSuperAdmin = async () => {
  try {
    await connectDB();

    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    if (!email || !password) {
      console.error('❌ Please define SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in your .env file.');
      process.exit(1);
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log(`✅ User with email ${email} already exists!`);
      
      // Ensure they have the super admin role
      if (!existingUser.roles.includes('super_admin')) {
        existingUser.roles.push('super_admin');
        await existingUser.save();
        console.log(`🆙 Upgraded existing user ${email} to super_admin.`);
      } else {
        console.log(`👉 This user is already a super_admin. Nothing to change.`);
      }
      process.exit(0);
    }

    // Create the Super Admin
    const superAdmin = new User({
      name: 'Super Admin',
      email: email,
      password: password,
      roles: ['super_admin'],
      permissions: ['*'], // Grants all permissions explicitly
      isActive: true,
    });

    await superAdmin.save();
    console.log(`🚀 Super Admin user successfully created for email: ${email}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding Super Admin:', error);
    process.exit(1);
  }
};

seedSuperAdmin();
