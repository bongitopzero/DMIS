# Allocation Flow Documentation

## Overview
This document outlines the complete allocation flow from household assessment through budget allocation, approval, and disbursement with comprehensive audit logging.

## Flow Steps

### 1. Household Assessment
- **Endpoint**: `POST /api/allocation/assessments`
- **Input**: Household details, damage severity, vulnerability indicators
- **Output**: Assessment saved with Pending status
- **Audit**: CREATE action logged to AuditLog
- **Validation**: Required fields check, disaster household limit enforcement

### 2. Score Calculation
- **Endpoint**: `POST /api/allocation/calculate-score`
- **Input**: Assessment ID
- **Output**: Composite score (0-10), Aid tier, vulnerability breakdown
- **Calculation**: 
  - Damage component: 1-4 points (based on severity level)
  - Vulnerability component: combines income, household size, children under 5, elderly head
- **Aid Tiers**:
  - 0-3: Basic Support
  - 4-6: Shelter + Food + Cash
  - 7-9: Tent + Reconstruction + Food
  - 10+: Priority Reconstruction + Livelihood

### 3. Allocation Request Creation
- **Endpoint**: `POST /api/allocation/create-request`
- **Input**: Assessment ID, disaster ID, optional override reason
- **Process**:
  1. Validate assessment exists and not already allocated
  2. Calculate allocation score
  3. Determine aid tier
  4. Assign assistance packages based on tier
  5. Calculate total estimated cost
  6. Create AidAllocationRequest record
- **Output**: Allocation request with Proposed/Pending Approval status
- **Audit**: CREATE action logged with allocation details
- **Validation**:
  - Assessment must exist
  - Assessment must not already be allocated
  - Assessment status must be Pending or Allocated
  - Budget availability checked

### 4. Allocation Request Approval
- **Endpoint**: `PUT /api/allocation/requests/:requestId/approve`
- **Input**: Justification/notes
- **Process**:
  1. Validate request exists
  2. Validate status transition (Proposed/Pending → Approved)
  3. Update status to Approved
  4. Set approval date and approver
- **Output**: Approved allocation request
- **Audit**: APPROVE action logged with cost details
- **Validation**:
  - User must be Finance Officer or Administrator
  - Valid status transition required

### 5. Allocation Disbursement
- **Endpoint**: `PUT /api/allocation/requests/:requestId/disburse`
- **Input**: Disbursement date, method, reference number
- **Process**:
  1. Validate request exists and is Approved
  2. Set disbursement data (date, amount, method, reference)
  3. Create Expense records per category
  4. Each expense reflects budget deduction
  5. Link expenses to original allocation request
  6. Update household assessment status to Disbursed
- **Output**: Disbursed allocation with expense records created
- **Audit**: 
  - ALLOCATION_DISBURSED action logged
  - EXPENSE_CREATED_BY_DISBURSE for each expense
  - Entries appear in Finance Audit Trail
- **Validation**:
  - Request must be in Approved status
  - Expense creation validates budget availability

## UI Components

### AidAllocation Page
Located at `/pages/AidAllocation.jsx`

**Tabs**:
1. **Assess Household**: Create household assessments
2. **Allocation Plan**: View households and generate allocation plans
3. **Summary Dashboard**: View allocation requests, approvals status, and audit trail

**Features**:
- Select verified disaster
- View assessed households
- Generate allocation plan with scoring
- Create allocation requests with modal
- Approve allocations
- Disburse allocations with expense creation
- View allocation-related audit logs

**Modal Components**:
- Allocation Request Modal: Shows household details, packages, costs
- Confirms budget impact before creation

## Budget Tracking

### Budget Health Status
Tracked in real-time at each step:

- **HEALTHY**: Committed allocations < 70% of budget
- **WARNING**: 70% ≤ Committed allocations ≤ 90%
- **CRITICAL**: Committed allocations > 90%

### Budget Impact Calculation
Available via: `GET /api/financial/allocation-budget-impact/:disasterId`

Returns:
- Total budget allocated for disaster
- Total committed (approved + disbursed allocations)
- Total spent (expenses created)
- Remaining unCommitted budget
- Budget health status
- Allocation summary by status

## Audit Trail

### Audit Log Fields
- **Action**: CREATE, APPROVE, DISBURSE, EXPENSE_CREATED_BY_DISBURSE
- **Entity Type**: HouseholdAssessment, AidAllocationRequest, Expense
- **Entity ID**: Reference to the entity being logged
- **Actor**: User who performed action
- **Timestamp**: When action occurred
- **Details**: Context-specific information (amounts, status changes, etc.)

### Viewing Audit Logs
1. **By Disaster**: `GET /api/financial/auditlogs/:disasterId`
2. **By Entity**: `GET /api/financial/auditlogs/entity/:entityId/:entityType`
3. **In UI**: Summary Dashboard shows allocation-related logs

## Error Handling

### Validation Errors
- Missing required fields
- Invalid ObjectID formats
- Assessment not found
- Duplicate allocation requests

### Status Transition Errors
- Invalid state transitions
- Attempting to approve already approved request
- Attempting to disburse non-approved request

### Budget Errors
- No approved budget for disaster
- Budget overrun if allocation exceeds remaining
- Duplicate invoices

### Permission Errors
- Insufficient role (Finance Officer or Administrator required)
- User role not authorized for action

## Error Response Format
```json
{
  "message": "User-friendly error message",
  "errors": {
    "fieldName": "Field-specific error message"
  },
  "currentStatus": "Current status if relevant",
  "allowedTransitions": ["Valid", "States"]
}
```

## Key Models

### HouseholdAssessment
- Status: Pending Review → Allocated → Disbursed
- Contains: Household info, damage details, income, vulnerability markers
- Used for: Aid determination

### AidAllocationRequest
- Status: Proposed → Approved → Disbursed
- Contains: Assessment reference, scoring, packages, costs
- Used for: Tracking allocation lifecycle

### Expense
- Created automatically during disbursement
- Category-based grouping
- Reflects budget deductions
- Linked to original allocation request

### AuditLog
- Immutable records of all allocation actions
- Contains detailed context
- Financial compliance tracking

## Integration Points

### With Financial Module
- Budget allocation validation
- Expense creation on disbursement
- Audit trail integration

### With Household Assessment
- Assessment status updates
- Score-based allocation determination

### With Disaster Management
- Disaster limit enforcement
- Disaster-level budget tracking

## Testing Checklist
- [ ] Create household assessment
- [ ] Generate allocation plan
- [ ] Click Allocate button on household
- [ ] Confirm allocation request created
- [ ] Verify audit log entry created
- [ ] Approve allocation request
- [ ] Verify approval audit log entry
- [ ] Disburse allocation
- [ ] Verify expenses created per category
- [ ] Verify expense audit log entries created
- [ ] Check budget impact updated
- [ ] View audit trail in Summary Dashboard
- [ ] Verify all statuses updated correctly

## Performance Considerations
- Allocation creation triggers expense creation (may take time for large disbursements)
- Audit logs created asynchronously to not block response
- Budget calculations aggregated for efficiency
- Lean queries used for read-heavy operations
