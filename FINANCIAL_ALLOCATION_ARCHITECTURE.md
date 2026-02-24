# Financial Allocation System - Architecture & Data Flow

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT APPLICATIONS                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  React Frontend (dmis-ui)                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ AllocationDashboard (Main Page)                                 │   │
│  │ ├── HouseholdAssessmentForm (Create assessments)               │   │
│  │ ├── AllocationRequestForm (Create allocations)                 │   │
│  │ ├── AllocationPlanViewer (View/export plans)                   │   │
│  │ └── Charts & Tables (Dashboard visualizations)                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                 │                                        │
│                          HTTP/REST API                                   │
│                                 ↓                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
┌─────────────────────────────────────────────────────────────────────────┐
│                           API SERVER (Node.js)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Express.js API (dmis-api/routes/allocation.js)                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ POST   /assessments                  Create assessment           │   │
│  │ GET    /assessments/:disasterId      List assessments            │   │
│  │ POST   /calculate-score              Score calculation           │   │
│  │ POST   /create-request               Create allocation           │   │
│  │ PUT    /requests/:id/approve         Approve request             │   │
│  │ POST   /plans                        Generate plan               │   │
│  │ GET    /plans/:disasterId            List plans                  │   │
│  │ GET    /dashboard-stats/:id          Get statistics              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                 │                                        │
│  Allocation Controller (allocationController.js)                        │
│  ├── createHouseholdAssessment()                                        │
│  ├── calculateAllocationScore()                                         │
│  ├── createAllocationRequest()                                          │
│  ├── generateAllocationPlan()                                           │
│  └── getDashboardStats()                                                │
│                                 │                                        │
│  Utilities                                                               │
│  ├── allocationScoringEngine.js  (Scoring algorithm)                    │
│  │   ├── calculateDamageLevel()                                        │
│  │   ├── calculateVulnerabilityPoints()                                │
│  │   └── calculateCompositeScore()                                     │
│  │                                                                      │
│  └── assistancePackages.js  (Package definitions)                      │
│      ├── ASSISTANCE_PACKAGES{}  (18 packages)                          │
│      ├── getPackagesByTier()                                           │
│      └── getAllocationRulesForTier()                                   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                           MongoDB Driver
                                   │
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATABASE LAYER (MongoDB)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Collections:                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ household_assessments                                            │   │
│  │ ├─ householdId, headOfHousehold, householdSize                 │   │
│  │ ├─ disasterType, damageSeverityLevel, damageDetails            │   │
│  │ ├─ monthlyIncome, incomeCategory                               │   │
│  │ └─ status (Pending Review → Approved → Allocated → Disbursed)  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ aid_allocation_requests                                          │   │
│  │ ├─ requestId, householdAssessmentId, disasterId                │   │
│  │ ├─ damageLevel, vulnerabilityPoints, compositeScore             │   │
│  │ ├─ aidTier, allocatedPackages[]                                 │   │
│  │ ├─ totalEstimatedCost, status                                   │   │
│  │ └─ isOverride, overrideJustification                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ allocation_plans                                                 │   │
│  │ ├─ planId, planName, planDate                                   │   │
│  │ ├─ allocations[] (household allocations)                        │   │
│  │ ├─ procurementSummary[] (aggregated packages)                   │   │
│  │ ├─ vulnerabilityDistribution, disasterTypeBreakdown             │   │
│  │ └─ totalBudgetRequired, status                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ assistance_packages                                              │   │
│  │ ├─ packageId, name, unitCost, category                          │   │
│  │ ├─ applicableDisasters[], allocationRules                       │   │
│  │ └─ isActive (18 predefined packages)                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ audit_logs                                                       │   │
│  │ ├─ actionType (CREATE, APPROVE, UPDATE, OVERRIDE)               │   │
│  │ ├─ entityType, performedBy, performerRole                       │   │
│  │ ├─ newValues, reason, timestamp                                 │   │
│  │ └─ (Full traceable history)                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Assessment to Allocation Flow

```
┌──────────────────┐
│  Data Collector  │
│ (Data Clerk)     │
└────────┬─────────┘
         │
         │ 1. Creates Assessment
         ↓
    ┌─────────────────────────────────────┐
    │ Household Assessment Form           │
    │ ├─ HH ID, demographics              │
    │ ├─ Disaster type & damage details   │
    │ ├─ Income & location                │
    │ └─ [Submit]                         │
    └─────────┬───────────────────────────┘
              │
              ├─→ Validation
              │
              └─→ POST /api/allocation/assessments
                     │
                     ├─→ Create HouseholdAssessment record
                     │
                     └─→ Create audit log
                     
                     
┌──────────────────────────────────┐
│  Finance Officer / Coordinator   │
│ (Reviews & calculates score)     │
└────────┬─────────────────────────┘
         │
         │ 2. Calculate Score
         ↓
    ┌─────────────────────────────────────┐
    │ Allocation Request Form (Step 2)    │
    │ ├─ Select Assessment                │
    │ ├─ [Calculate Score]                │
    │ └─ Shows:                           │
    │    - Damage Level (1-4)             │
    │    - Vulnerability Points           │
    │    - Composite Score                │
    │    - Aid Tier                       │
    └─────────┬───────────────────────────┘
              │
              ├─→ POST /api/allocation/calculate-score
                     │
                     ├─→ calculateDamageLevel()     [1-4]
                     │
                     ├─→ calculateVulnerabilityPoints()
                     │   ├─ Elderly head        [+2]
                     │   ├─ Children <5         [+2]
                     │   ├─ Female-headed       [+1]
                     │   ├─ Large family        [+2]
                     │   └─ Income category     [+0/+1/+3]
                     │
                     └─→ calculateCompositeScore()
                         Score = Damage + Vulnerability


┌──────────────────────────────────┐
│  Finance Officer                 │
│ (Creates & approves allocation)  │
└────────┬─────────────────────────┘
         │
         │ 3. Create Allocation Request
         ↓
    ┌────────────────────────────────────┐
    │ Allocation Request Form (Step 3)   │
    │ ├─ Review packages (auto-assigned) │
    │ ├─ [Optional Override]             │
    │ │  ├─ Reason                       │
    │ │  └─ Justification (50+ chars)    │
    │ └─ [Create Allocation]             │
    └─────────┬────────────────────────┘
              │
              ├─→ POST /api/allocation/create-request
                     │
                     ├─→ Get tier from score
                     ├─→ getPackagesByTier()  [get applicable packages]
                     ├─→ Create AidAllocationRequest
                     ├─→ Update Assessment status → "Allocated"
                     └─→ Create audit log (with override details if applicable)


┌──────────────────────────────────┐
│  Finance Officer                 │
│ (Final approval)                 │
└────────┬─────────────────────────┘
         │
         │ 4. Approve Allocation
         ↓
         ├─→ PUT /api/allocation/requests/:id/approve
                     │
                     ├─→ Update status → "Approved"
                     ├─→ Store approval details
                     └─→ Create audit log


┌──────────────────────────────────┐
│  Finance Officer                 │
│ (Generates plan)                 │
└────────┬─────────────────────────┘
         │
         │ 5. Generate Allocation Plan
         ↓
         ├─→ POST /api/allocation/plans
                     │
                     ├─→ Fetch all "Approved" allocations
                     ├─→ Aggregate packages
                     ├─→ Calculate vulnerabilityDistribution
                     ├─→ Calculate disasterTypeBreakdown
                     ├─→ Create AllocationPlan record
                     └─→ Create audit log
                     

┌──────────────────────────────────┐
│  Procurement Officer             │
│ (Executes based on itemized plan)│
└────────┬─────────────────────────┘
         │
         │ 6. View & Export Plan
         ↓
    ┌────────────────────────────────────┐
    │ Allocation Plan Viewer             │
    │ ├─ Summary statistics              │
    │ ├─ Procurement table (qty×price)   │
    │ ├─ Household allocations           │
    │ ├─ [Export PDF]                    │
    │ └─ [Export Excel]                  │
    └────────────────────────────────────┘
              │
              └─→ Procurement happens with itemized details
                  (No lump sums, everything tracked)
```

---

## Scoring Algorithm Flowchart

```
                            ┌─────────────────┐
                            │  Assess Damage  │
                            │   Household     │
                            └────────┬────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
            ┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
            │ Heavy Rainfall│ │Strong Winds │ │  Drought   │
            └───────┬──────┘ └──────┬──────┘ └──────┬──────┘
                    │              │               │
        ┌───────────┴───────────┐   │    ┌──────────┴──────────┐
        │                       │   │    │                     │
        ├─ Rooms affected      │   │    ├─ Crop loss %        │
        ├─ Crop loss %         │   │    ├─ Livestock loss     │
        ├─ Livestock loss      │   │    └─ Water access       │
        │                 ↓    │   │            ↓             │
        │            ┌────────────────────────┐              │
        │            │  Determine Damage     │              │
        │            │  Level (1-4)          │              │
        │            │ ┌─ L1: Minor           │              │
        │            │ ├─ L2: Moderate        │              │
        └───────────→│ ├─ L3: Severe          │←─────────────┘
                     │ └─ L4: Destroyed       │
                     └────────┬────────────────┘
                              │
                              ├─→ Damage Level Score (1, 2, 3, or 4)
                              │
       ┌──────────────────────┴──────────────────────┐
       │                                             │
       │      ┌────────────────────────────────┐    │
       │      │  Calculate Vulnerability     │    │
       │      │  Points                      │    │
       │      └─────────────┬────────────────┘    │
       │                    │                     │
       │    ┌───────────────┼───────────────┐    │
       │    ├── elderly(>65) → +2            │    │
       │    ├──children(<5) → +2             │    │
       │    ├──female-head → +1              │    │
       │    ├──large family(>6) → +2         │    │
       │    └──income level:                 │    │
       │       ├─ Low(≤M3k) → +3             │    │
       │       ├─ Mid(M3-10k) → +1           │    │
       │       └─ High(>M10k) → +0           │    │
       │                                     │    │
       └─────────────┬──────────────────────┬────┘
                     │                      │
            Total Vulnerability      Damage Level
                  Points                Score
                     │                      │
                     └──────────┬───────────┘
                                │
                        ┌───────▼────────┐
                        │ COMPOSITE     │
                        │ SCORE =       │
                        │ Damage + Vuln │
                        └───────┬────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
            ┌───▼──┐       ┌────▼────┐      ┌──▼──┐
            │ 0-3  │ 4-6   │ 7-9     │ 10+  │    │
            │      │       │         │      │    │
            └──┬───┘   ┌───┴────┐   └──┬───┘    │
               │       │        │      │        │
            BASIC    SHELTER  TENT+  PRIORITY  │
            SUPPORT  +FOOD   RECON  RECON+    │
               │     +CASH   +FOOD  LIVELIHOOD │
               │       │        │      │        │
               ├──→ Assign Packages by Tier ←──┘
               │       │        │      │
               └───────┼────────┼──────┤
                       │        │      │
            ┌──────────▼────────▼──┬───▼──────┐
            │  Auto-Assign Packages │
            │  ├─ Food Parcel       │
            │  ├─ Tarpaulin/Tent    │
            │  ├─ Reconstruction    │
            │  ├─ Livelihood Kit    │
            │  ├─ Cash Transfer     │
            │  └─ Other Support     │
            └─────────┬─────────────┘
                      │
            ┌─────────▼──────────┐
            │ Create Allocation  │
            │ Request with       │
            │ Auto-Assigned      │
            │ Packages           │
            │                    │
            │ Total Cost =       │
            │ Σ(qty × unitCost)  │
            └──────────┬─────────┘
                       │
            ┌──────────▼────────┐
            │  Pending Approval │
            │  (Ready for       │
            │   Finance Officer)│
            └───────────────────┘
```

---

## Component Interaction Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ AllocationDashboard                                      │ │
│  │                                                          │ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │ Summary Cards                                    │   │ │
│  │ │ ├─ Pending (Clock icon)                          │   │ │
│  │ │ ├─ Awaiting Approval (Alert icon)                │   │ │
│  │ │ ├─ Approved (Check icon)                         │   │ │
│  │ │ ├─ Total Approved Budget (Dollar icon)           │   │ │
│  │ │ └─ Estimated Need (Trending icon)                │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  │                                                          │ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │ Action Buttons                                   │   │ │
│  │ ├─ [New Assessment] ──→ HouseholdAssessmentForm   │   │ │
│  │ ├─ [New Allocation] ──→ AllocationRequestForm     │   │ │
│  │ └─ [Generate Plan] ──→ POST /allocation/plans     │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  │                                                          │ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │ Tabs: Overview | Assessments | Allocations | Plans│  │ │
│  │ │                                                  │   │ │
│  │ │ Overview Tab:                                   │   │ │
│  │ │ ├─ Pie Chart (Vulnerability Distribution)       │   │ │
│  │ │ └─ Bar Chart (Budget Status)                    │   │ │
│  │ │                                                  │   │ │
│  │ │ Assessments Tab:                                │   │ │
│  │ │ └─ Table (HH ID, Name, Type, Damage, Status)    │   │ │
│  │ │                                                  │   │ │
│  │ │ Allocations Tab:                                │   │ │
│  │ │ └─ Table (HH ID, Score, Tier, Cost, Status)     │   │ │
│  │ │                                                  │   │ │
│  │ │ Plans Tab:                                      │   │ │
│  │ │ └─ Table (Plan ID, Name, HHs, Budget, Status)   │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────┐   ┌─────────────────────┐  │
│  │ HouseholdAssessmentForm      │   │AllocationRequestForm│  │
│  │ (Modal)                      │   │ (Modal)             │  │
│  │                              │   │                     │  │
│  │ Pages:                       │   │Pages:               │  │
│  │ 1. Household Data            │   │1. Select Assessment │  │
│  │ 2. Head Info                 │   │2. Review Score      │  │
│  │ 3. Damage Assessment         │   │3. Confirm/Override  │  │
│  │ 4. Location                  │   │                     │  │
│  │ 5. Recommended Assistance    │   └─────────────────────┘  │
│  └──────────────────────────────┘                             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ AllocationPlanViewer (Modal)                            │ │
│  │                                                          │ │
│  │ ├─ Plan Summary Cards                                   │ │
│  │ ├─ Procurement Table (Package, Qty, Cost)               │ │
│  │ ├─ Vulnerability Distribution                           │ │
│  │ ├─ Household Allocations Table                          │ │
│  │ ├─ [Export PDF] [Export Excel]                          │ │
│  │ └─ Full vulnerability histogram & cost breakdown        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
                              │
                       API Calls (HTTP)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    API SERVER LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  allocationController.js:                                       │
│  ├─ POST /assessments          → createHouseholdAssessment()   │
│  ├─ GET  /assessments/:id      → getAssessmentsByDisaster()    │
│  ├─ POST /calculate-score      → calculateAllocationScore()    │
│  ├─ POST /create-request       → createAllocationRequest()     │
│  ├─ PUT  /requests/:id/approve → approveAllocationRequest()    │
│  ├─ POST /plans                → generateAllocationPlan()      │
│  ├─ GET  /plans/:id            → getAllocationPlansByDisaster()│
│  └─ GET  /dashboard-stats      → getDashboardStats()           │
│                                                                  │
│  Utilities:                                                     │
│  ├─ allocationScoringEngine.js (Mathematical algorithms)       │
│  └─ assistancePackages.js (Data & package rules)               │
│                                                                  │
│  Access Control:                                                │
│  ├─ Data Clerk: Create/List Assessments                        │
│  ├─ Coordinator: + Calculate Scores                            │
│  ├─ Finance Officer: + Create/Approve Allocations              │
│  └─ Administrator: All + Overrides                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    MongoDB Database Driver
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    DATA PERSISTENCE LAYER                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MongoDB Collections:                                           │
│  ├─ household_assessments (Demographics + damage)              │
│  ├─ aid_allocation_requests (Scoring + packages)               │
│  ├─ allocation_plans (Comprehensive plans)                     │
│  ├─ assistance_packages (Fixed package definitions)            │
│  └─ audit_logs (Complete action history)                       │
│                                                                  │
│  Indexes:                                                       │
│  ├─ {disasterId, status} for rapid filtering                   │
│  ├─ {householdId, disasterId} for household lookups            │
│  └─ {timestamp} for audit trail queries                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## State Management & Data Flow

```
React Component State:
  │
  ├─ AllocationDashboard
  │  ├─ stats: {...}            ← GET /dashboard-stats
  │  ├─ assessments: [...]       ← GET /assessments
  │  ├─ allocations: [...]       ← GET /assessments?status=Allocated
  │  ├─ plans: [...]             ← GET /plans
  │  └─ activeTab: "overview"
  │
  ├─ HouseholdAssessmentForm
  │  ├─ formData: {...}          ← User input
  │  ├─ showForm: boolean        ← Modal visibility
  │  └─ loading: boolean         ← API call status
  │                   │
  │              [Submit]
  │                   │
  │          POST /assessments
  │                   ├─→ Validate data
  │                   ├─→ Create record
  │                   ├─→ Update audit log
  │                   └─→ Return assessment ID
  │
  ├─ AllocationRequestForm
  │  ├─ assessments: [...]       ← GET /assessments?status=Pending
  │  ├─ selectedAssessmentId     ← User selection
  │  ├─ scoringResult: {...}     ← Score calculation result
  │  ├─ step: 1|2|3              ← Workflow step
  │  ├─ override: boolean        ← Override flag
  │  └─ loading: boolean         ← API status
  │                   │
  │        [Select Assessment]
  │                   │
  │   POST /calculate-score
  │          ├─→ Damage Level (1-4)
  │          ├─→ Vulnerability Points breakdown
  │          ├─→ Composite Score
  │          └─→ Aid Tier string
  │
  │        [Confirm/Override]
  │                   │
  │   POST /create-request
  │          ├─→ Auto-assign packages
  │          ├─→ Calculate total cost
  │          ├─→ Create request record
  │          └─→ Return request ID
  │
  │        [Approve]
  │                   │
  │   PUT /requests/:id/approve
  │          ├─→ Update status → "Approved"
  │          └─→ Trigger onSuccess callback
  │
  └─ AllocationPlanViewer
     ├─ plan: {...}               ← Plan data
     └─ loading: boolean          ← Load status
```

---

## Request/Response Cycle Example

### Creating Assessment

```
Frontend (React)
     │
     ├─ User fills form
     ├─ Validates locally
     └─ POST /api/allocation/assessments
              {
                "disasterId": "ObjectId",
                "householdId": "HH-001",
                "headOfHousehold": {...},
                "householdSize": 5,
                "monthlyIncome": 3000,
                "disasterType": "Heavy Rainfall",
                ...
              }
              │
              ├─→ Route: POST /assessments
              │
              ├─→ Controller: createHouseholdAssessment()
              │
              ├─→ Validate income → incomeCategory: "Low"
              │
              ├─→ Create HouseholdAssessment document
              │
              ├─→ Save to MongoDB
              │
              ├─→ Create audit log entry
              │
              └─→ Response (201 Created)
                    {
                      "message": "Assessment created successfully",
                      "assessment": {
                        "_id": "ObjectId",
                        "householdId": "HH-001",
                        "status": "Pending Review",
                        ...
                      }
                    }
     │
     ├─ Parse response
     ├─ Update component state
     ├─ Show success toast
     └─ Update dashboard tables
     
Backend (Node.js)                MongoDB
     ├─→ Validate request
     │
     ├─→ Check disaster exists
     │
     ├─→ Process income category
     │
     ├─→ Create record
     │   └─→ Insert into household_assessments
     │
     └─→ Create audit log
         └─→ Insert into audit_logs
```

---

## Summary

This architecture ensures:
- **Scalability**: Microservices-like separation of concerns
- **Maintainability**: Clear data flow and component responsibilities
- **Security**: Role-based access control at API level
- **Traceability**: Complete audit trail logging
- **Transparency**: Deterministic scoring algorithm
- **Auditability**: All changes tracked in audit logs

The system is production-ready and handles complex disaster aid allocation scenarios while maintaining governance and fraud prevention.

---

**Architecture Version**: 1.0
**Last Updated**: February 22, 2026
