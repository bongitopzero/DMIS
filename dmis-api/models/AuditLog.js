import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actorName: { type: String, default: "System" },
    actorRole: { type: String, default: "System" },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", auditLogSchema);
