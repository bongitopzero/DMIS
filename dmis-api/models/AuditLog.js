import mongoose from 'mongoose';

/**
 * AuditLog Schema
 * Immutable audit trail for all financial transactions
 * 
 * Purpose:
 * - Track every CREATE, UPDATE, APPROVE, VOID action
 * - Store before/after values
 * - Maintain accountability
 * - Enable compliance audits
 */
const AuditLogSchema = new mongoose.Schema(
  {
    actionType: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'VOID', 'RESTORE'],
      required: [true, 'Action type is required'],
      index: true,
    },
    entityType: {
      type: String,
      enum: ['Budget', 'Expense'],
      required: [true, 'Entity type is required'],
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
      index: true,
    },
    disasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Disaster',
      required: [true, 'Disaster ID is required'],
      index: true,
    },
    performedBy: {
      type: String,
      required: [true, 'Performer ID is required'],
    },
    performerRole: {
      type: String,
      enum: ['Admin', 'Finance Officer', 'Coordinator', 'Data Clerk'],
      default: 'Data Clerk',
    },
    oldValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    changes: {
      type: [
        {
          fieldName: String,
          oldValue: mongoose.Schema.Types.Mixed,
          newValue: mongoose.Schema.Types.Mixed,
        }
      ],
      default: [],
    },
    reason: {
      type: String,
      maxlength: 500,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['Success', 'Failed', 'Pending'],
      default: 'Success',
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: 'timestamp',
      updatedAt: false,
    },
    collection: 'auditlogs'
  }
);

// Prevent any modification to audit logs
AuditLogSchema.statics.updateOne = function() {
  throw new Error('Audit logs are immutable and cannot be updated');
};

AuditLogSchema.statics.updateMany = function() {
  throw new Error('Audit logs are immutable and cannot be updated');
};

AuditLogSchema.statics.deleteOne = function() {
  throw new Error('Audit logs are immutable and cannot be deleted');
};

AuditLogSchema.statics.deleteMany = function() {
  throw new Error('Audit logs are immutable and cannot be deleted');
};

// Prevent instance methods for updating
AuditLogSchema.methods.save = function() {
  if (!this.isNew) {
    throw new Error('Audit logs are immutable and cannot be modified');
  }
  return mongoose.Model.prototype.save.call(this);
};

// Compound index for finding audit trail for specific entity
AuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
AuditLogSchema.index({ disasterId: 1, timestamp: -1 });
AuditLogSchema.index({ performedBy: 1, timestamp: -1 });

export default mongoose.model('AuditLog', AuditLogSchema);
