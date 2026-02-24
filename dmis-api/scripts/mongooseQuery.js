import mongoose from 'mongoose';
import 'dotenv/config';
import HouseholdAssessment from '../models/HouseholdAssessment.js';

async function mongooseQuery() {
  try {
    if (!process.env.MONGO_URI) {
      await mongoose.connect('mongodb://localhost:27017/dmis');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }
    
    const disasterId = new mongoose.Types.ObjectId('699c870bfe1ce6d8e356b1d0');
    
    console.log('🔍 Direct Mongoose Query\n');
    console.log(`Querying for disasterId: ${disasterId}\n`);

    // Query with Mongoose model
    const assessments = await HouseholdAssessment.find({ disasterId })
      .sort({ assessmentDate: -1 })
      .lean();

    console.log(`Result count: ${assessments.length}\n`);

    assessments.slice(0, 5).forEach((h, idx) => {
      console.log(`${idx + 1}. ${h.headOfHousehold?.name} - ID: ${h._id}`);
    });

    if (assessments.length > 5) {
      console.log(`... and ${assessments.length - 5} more`);
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

mongooseQuery();
