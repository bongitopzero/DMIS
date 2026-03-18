import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Disaster from '../models/Disaster.js';
import HouseholdAssessment from '../models/HouseholdAssessment.js';
import AidAllocationRequest from '../models/AidAllocationRequest.js';
import User from '../models/User.js';

dotenv.config();

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Find a user to attribute approvals/requests to
  let user = await User.findOne({ role: { $in: ['Coordinator', 'Administrator', 'Finance Officer'] } });
  if (!user) {
    // If no user exists, fallback to any user
    user = await User.findOne();
  }
  if (!user) {
    console.warn('No users found in DB; allocation requests will use a generated ObjectId for createdBy');
  }

  const reported = await Disaster.find({ status: 'reported' }).lean();
  console.log(`Found ${reported.length} reported disasters to verify`);

  for (const d of reported) {
    console.log(`Verifying disaster ${d._id} (${d.district})`);
    await Disaster.findByIdAndUpdate(d._id, { status: 'verified' });

    const assessments = await HouseholdAssessment.find({ disasterId: d._id }).lean();
    console.log(`  - Found ${assessments.length} assessments`);

    for (const a of assessments) {
      const compositeScore = randInt(3, 10);
      const aidTier = compositeScore >= 7 ? 'Priority Reconstruction + Livelihood (10+)' : (compositeScore >=4 ? 'Shelter + Food + Cash (4-6)' : 'Basic Support (0-3)');

      const alloc = new AidAllocationRequest({
        requestId: 'AL-' + Date.now() + '-' + Math.random().toString(36).slice(2,8).toUpperCase(),
        householdAssessmentId: a._id,
        disasterId: d._id,
        householdId: a.householdId || `HH-${String(randInt(1,999)).padStart(3,'0')}`,
        damageLevel: a.damageSeverityLevel || 2,
        vulnerabilityPoints: {},
        compositeScore,
        scoreBreakdown: { damageComponent: 1, vulnerabilityComponent: 1, totalVulnerability: 1 },
        aidTier,
        allocatedPackages: [ { packageId: 'PKG-1', packageName: 'Basic Shelter Kit', quantity: 1, unitCost: 1000, totalCost: 1000, category: 'Shelter' } ],
        totalEstimatedCost: 1000,
        status: 'Proposed',
        createdBy: user ? user._id : mongoose.Types.ObjectId(),
      });

      await alloc.save();
    }
  }

  console.log('Verification and allocation request creation complete');
  await mongoose.disconnect();
}

run().catch(err => { console.error('Error:', err); process.exit(1); });
