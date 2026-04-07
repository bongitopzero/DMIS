import mongoose from 'mongoose';

/**
 * HouseholdAssessment Schema
 * Records detailed household data for disaster aid allocation
 * Fields match exactly what the frontend sends
 */
const householdAssessmentSchema = new mongoose.Schema(
  {
    // Required fields from frontend
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
    
    // Head of Household Information
    headOfHousehold: {
      name: { 
        type: String, 
        required: [true, 'Head of household name is required'] 
      },
      age: { 
        type: Number, 
        required: [true, 'Age is required'],
        min: [1, 'Age must be at least 1']
      },
      gender: { 
        type: String, 
        enum: ['Male', 'Female', 'Other'], 
        required: [true, 'Gender is required']
      },
    },
    
    // Household Details
    householdSize: {
      type: Number,
      required: [true, 'Household size is required'],
      min: [1, 'Household size must be at least 1'],
    },
    childrenUnder5: {
      type: Number,
      default: null,
      min: [0, 'Children under 5 cannot be negative'],
    },
    
    // Income Information
    monthlyIncome: {
      type: Number,
      required: [true, 'Monthly income is required'],
      min: [0, 'Monthly income cannot be negative'],
    },
    incomeCategory: {
      type: String,
      enum: {
        values: ['Low', 'Middle', 'High'],
        message: 'Income category must be Low, Middle, or High'
      },
      required: [true, 'Income category is required'],
    },
    
    // Disaster Information
    disasterType: {
      type: String,
      enum: {
        values: ['Heavy Rainfall', 'Strong Winds', 'Drought'],
        message: 'Disaster type must be Heavy Rainfall, Strong Winds, or Drought'
      },
      required: [true, 'Disaster type is required'],
    },
    damageDescription: {
      type: String,
      default: null,
      maxlength: [1000, 'Damage description cannot exceed 1000 characters'],
    },
    damageSeverityLevel: {
      type: Number,
      default: null,
      min: [1, 'Damage severity level must be at least 1'],
      max: [4, 'Damage severity level cannot exceed 4']
    },
    
    // Detailed Damage Assessment (Optional)
    damageDetails: {
      roofDamage: { 
        type: String, 
        default: null 
      },
      cropLossPercentage: { 
        type: Number, 
        default: null,
        min: [0, 'Crop loss cannot be negative'],
        max: [100, 'Crop loss cannot exceed 100%']
      },
      livestockLoss: { 
        type: Number, 
        default: null,
        min: [0, 'Livestock loss cannot be negative']
      },
      roomsAffected: { 
        type: Number, 
        default: null,
        min: [0, 'Rooms affected cannot be negative']
      },
      waterAccessImpacted: { 
        type: Boolean, 
        default: null 
      },
    },
    
    // Assessment Details
    recommendedAssistance: {
      type: String,
      default: null,
      maxlength: [500, 'Recommended assistance cannot exceed 500 characters'],
    },
    assessmentDate: {
      type: Date,
      default: Date.now,
    },
    assessedBy: {
      type: String,
      required: [true, 'Assessor name/ID is required'],
    },
    
    // Location Information
    location: {
      village: { 
        type: String,
        required: [true, 'Village is required']
      },
      district: { 
        type: String,
        required: [true, 'District is required']
      },
    },
    
    // Status and Metadata
    status: {
      type: String,
      enum: {
        values: ['Pending Review', 'Approved', 'Rejected', 'Allocated', 'Disbursed'],
        message: 'Invalid status'
      },
      default: 'Pending Review',
      index: true,
    },
    notes: {
      type: String,
      default: null,
    },
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
