import mongoose from 'mongoose';
import User from './models/User.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const testUsers = [
      {
        name: 'DMA Coordinator',
        email: 'coordinator@dmis.com',
        password: 'coordinator123',
        role: 'Coordinator'
      },
      {
        name: 'Finance Officer',
        email: 'finance@dmis.com',
        password: 'finance123',
        role: 'Finance Officer'
      },
      {
        name: 'Data Clerk',
        email: 'clerk@dmis.com',
        password: 'clerk123',
        role: 'Data Clerk'
      },
      {
        name: 'System Administrator',
        email: 'admin@dmis.com',
        password: 'admin123',
        role: 'Administrator'
      }
    ];

    const salt = await bcrypt.genSalt(10);
    let created = 0;
    let updated = 0;

    for (const userData of testUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        // Update existing user
        await User.findOneAndUpdate(
          { email: userData.email },
          { 
            name: userData.name,
            password: hashedPassword,
            role: userData.role 
          }
        );
        console.log(`✏️  Updated: ${userData.email}`);
        updated++;
      } else {
        // Create new user
        await User.create({
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role
        });
        console.log(`✅ Created: ${userData.email}`);
        created++;
      }
    }
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Created: ${created}, Updated: ${updated}`);
    
    // Show all test users
    console.log(`\n=== ALL TEST USERS ===`);
    const users = await User.find({ email: { $in: ['coordinator@dmis.com', 'finance@dmis.com', 'clerk@dmis.com', 'admin@dmis.com'] } }).select('name email role');
    users.forEach(u => console.log(`${u.email} (${u.role})`));
    
    process.exit(0);
  } catch(err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
