import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dmis';

(async () => {
  try {
    await mongoose.connect(mongoURI);
    const db = mongoose.connection.getClient().db('dmis');
    
    const result1 = await db.collection('aid_allocation_requests').deleteMany({});
    console.log(`✅ Deleted ${result1.deletedCount} allocation requests`);

    const result2 = await db.collection('allocation_plans').deleteMany({});
    console.log(`✅ Deleted ${result2.deletedCount} allocation plans`);

    await mongoose.disconnect();
    console.log('✅ All old allocations cleared! Refresh your browser and try a new allocation.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
