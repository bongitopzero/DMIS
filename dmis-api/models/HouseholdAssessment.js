import mongoose from 'mongoose';

/**
 * HouseholdAssessment Schema
 * Records detailed household data for disaster aid allocation
 */
const householdAssessmentSchema = new mongoose.Schema(
  {
    disasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Disaster',
      required: [true, 'Disaster ID is required'],
      index: true,
    },
    householdId: {
      type: String,
      required: [true, 'Household ID is required'],
      index: true,
    },
    headOfHousehold: {
      name: { type: String, required: true },
      age: { type: Number, required: true, min: 18 },
      gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    },
    householdSize: {
      type: Number,
      required: [true, 'Household size is required'],
      min: 1,
    },
    childrenUnder5: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    monthlyIncome: {
      type: Number,
      required: [true, 'Monthly income is required'],
      min: 0,
    },
    incomeCategory: {
      type: String,
      enum: ['Low', 'Middle', 'High'],
      required: true,
    },
    disasterType: {
      type: String,
      enum: ['Heavy Rainfall', 'Strong Winds', 'Drought'],
      required: [true, 'Disaster type is required'],
    },
    damageDescription: {
      type: String,
      required: [true, 'Damage description is required'],
      maxlength: 1000,
    },
    damageSeverityLevel: {
      type: Number,
      enum: [1, 2, 3, 4],
      required: [true, 'Damage severity level (1-4) is required'],
    },
    damageDetails: {
      roofDamage: { type: String, default: 'None' }, // For wind
      cropLossPercentage: { type: Number, default: 0, min: 0, max: 100 }, // For rainfall/drought
      livestockLoss: { type: Number, default: 0, min: 0 }, // Number of livestock
      roomsAffected: { type: Number, default: 0, min: 0 }, // For rainfall
      waterAccessImpacted: { type: Boolean, default: false }, // For drought
    },
    recommendedAssistance: {
      type: String,
      maxlength: 500,
    },
    assessmentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    assessedBy: {
      type: String,
      required: [true, 'Assessor name/ID is required'],
    },
    location: {
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
      village: String,
      district: String,
    },
    status: {
      type: String,
      enum: ['Pending Review', 'Approved', 'Rejected', 'Allocated', 'Disbursed'],
      default: 'Pending Review',
      index: true,
    },
    notes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    collection: 'household_assessments',
  }
);

// Index for finding assessments by disaster and status
householdAssessmentSchema.index({ disasterId: 1, status: 1 });

export default mongoose.model('HouseholdAssessment', householdAssessmentSchema);
