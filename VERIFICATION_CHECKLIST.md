# Allocation Flow - Verification Checklist

## Pre-Deployment Verification

### Backend Components ✓

#### Routes (allocation.js)
- [x] GET `/api/allocation/requests/:disasterId` - Fetch allocation requests
- [x] POST `/api/allocation/create-request` - Create with validation middleware
- [x] PUT `/api/allocation/requests/:requestId/approve` - Approve with validation
- [x] PUT `/api/allocation/requests/:requestId/disburse` - Disburse with validation

#### Routes (financial.js)
- [x] GET `/api/financial/allocation-budget-impact/:disasterId` - Budget impact endpoint

#### Controllers (allocationController.js)
- [x] getAllocationRequestsByDisaster() - Query by disaster and status
- [x] Exported from default module

#### Controllers (financialController.js)
- [x] getAllocationBudgetImpact() - Budget impact calculation
- [x] Imports updated with new utilities
- [x] Exported from default module

#### Utilities (financialUtils.js)
- [x] trackAllocationBudgetImpact() - Budget impact tracking
- [x] getAllocationSummary() - Status-based aggregation
- [x] Both exported (named and default)

#### Middleware (allocationValidation.js)
- [x] validateAllocationRequest - Check assessment exists/validity
- [x] validateBudgetAvailability - Check budget status
- [x] checkAllocationPermissions - Role-based access
- [x] validateStatusTransition - Prevent invalid transitions
- [x] logAllocationAction - Audit trail logging

### Frontend Components ✓

#### AidAllocation.jsx
- [x] Import Row icons (X, CheckCircle, Send)
- [x] New state variables for allocation flow
- [x] handleAllocateClick() - Open modal
- [x] handleCreateAllocationRequest() - API call
- [x] handleApproveAllocation() - Approve action
- [x] handleDisburseAllocation() - Disburse action
- [x] fetchAuditLogs() - Get allocation logs
- [x] fetchAllocationRequests() - Get requests
- [x] Modal component with form
- [x] Summary Dashboard tab with tables
- [x] Button handlers on allocate button

#### AidAllocation.css
- [x] Modal styles
- [x] Table styles
- [x] Status badge colors
- [x] Button styles
- [x] Audit log styles
- [x] Form input styles
- [x] Responsive design

## Integration Testing

### Test 1: Create Household Assessment
```
Steps:
1. Go to AidAllocation → Assess Household tab
2. Select disaster
3. Fill form (head name, size, income, damage)
4. Click Submit

Expected:
- Toast: "Household assessed successfully"
- Assessment appears in table
- Audit log created (CREATE)
- Status in assessment: Pending Review
```

### Test 2: Generate Allocation Plan
```
Steps:
1. Go to AidAllocation → Allocation Plan tab
2. Click "Generate Allocation Plan"

Expected:
- Plan table appears with households
- Each row shows: HH ID, Head, Damage, Vulnerability, Score
- Packages and costs calculated
- Summary shows totals
```

### Test 3: Create Allocation Request
```
Steps:
1. In Allocation Plan tab, click "✓ Allocate" on household
2. Modal opens with details
3. Add optional notes
4. Click "Create Allocation Request"

Expected:
- Toast: "Allocation request created: AL-..."
- Modal closes
- Request appears in Summary Dashboard
- Status: Proposed
- Audit log created (CREATE)
```

### Test 4: Approve Allocation
```
Steps:
1. Go to Summary Dashboard
2. Find allocation request (Status: Proposed)
3. Click "Approve" button

Expected:
- Status changes: Proposed → Approved
- Button changes from Approve to Disburse
- Toast: "Allocation approved successfully"
- Audit log created (APPROVE)
```

### Test 5: Disburse Allocation
```
Steps:
1. In Summary Dashboard
2. Find approved allocation (Status: Approved)
3. Click "Disburse" button

Expected:
- Status changes: Approved → Disbursed
- Toast: "Allocation disbursed successfully and expenses recorded"
- Button shows: "✓ Completed"
- Expenses created in background
- New audit logs created (2+ entries)
```

### Test 6: View Audit Trail
```
Steps:
1. Scroll down in Summary Dashboard
2. View "Financial Audit Trail" section

Expected:
- Lists allocation actions in chronological order
- Shows: ALLOCATION_DISBURSED, EXPENSE_CREATED_BY_DISBURSE, etc.
- Timestamps visible
- Can see details snippet
```

### Test 7: Budget Impact Tracking
```
Steps:
1. API Call: GET /api/financial/allocation-budget-impact/:disasterId
2. Check response

Expected:
- totalBudget: Number (total allocated budget)
- totalCommitted: Number (allocated + approved + disbursed)
- remainingUncommitted: Number
- budgetHealthStatus: "HEALTHY" | "WARNING" | "CRITICAL"
- allocationSummary: Array with count by status
```

### Test 8: Validation - Duplicate Allocation
```
Steps:
1. Create allocation for household
2. Try to allocate same household again
3. Modal shows error

Expected:
- Toast error: "This household has already been allocated"
- Modal closes
- No duplicate request created
```

### Test 9: Validation - Budget Status
```
Steps:
1. Create allocation when budget is critical
2. Submit request

Expected:
- Request still created
- Warning logged in console
- Budget health indicator shows CRITICAL
```

### Test 10: Permission Validation
```
Steps:
1. Log in as Data Clerk
2. Try to approve allocation

Expected:
- Permission denied
- Toast error: "Insufficient permissions"
- No UI controls available for approval
```

## Data Flow Verification

### Flow: Assessment → Allocation → Approval → Disbursement

```
HOUSEHOLD ASSESSMENT
│
├─ DB: HouseholdAssessment created
│  └─ Status: Pending Review
│
├─ Audit: CREATE logged
│  └─ Fields: disasterId, householdId, damage, income
│
└─ UI: Appears in households table

                    ↓

ALLOCATION REQUEST CREATION
│
├─ Validation:
│  ├─ Assessment exists
│  ├─ Not already allocated
│  └─ Budget available
│
├─ DB: AidAllocationRequest created
│  ├─ Status: Proposed
│  ├─ Score calculated
│  ├─ Packages assigned
│  └─ Cost estimated
│
├─ Assessment Updated:
│  └─ Status: Allocated
│
├─ Audit: CREATE logged
│  └─ Fields: requestId, packages, cost
│
└─ UI: Appears in Summary Dashboard (Proposed column)

                    ↓

ALLOCATION APPROVAL
│
├─ Validation:
│  ├─ Status is Proposed
│  └─ User is Finance Officer/Admin
│
├─ DB: AidAllocationRequest updated
│  └─ Status: Approved
│
├─ Audit: APPROVE logged
│  └─ Fields: cost, justification
│
└─ UI: Button changes to Disburse

                    ↓

ALLOCATION DISBURSEMENT
│
├─ Validation:
│  ├─ Status is Approved
│  └─ User is Finance Officer/Admin
│
├─ Expense Creation:
│  ├─ Group packages by category
│  ├─ Create Expense record per category
│  └─ Each expense deducts from budget
│
├─ DB Updates:
│  ├─ AidAllocationRequest: Status = Disbursed
│  ├─ HouseholdAssessment: Status = Disbursed
│  └─ Expenses: Created (multiple records)
│
├─ Audit Logs Created:
│  ├─ ALLOCATION_DISBURSED (1 entry)
│  └─ EXPENSE_CREATED_BY_DISBURSE (N entries)
│
└─ UI: Shows "✓ Completed"
```

## Audit Trail Verification

### Check: All Actions Logged

```
Allocation ID: AL-xxxxx
Expected Log Entries:

1. CREATE
   ├─ Action: ALLOCATION_CREATE (or CREATE)
   ├─ Entity: AidAllocationRequest
   ├─ Details: requestId, packages, totalEstimatedCost
   └─ Actor: Finance Officer who created

2. APPROVE
   ├─ Action: ALLOCATION_APPROVE (or APPROVE)
   ├─ Entity: AidAllocationRequest
   ├─ Details: status change, cost
   └─ Actor: Finance Officer who approved

3. DISBURSE
   ├─ Action: ALLOCATION_DISBURSED
   ├─ Entity: AidAllocationRequest
   ├─ Details: disbursementData, createdExpenses
   └─ Actor: Finance Officer who disbursed

4. Expense 1
   ├─ Action: EXPENSE_CREATED_BY_DISBURSE
   ├─ Entity: Expense
   ├─ Details: category, amount, allocationRequestId
   └─ Actor: System (auto-created)

5. Expense 2
   ├─ Action: EXPENSE_CREATED_BY_DISBURSE
   ├─ Entity: Expense
   ├─ Details: category, amount, allocationRequestId
   └─ Actor: System (auto-created)

View at: /api/financial/auditlogs/:disasterId
```

## Error Handling Tests

### Test: Invalid Assessment ID
```
Request:
POST /api/allocation/create-request
{
  "assessmentId": "invalid-id",
  "disasterId": "valid-id"
}

Expected:
- HTTP 400
- Message: "Invalid Assessment ID or Disaster ID format"
```

### Test: Assessment Not Found
```
Request:
POST /api/allocation/create-request
{
  "assessmentId": "000000000000000000000000",
  "disasterId": "valid-id"
}

Expected:
- HTTP 404
- Message: "Household assessment not found"
```

### Test: Duplicate Allocation
```
Request:
POST /api/allocation/create-request (second time)
{
  "assessmentId": "same-id"
}

Expected:
- HTTP 409
- Message: "This household has already been allocated"
- existingRequestId: returns ID of first allocation
```

### Test: Invalid Status Transition
```
Request:
PUT /api/allocation/requests/:id/approve (when already approved)

Expected:
- HTTP 400
- Message: "Invalid status transition from Approved to Approved"
- allowedTransitions: []
```

### Test: Insufficient Permissions
```
Request (as Data Clerk):
PUT /api/allocation/requests/:id/approve

Expected:
- HTTP 403
- Message: "Insufficient permissions to approve allocations"
- requiredRole: ["Finance Officer", "Administrator"]
- userRole: "Data Clerk"
```

## Performance Tests

### Test: Large Disbursement (50+ expenses)
```
Steps:
1. Create allocation for household with high vulnerability
2. Disburse allocation
3. Monitor API response time

Expected:
- Response in < 5 seconds
- All expenses created
- All audit logs created
- Budget correctly updated
```

### Test: Concurrent Operations
```
Steps:
1. Multiple allocations being approved simultaneously
2. Multiple disbursements happening at once

Expected:
- Each operation completes independently
- No race conditions
- All audit logs created correctly
- Budget calculations accurate
```

## Browser Console Checks

```
No Errors Expected:
- Open Developer Tools (F12)
- Go through full allocation flow
- Check Console tab
- Expected: No red errors related to allocation

Warnings OK:
- Deprecation warnings from libraries: OK
- CORS warnings if cross-domain: Check origin

Check Network:
- POST /api/allocation/create-request: 201 Created
- PUT /api/allocation/requests/:id/approve: 200 OK
- PUT /api/allocation/requests/:id/disburse: 200 OK
- GET /api/allocation/requests/:disasterId: 200 OK
```

## Database Verification

### Check Collections

```
HouseholdAssessment:
- Status progression: Pending Review → Allocated → Disbursed
- createdAt, updatedAt timestamps

AidAllocationRequest:
- Status progression: Proposed → Approved → Disbursed
- totalEstimatedCost matches packages
- disbursementData populated after disburse

Expense:
- Created during disbursement
- Total amount = sum of allocatedPackages.totalCost
- Linked to allocation via description/notes

AuditLog:
- Records for each action
- action field matches expected values
- entityId, entityType properly set
- details contains context
```

## Sign-Off Checklist

- [ ] All routes respond correctly
- [ ] All validations working
- [ ] Audit logs created at each step
- [ ] Budget tracking accurate
- [ ] UI modal displays correctly
- [ ] Status transitions work
- [ ] Expenses created on disbursement
- [ ] Error handling displays proper messages
- [ ] Permissions enforced
- [ ] Summary Dashboard shows allocation requests and logs
- [ ] No console errors
- [ ] Database records created correctly
- [ ] Complete flow works end-to-end

## Known Limitations / Future Enhancements

1. **Batch Operations**: Not yet implemented for bulk allocations
2. **Bulk Approval**: Can only approve one at a time
3. **Undo/Revert**: No mechanism to revert disbursement
4. **Modification**: Cannot modify allocation after creation
5. **Export**: No export of audit logs to file
6. **Notifications**: No email notifications on status changes
7. **Reports**: Limited reporting on allocation metrics
8. **Historical**: No version history of allocations

## Deployment Notes

1. Ensure MongoDB indexes on:
   - AidAllocationRequest: disasterId, status
   - HouseholdAssessment: disasterId, status
   - AuditLog: action, entityType, entityId

2. Set environment variables:
   - JWT_SECRET
   - DATABASE_URL
   - NODE_ENV

3. Run migrations:
   - Create AuditLog schema if not exists
   - Add indexes to collections

4. Test in staging:
   - Full allocation flow
   - Error scenarios
   - Permission scenarios
   - Budget edge cases

5. Monitor in production:
   - Audit log creation performance
   - Expense creation latency
   - Error rates
   - Budget calculations accuracy
