import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema({
  fiscalYear: {
    type: Number,
    required: true,
    unique: true
  },
  allocatedBudget: {
    type: Number,
    required: true,
    default: 82648374
  },
  committedFunds: {
    type: Number,
    default: 0
  },
  remainingBudget: {
    type: Number,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update remainingBudget before saving
budgetSchema.pre('save', function(next) {
  this.remainingBudget = this.allocatedBudget - this.committedFunds;
  this.updatedAt = Date.now();
  next();
});

const Budget = mongoose.model('Budget', budgetSchema);
export default Budget;