import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dmis';

(async () => {
  try {
    await mongoose.connect(mongoURI);
    const db = mongoose.connection.getClient().db('dmis');
    const collections = await db.listCollections().toArray();
    
    console.log('Collections in database:');
    collections.forEach(col => console.log('  -', col.name));
    
    // Try to find any allocation-related collections
    const allocationRelated = collections.filter(c => 
      c.name.toLowerCase().includes('alloc') || 
      c.name.toLowerCase().includes('request')
    );
    
    console.log('\nAllocation-related collections:');
    if (allocationRelated.length === 0) {
      console.log('  (none found)');
    } else {
      for (const col of allocationRelated) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`  - ${col.name} (${count} documents)`);
      }
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
