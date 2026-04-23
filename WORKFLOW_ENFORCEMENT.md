# Strict Allocation Workflow Enforcement

## Overview

This document describes the strict approval and disbursement workflow implemented for aid allocation requests. The workflow enforces:

1. **Role-based access control** - Only Finance Officers can approve/disburse
2. **Status transition validation** - Prevents invalid state changes
3. **Comprehensive audit logging** - Every transition is logged
4. **Two-step approval process** - Clear separation of approval stages

---

## Workflow Architecture

### Status Flow

```
┌─────────────┐
│  Proposed   │  ← Initial state when request created
└────┬────────┘
     │ (Finance Officer approves)
     ↓
┌──────────────────┐
│ Pending Approval │  ← Intermediate state (logged)
└────┬─────────────┘
     │ (Finance Officer confirms approval)
     ↓
┌──────────┐
│ Approved │  ← Ready for disbursement (logged)
└────┬─────┘
     │ (Finance Officer disburses)
     ↓
┌───────────┐
│ Disbursed │  ← Funds transferred (logged)
└───────────┘
```

### Validation Rules

- **Proposed → Pending Approval**: Only Finance Officers
- **Pending Approval → Approved**: Only Finance Officers
- **Approved → Disbursed**: Only Finance Officers (separate endpoint)
- **No skipping states**: Cannot jump from Proposed → Disbursed directly
- **No backward transitions**: Cannot move from Approved → Proposed
- **Terminal states**: Disbursed and Rejected are final (no further transitions)

---

## API Endpoints

### 1. Create Allocation Request

**Endpoint**: `POST /api/allocation/create-request`

**Description**: Create a new allocation request in "Proposed" status

**Authentication**: JWT required

**Role**: Data Clerk, Coordinator, Finance Officer, Administrator

**Request Body**:
```json
{
  "disasterId": "507f1f77bcf86cd799439011",
  "householdAssessmentId": "507f1f77bcf86cd799439012",
  "householdId": "HH-001",
  "packages": [
    {
      "name": "Emergency Tent",
      "cost": 6500,
      "category": "Shelter"
    },
    {
      "name": "Food Parcel",
      "cost": 1500,
      "category": "Food & Water"
    }
  ],
  "totalCost": 8000,
  "compositeScore": 8,
  "damageScore": 3,
  "vulnerability": 5,
  "tier": "Extended"
}
```

**Response**:
```json
{
  "message": "Allocation request created successfully (pending approval)",
  "requestId": "AAR-1713607234567-ABC12XYZ",
  "allocationId": "507f1f77bcf86cd799439013",
  "household": "John Doe",
  "amount": 8000,
  "packageCount": 2,
  "status": "Proposed"
}
```

**Status Code**: 201 Created

---

### 2. Approve Allocation Request

**Endpoint**: `PUT /api/allocation/requests/:requestId/approve`

**Description**: 
- STEP 1: Move from Proposed → Pending Approval (with audit log)
- STEP 2: Move from Pending Approval → Approved (with audit log)
- Both transitions happen in a single endpoint call

**Authentication**: JWT required

**Role**: Finance Officer ONLY (strictly enforced)

**Request Body**:
```json
{
  "justification": "Household meets all criteria for tier 7-9 support. Damage assessment verified."
}
```

**Response on Success**:
```json
{
  "message": "Allocation request approved successfully",
  "request": {
    "_id": "507f1f77bcf86cd799439013",
    "requestId": "AAR-1713607234567-ABC12XYZ",
    "status": "Approved",
    "householdId": "HH-001",
    "totalEstimatedCost": 8000,
    "packages": 2,
    "approvalStatus": {
      "approvedBy": "507f1f77bcf86cd799439099",
      "approvalDate": "2024-04-19T10:30:00.000Z",
      "justification": "Household meets all criteria for tier 7-9 support..."
    }
  }
}
```

**Error Scenarios**:

1. **Wrong Role**:
```json
{
  "status": 403,
  "message": "Only Finance Officers can perform this action",
  "requiredRole": "Finance Officer",
  "userRole": "Data Clerk"
}
```

2. **Invalid Current Status**:
```json
{
  "status": 400,
  "message": "Cannot approve allocation in \"Disbursed\" status. Request must be in \"Proposed\" or \"Pending Approval\" status.",
  "currentStatus": "Disbursed",
  "allowedTransitions": ["Proposed", "Pending Approval"]
}
```

3. **Request Not Found**:
```json
{
  "status": 404,
  "message": "Allocation request not found",
  "requestId": "507f1f77bcf86cd799439013"
}
```

**Audit Logs Created**:
```
1. STATUS_TRANSITION: Proposed → Pending Approval
2. APPROVE: Pending Approval → Approved
```

---

### 3. Disburse Allocation Request

**Endpoint**: `PUT /api/allocation/requests/:requestId/disburse`

**Description**: Transfer approved funds to household (Approved → Disbursed)

**Authentication**: JWT required

**Role**: Finance Officer ONLY (strictly enforced)

**Request Body**:
```json
{
  "disbursementData": {
    "disbursedDate": "2024-04-19T15:00:00.000Z",
    "disbursedAmount": 8000,
    "disbursementMethod": "Bank Transfer",
    "referenceNumber": "BT-2024-00156"
  }
}
```

**Response on Success**:
```json
{
  "message": "Allocation disbursed successfully",
  "disbursement": {
    "requestId": "AAR-1713607234567-ABC12XYZ",
    "status": "Disbursed",
    "householdId": "HH-001",
    "disbursementData": {
      "disbursedDate": "2024-04-19T15:00:00.000Z",
      "disbursedAmount": 8000,
      "disbursementMethod": "Bank Transfer",
      "referenceNumber": "BT-2024-00156"
    },
    "totalAmount": 8000
  }
}
```

**Error Scenarios**:

1. **Wrong Role**:
```json
{
  "status": 403,
  "message": "Only Finance Officers can perform this action",
  "requiredRole": "Finance Officer",
  "userRole": "Coordinator"
}
```

2. **Not Approved Yet**:
```json
{
  "status": 400,
  "message": "Cannot disburse allocation in \"Proposed\" status. Request must be \"Approved\" to disburse.",
  "currentStatus": "Proposed",
  "requiredStatus": "Approved",
  "hint": "Approve the request first using /approve endpoint"
}
```

3. **Already Disbursed**:
```json
{
  "status": 400,
  "message": "Cannot disburse allocation in \"Disbursed\" status. Request must be \"Approved\" to disburse.",
  "currentStatus": "Disbursed",
  "requiredStatus": "Approved",
  "hint": "Allocation has already been disbursed"
}
```

**Audit Log Created**:
```
1. DISBURSE: Approved → Disbursed
```

---

### 4. Get Audit Log for Request

**Endpoint**: `GET /api/allocation/requests/:requestId/audit-log`

**Description**: Retrieve complete workflow history for an allocation request

**Authentication**: JWT required

**Role**: Any authenticated user (all can view audit trails)

**Response**:
```json
{
  "requestId": "507f1f77bcf86cd799439013",
  "requestDetails": {
    "requestId": "AAR-1713607234567-ABC12XYZ",
    "householdId": "HH-001",
    "status": "Disbursed",
    "totalAmount": 8000,
    "createdAt": "2024-04-19T09:00:00.000Z",
    "updatedAt": "2024-04-19T15:30:00.000Z"
  },
  "workflowHistory": [
    {
      "timestamp": "2024-04-19T09:00:00.000Z",
      "action": "CREATE_ALLOCATION_REQUEST",
      "performedBy": "507f1f77bcf86cd799439050",
      "performerRole": "Coordinator",
      "statusBefore": null,
      "statusAfter": "Proposed",
      "reason": "Allocation request created by Coordinator"
    },
    {
      "timestamp": "2024-04-19T10:15:00.000Z",
      "action": "STATUS_TRANSITION",
      "performedBy": "507f1f77bcf86cd799439099",
      "performerRole": "Finance Officer",
      "statusBefore": "Proposed",
      "statusAfter": "Pending Approval",
      "reason": "Moved to Pending Approval - Finance Officer reviewing"
    },
    {
      "timestamp": "2024-04-19T10:30:00.000Z",
      "action": "APPROVE",
      "performedBy": "507f1f77bcf86cd799439099",
      "performerRole": "Finance Officer",
      "statusBefore": "Pending Approval",
      "statusAfter": "Approved",
      "reason": "Allocation approved by Finance Officer - Total: M8000 - 2 packages",
      "details": {
        "statusTransition": "Pending Approval → Approved",
        "requestId": "AAR-1713607234567-ABC12XYZ",
        "approvedPackages": [
          {"packageName": "Emergency Tent", "quantity": 1, "totalCost": 6500},
          {"packageName": "Food Parcel", "quantity": 1, "totalCost": 1500}
        ],
        "approvedAmount": 8000,
        "approvedBy": "Jane Smith"
      }
    },
    {
      "timestamp": "2024-04-19T15:30:00.000Z",
      "action": "DISBURSE",
      "performedBy": "507f1f77bcf86cd799439099",
      "performerRole": "Finance Officer",
      "statusBefore": "Approved",
      "statusAfter": "Disbursed",
      "reason": "Funds disbursed - M8000 via Bank Transfer (Ref: BT-2024-00156)",
      "details": {
        "statusTransition": "Approved → Disbursed",
        "disbursementData": {
          "disbursedAmount": 8000,
          "disbursementMethod": "Bank Transfer",
          "referenceNumber": "BT-2024-00156"
        }
      }
    }
  ],
  "totalEvents": 4
}
```

---

## Middleware Components

### `requireFinanceOfficer`

Strict role enforcement middleware. Only allows Finance Officers.

```javascript
// Used in routes that require Finance Officer approval
router.put('/requests/:id/approve', protect, requireFinanceOfficer, (req, res) => {
  // Only Finance Officers reach here
});
```

**Error if not Finance Officer**:
```json
{
  "status": 403,
  "message": "Only Finance Officers can perform this action",
  "requiredRole": "Finance Officer",
  "userRole": "Data Clerk"
}
```

### `validateStatusTransition`

Validates that the requested status transition is allowed.

**Valid Transitions**:
- Proposed → [Pending Approval, Approved, Rejected]
- Pending Approval → [Approved, Rejected]
- Approved → [Disbursed, Rejected]
- Disbursed → [] (terminal)
- Rejected → [] (terminal)

---

## Audit Logging

Every status transition is automatically logged with:

- **Timestamp**: When the transition occurred
- **Action Type**: CREATE, STATUS_TRANSITION, APPROVE, DISBURSE
- **Actor**: User ID and role
- **Previous Status**: Status before transition
- **New Status**: Status after transition
- **Reason**: Human-readable explanation
- **Details**: Additional context (packages, amounts, etc.)

### Log Entries for Approval

When a Finance Officer approves a request, TWO audit logs are created:

**Log 1: STATUS_TRANSITION**
```
Action: STATUS_TRANSITION
From: Proposed → To: Pending Approval
Reason: "Moved to Pending Approval - Finance Officer reviewing"
```

**Log 2: APPROVE**
```
Action: APPROVE
From: Pending Approval → To: Approved
Reason: "Allocation approved by Finance Officer - Total: M8000 - 2 packages"
Details: [packages, amounts, approvalDate, etc.]
```

---

## Error Handling

### Clear Error Messages

All errors include:
- **status**: HTTP status code
- **message**: Primary error description
- **hint**: Contextual advice (e.g., "Approve the request first")
- **currentStatus**: Current allocation status
- **requiredStatus**: Expected status for operation

### Common Scenarios

| Scenario | Error | Action |
|----------|-------|--------|
| Non-Finance Officer tries to approve | 403 Forbidden | Restrict to Finance Officer role |
| Try to disburse Proposed request | 400 Bad Request | Approve first via /approve endpoint |
| Try to approve Disbursed request | 400 Bad Request | Request is final; cannot re-approve |
| Skip states (Proposed → Disbursed) | 400 Bad Request | Follow workflow: Proposed → Pending → Approved → Disbursed |

---

## Implementation Summary

### Key Changes

1. **New Middleware**: `requireFinanceOfficer` - Strict role enforcement
2. **Updated `approveAllocationRequest`**: Two-step approval with separate audit logs
3. **Updated `disburseAllocationRequest`**: Strict status validation before disbursement
4. **New Endpoint**: `getAuditLogForRequest` - Retrieve complete workflow history
5. **Enhanced Routes**: All three endpoints protected with Finance Officer middleware

### Code Structure

```
dmis-api/
├── middleware/
│   └── allocationValidation.js
│       ├── requireFinanceOfficer          [NEW]
│       ├── validateStatusTransition       [UPDATED]
│       └── ...
├── controllers/
│   └── allocationController.js
│       ├── validateStatusTransitionAllowed [NEW HELPER]
│       ├── approveAllocationRequest        [UPDATED]
│       ├── disburseAllocationRequest       [UPDATED]
│       └── getAuditLogForRequest           [NEW]
└── routes/
    └── allocation.js
        ├── /requests/:id/approve           [UPDATED]
        ├── /requests/:id/disburse          [UPDATED]
        └── /requests/:id/audit-log         [NEW]
```

---

## Testing Checklist

### Approval Workflow
- [ ] Finance Officer can approve Proposed request
- [ ] Request moves to Pending Approval (logged)
- [ ] Request then moves to Approved (logged)
- [ ] Non-Finance Officer gets 403 Forbidden
- [ ] Data Clerk cannot approve
- [ ] Both audit logs created with correct transitions

### Disbursement Workflow
- [ ] Finance Officer can disburse Approved request
- [ ] Request moves to Disbursed (logged)
- [ ] Cannot disburse Proposed request
- [ ] Cannot disburse Pending Approval request
- [ ] Cannot disburse already Disbursed request
- [ ] Audit log captures disbursement data

### Status Transition Validation
- [ ] Cannot skip states (Proposed → Disbursed)
- [ ] Cannot reverse states
- [ ] Terminal states cannot transition further
- [ ] Clear error messages for invalid transitions

### Audit Trail
- [ ] All transitions logged
- [ ] Timestamps accurate
- [ ] User and role captured
- [ ] Status changes reflected
- [ ] Retrieval endpoint works
- [ ] Chronological order maintained

---

## Summary

This strict workflow enforcement ensures:

✅ **Clear Role Boundaries** - Only Finance Officers approve/disburse  
✅ **No State Skipping** - Cannot jump from Proposed → Disbursed  
✅ **Audit Transparency** - Every transition logged and retrievable  
✅ **Two-Step Approval** - Separate Pending Approval and Approved steps  
✅ **Error Clarity** - Helpful messages guide users through workflow  
✅ **Production Ready** - Modular, testable, well-documented
