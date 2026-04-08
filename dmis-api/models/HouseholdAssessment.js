import mongoose from 'mongoose';

const householdAssessmentSchema = new mongoose.Schema({
  disasterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Disaster',
    required: true
  },
  householdId: {
    type: String,
    required: true
  },
  headOfHousehold: {
    name: String,
    age: Number,
    gender: String
  },
  householdSize: Number,
  childrenUnder5: Number,
  monthlyIncome: Number,
  incomeCategory: String,
  disasterType: String,
  damageDescription: String,
  damageSeverityLevel: Number,
  assessedBy: String
}, {
  timestamps: true
});

export default mongoose.model('HouseholdAssessment', householdAssessmentSchema);

