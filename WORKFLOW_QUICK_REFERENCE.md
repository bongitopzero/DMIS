# Allocation Workflow - Quick Reference

## Three-Step Workflow

### STEP 1️⃣: Create Request
```bash
POST /api/allocation/create-request
Role: Any authenticated user
Body:
{
  "disasterId": "...",
  "householdAssessmentId": "...",
  "packages": [...],
  "totalCost": 8000,
  "compositeScore": 8
}
Response: { status: "Proposed", allocationId: "..." }
```

### STEP 2️⃣: Approve Request
```bash
PUT /api/allocation/requests/{allocationId}/approve
Role: Finance Officer ONLY ⚠️
Body:
{
  "justification": "Meets all criteria..."
}
Response: { status: "Approved" }
Audit Logs: 2 entries
  - Proposed → Pending Approval
  - Pending Approval → Approved
```

### STEP 3️⃣: Disburse Funds
```bash
PUT /api/allocation/requests/{allocationId}/disburse
Role: Finance Officer ONLY ⚠️
Body:
{
  "disbursementData": {
    "disbursedAmount": 8000,
    "disbursementMethod": "Bank Transfer",
    "referenceNumber": "BT-2024-00156"
  }
}
Response: { status: "Disbursed" }
Audit Log: 1 entry
  - Approved → Disbursed
```

### View History
```bash
GET /api/allocation/requests/{allocationId}/audit-log
Role: Any authenticated user
Response: { workflowHistory: [...], totalEvents: 4 }
```

---

## Status Machine

```
Proposed
  ↓ (Finance Officer approves)
Pending Approval
  ↓ (Finance Officer confirms)
Approved
  ↓ (Finance Officer disburses)
Disbursed ✓ (Terminal)
```

---

## Error Codes

| Code | Scenario | Fix |
|------|----------|-----|
| 401 | Not authenticated | Get JWT token |
| 403 | Not Finance Officer | Request approval from FO |
| 404 | Request not found | Check allocation ID |
| 400 | Invalid status transition | Check current status, follow workflow |

---

## Key Rules

✅ **DO**
- Use Finance Officer account for approvals
- Approve before disbursing
- Check audit log for history
- Follow the three-step workflow

❌ **DON'T**
- Try to skip approval steps
- Attempt disbursement on unapproved requests
- Use non-Finance Officer account for approval
- Expect to re-approve disbursed requests

---

## Examples

### Complete Workflow
```javascript
// 1. Create (Coordinator)
const createResp = await POST('/allocation/create-request', {
  disasterId: 'D123',
  householdAssessmentId: 'H456',
  packages: [{ name: 'Tent', cost: 6500 }],
  totalCost: 6500
});
const allocId = createResp.allocationId;

// 2. Approve (Finance Officer)
const approveResp = await PUT(`/allocation/requests/${allocId}/approve`, {
  justification: 'Verified and approved'
});
// Status: Proposed → Pending Approval → Approved

// 3. Disburse (Finance Officer)
const disburseResp = await PUT(`/allocation/requests/${allocId}/disburse`, {
  disbursementData: {
    disbursedAmount: 6500,
    disbursementMethod: 'Bank Transfer',
    referenceNumber: 'BT-001'
  }
});
// Status: Approved → Disbursed

// 4. View History
const auditResp = await GET(`/allocation/requests/${allocId}/audit-log`);
// Shows: CREATE → STATUS_TRANSITION → APPROVE → DISBURSE
```

### Error Handling
```javascript
// Non-Finance Officer tries to approve
const resp = await PUT(`/allocation/requests/${allocId}/approve`, body, {
  headers: { Authorization: coordinatorToken } // ❌
});
// Error 403: "Only Finance Officers can perform this action"

// Try to disburse unapproved
const resp = await PUT(`/allocation/requests/${allocId}/disburse`, body);
// When status is "Proposed"
// Error 400: "Cannot disburse allocation in Proposed status..."
```

---

## Audit Log Format

```json
{
  "timestamp": "2024-04-19T10:30:00.000Z",
  "action": "APPROVE",
  "performerRole": "Finance Officer",
  "statusBefore": "Pending Approval",
  "statusAfter": "Approved",
  "reason": "Allocation approved by Finance Officer - Total: M8000 - 2 packages"
}
```

---

## Common Issues

### "Only Finance Officers can perform this action"
**Issue**: Non-Finance Officer tried to approve  
**Fix**: Use Finance Officer account

### "Cannot disburse allocation in Proposed status"
**Issue**: Tried to disburse before approval  
**Fix**: Approve request first

### "Cannot approve allocation in Disbursed status"
**Issue**: Tried to approve already disbursed request  
**Fix**: Terminal state - no further changes possible

---

## Checklist for Developers

- [ ] Understand three-step workflow
- [ ] Know Finance Officer role requirement
- [ ] Can interpret audit logs
- [ ] Know valid status transitions
- [ ] Can handle all error codes
- [ ] Familiar with endpoint signatures
- [ ] Can explain workflow to users
