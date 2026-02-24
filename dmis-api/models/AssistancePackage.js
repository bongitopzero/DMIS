import mongoose from 'mongoose';

/**
 * AssistancePackage Schema
 * Defines predefined assistance packages with fixed unit costs
 */
const assistancePackageSchema = new mongoose.Schema(
  {
    packageId: {
      type: String,
      required: [true, 'Package ID is required'],
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Package name is required'],
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    unitCost: {
      type: Number,
      required: [true, 'Unit cost is required'],
      min: 0,
    },
    category: {
      type: String,
      enum: [
        'Food & Water',
        'Shelter',
        'Reconstruction',
        'Livelihood',
        'Health',
        'Education',
        'Community',
        'Cash Transfer',
      ],
      required: true,
      index: true,
    },
    applicableDisasters: {
      type: [String],
      enum: ['Heavy Rainfall', 'Strong Winds', 'Drought', 'All'],
      required: true,
    },
    allocationRules: {
      scoreLevelMin: { type: Number, required: true, min: 0 },
      scoreLevelMax: { type: Number, required: true, min: 0 },
    },
    quantityUnit: {
      type: String,
      default: 'Unit', // e.g., "Pack", "Kit", "Tank", "Unit"
    },
    isActive: {
      type: Boolean,
      default: true,
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
    collection: 'assistance_packages',
  }
);

export default mongoose.model('AssistancePackage', assistancePackageSchema);
