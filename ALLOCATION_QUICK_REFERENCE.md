# Allocation Flow - Quick Reference Guide

## Complete Allocation Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ALLOCATION WORKFLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

1. HOUSEHOLD ASSESSMENT
   ├─ UI: AidAllocation → "Assess Household" tab
   ├─ Input: Head name, size, income, damage severity
   ├─ API: POST /api/allocation/assessments
   ├─ Status: Pending Review
   └─ Audit: CREATE logged
   
2. ALLOCATION PLAN GENERATION
   ├─ UI: Click "Generate Allocation Plan" button
   ├─ Calculation: Vulnerability score + Damage score → Total score
   ├─ Score Range: 1-10
   ├─ Packages: Auto-assigned based on score
   └─ Display: Plan with all households, scores, packages, costs

3. CREATE ALLOCATION REQUEST
   ├─ UI: Click "Allocate" button on household in plan
   ├─ Modal: Shows household, score, packages, cost
   ├─ Validation:
   │  ├─ Assessment must exist
   │  ├─ Must not be already allocated
   │  ├─ Budget must be available
   │  └─ Budget health checked
   ├─ API: POST /api/allocation/create-request
   ├─ Status: Proposed (or Pending Approval if override)
   └─ Audit: CREATE logged with allocation details

4. APPROVE ALLOCATION
   ├─ UI: Click "Approve" button in Summary Dashboard
   ├─ Validation:
   │  ├─ Status must be Proposed
   │  └─ User must be Finance Officer/Admin
   ├─ API: PUT /api/allocation/requests/:id/approve
   ├─ Status: Approved
   └─ Audit: APPROVE logged with cost

5. DISBURSE ALLOCATION
   ├─ UI: Click "Disburse" button in Summary Dashboard
   ├─ Validation:
   │  ├─ Status must be Approved
   │  └─ User must be Finance Officer/Admin
   ├─ Process:
   │  ├─ Create Expense records per category
   │  ├─ Each expense deducts from budget
   │  ├─ Update assessment status → Disbursed
   │  └─ Link expenses to allocation
   ├─ API: PUT /api/allocation/requests/:id/disburse
   ├─ Status: Disbursed
   └─ Audit:
      ├─ ALLOCATION_DISBURSED logged
      └─ EXPENSE_CREATED_BY_DISBURSE per expense

6. VIEW AUDIT TRAIL
   ├─ UI: Summary Dashboard shows allocation logs
   ├─ Entries: All CREATE, APPROVE, DISBURSE actions
   ├─ Details: Cost, status changes, timestamps
   └─ API: /api/financial/auditlogs/:disasterId (filtered)
```

## Status Transitions

```
Assessment Status Flow:
┌─────────────────┐    CREATE    ┌──────────────────┐
│ Pending Review  │  ─────────→  │    Allocated     │
└─────────────────┘              └─────────┬────────┘
                                           │ DISBURSE
                                           ↓
                                   ┌──────────────────┐
                                   │    Disbursed     │
                                   └──────────────────┘

Allocation Request Status Flow:
┌──────────────┐    CREATE     ┌──────────────┐
│   Proposed   │  ────────────→│   Approved   │
└──────────────┘               └──────┬───────┘
                                      │ DISBURSE
                                      ↓
                                   ┌──────────────┐
                                   │  Disbursed   │
                                   └──────────────┘
```

## Scoring System

```
COMPOSITE SCORE CALCULATION:

Damage Component (0-4 points):
├─ Level 1 (Minor):        1 point
├─ Level 2 (Moderate):     2 points
├─ Level 3 (Severe):       3 points
└─ Level 4 (Catastrophic): 4 points

Vulnerability Component (0-10 points):
├─ Income (0-4):
│  ├─ ≤ 2,000:   4 points
│  ├─ ≤ 3,000:   3 points
│  ├─ ≤ 5,000:   2 points
│  └─ > 5,000:   1 point
├─ Children Under 5 (0-3):
│  ├─ ≥ 2:       3 points
│  ├─ = 1:       2 points
│  └─ = 0:       0 points
└─ Household Size (0-3):
   ├─ ≥ 7:       3 points
   ├─ ≥ 5:       2 points
   └─ < 5:       1 point

FINAL SCORE: (Damage × 2 + Vulnerability) / 2
RANGE: 1-10
```

## Aid Tier Assignment

```
Score Range → Aid Tier → Packages
├─ 0-3:   Basic Support
│         └─ School Supplies, Cash Transfer
├─ 4-6:   Shelter + Food + Cash
│         └─ Food Parcel, Cash Transfer
├─ 7-9:   Tent + Reconstruction + Food
│         └─ Food Parcel, Tent, Roofing Kit
└─ 10+:   Priority Reconstruction + Livelihood
          └─ Full reconstruction support
```

## Budget Tracking

```
BUDGET HEALTH STATUS:

Total Budget = All approved budget allocations for disaster

Committed = Sum of all:
├─ Proposed allocations
├─ Approved allocations
└─ Disbursed allocations

Spent = Sum of all expenses created

Health Status:
├─ HEALTHY:   Committed < 70% of budget      ✓
├─ WARNING:   70% ≤ Committed ≤ 90%         ⚠
└─ CRITICAL:  Committed > 90%                ✗
```

## API Endpoints

### Assessment
```
POST /api/allocation/assessments
- Create household assessment

GET /api/allocation/assessments/:disasterId
- Get all assessments for disaster
```

### Scoring
```
POST /api/allocation/calculate-score
- Calculate score for assessment (returns AI tier info)
```

### Allocation Request
```
POST /api/allocation/create-request
- Create allocation request
- Input: assessmentId, disasterId
- Output: Proposed allocation request

GET /api/allocation/requests/:disasterId
- Get allocation requests by disaster

PUT /api/allocation/requests/:requestId/approve
- Approve allocation request
- Changes status: Proposed → Approved

PUT /api/allocation/requests/:requestId/disburse
- Disburse allocation
- Creates expenses
- Changes status: Approved → Disbursed
```

### Budget Impact
```
GET /api/financial/allocation-budget-impact/:disasterId
- Get budget impact from allocations
- Returns: Total budget, committed, remaining, health status
```

### Audit Logs
```
GET /api/financial/auditlogs/:disasterId
- Get audit logs by disaster
- Shows all allocation-related actions
```

## UI Navigation

### AidAllocation Page
```
/pages/AidAllocation.jsx

Tabs:
├─ Assess Household
│  └─ Create household assessments
│     └─ Form with household details
├─ Allocation Plan
│  ├─ View assessed households
│  ├─ Click "Generate Allocation Plan"
│  └─ Click "Allocate" on each household
│     └─ Modal appears with details
└─ Summary Dashboard
   ├─ Allocation Requests table
   │  ├─ Shows status (Proposed/Approved/Disbursed)
   │  └─ Action buttons (Approve/Disburse)
   └─ Audit Logs section
      └─ Shows last 10 allocation actions
```

## Key Validations

```
Allocation Request Creation:
├─ Assessment exists             ✓
├─ Assessment not already alloc. ✓
├─ Assessment status valid       ✓
└─ Budget available             ✓

Status Transitions:
├─ Proposed → Approved only
├─ Approved → Disbursed only
└─ Cannot go backwards           ✓

Permission Checks:
├─ Create: Finance Officer/Admin
├─ Approve: Finance Officer/Admin
├─ Disburse: Finance Officer/Admin
└─ View: All authenticated users ✓
```

## Error Scenarios

### Cannot Create Allocation
- Assessment doesn't exist
- Assessment already allocated
- Household in wrong status
- Budget not available
- Budget would be exceeded

### Cannot Approve
- Allocation not found
- Wrong status
- Insufficient permissions

### Cannot Disburse
- Allocation not found
- Must be Approved status
- Insufficient permissions

## Example Complete Flow

```
1. USER CREATES ASSESSMENT
   Data: Head: "John Doe", Size: 5, Income: 2500, Damage: Severe
   → Assessment created with ID: 62c4b...
   → Audit: CREATE logged

2. USER GENERATES PLAN
   Action: Click "Generate Allocation Plan"
   → Calculates: Score = 7.5 (Tier: Tent + Reconstruction + Food)
   → Packages: Food Parcel (1500), Tent (1500) = 3000

3. USER CLICKS ALLOCATE
   Action: Click "✓ Allocate" on row
   → Modal shows: John Doe, Score 7.5, Packages, Cost 3000
   → User clicks "Create Allocation Request"
   → Request created: AL-1709567...
   → Audit: CREATE logged (includes package details)

4. FINANCE OFFICER APPROVES
   Action: Click "Approve" button in Summary
   → Status changes: Proposed → Approved
   → Audit: APPROVE logged (Cost: M3000)

5. FINANCE OFFICER DISBURSES
   Action: Click "Disburse" button
   → Expenses created:
      - Expense 1: Shelter & Housing - 1500
      - Expense 2: Food & Water - 1500
   → Assessment status: Disbursed
   → Audit entries:
      - ALLOCATION_DISBURSED
      - EXPENSE_CREATED_BY_DISBURSE (2 entries)

6. VIEW AUDIT TRAIL
   Action: Navigate to Summary Dashboard
   → Shows recent allocation logs
   → Lines show: CREATE, APPROVE, DISBURSED, 2× EXPENSE_CREATED
   → Total: 5 audit log entries for this allocation
```

## Performance Notes
- Large disbursements (many expenses) may take a few seconds
- Audit logs created asynchronously (non-blocking)
- Budget calculations aggregated efficiently
- UI remains responsive during processing
