# Financial Allocation Module - Complete Implementation Guide

## Overview

The Financial Allocation Module is a transparent, rule-based system for fair and equitable distribution of disaster aid. It eliminates embezzlement risks through automation, itemized procurement tracking, and comprehensive audit trails.

**System Architecture:**
- **Backend**: Node.js/Express API with MongoDB
- **Frontend**: React UI with QuickBooks-style dashboard
- **Database**: Household assessments, aid allocations, assistance packages, allocation plans

---

## Core Components

### 1. Assistance Packages (Fixed Unit Costs)

All assistance is provided through predefined packages with fixed costs:

| Package | Unit Cost | Category | Applicable Disasters |
|---------|-----------|----------|----------------------|
| Food Parcel | M800 | Food & Water | All |
| Tarpaulin Kit | M2,000 | Shelter | Rainfall, Winds |
| Emergency Tent | M6,500 | Shelter | Rainfall, Winds |
| Re-roofing Kit | M18,000 | Reconstruction | Rainfall, Winds |
| Reconstruction Grant | M75,000 | Reconstruction | Rainfall, Winds |
| Livelihood Recovery Kit | M10,000 | Livelihood | All |
| Water Purification Kit | M1,200 | Food & Water | All |
| Blanket & Clothing Pack | M1,500 | Shelter | All |
| Medical Aid Kit | M1,000 | Health | All |
| Furniture Replacement Pack | M10,000 | Reconstruction | Rainfall, Winds |
| School Repair Kit | M20,000 | Education | Rainfall, Winds |
| Community Shelter Support | M50,000 | Community | Rainfall, Winds |
| Cash Transfer (3 months) | M3,000 | Cash Transfer | All |
| Water Tank (5,000L) | M12,000 | Food & Water | Drought |
| Borehole Rehabilitation Grant | M50,000 | Food & Water | Drought |
| Livestock Feed Pack | M5,000 | Livelihood | All |
| Small Livestock Restocking | M15,000 | Livelihood | Drought |
| Community Irrigation Support | M100,000 | Livelihood | Drought |

### 2. Scoring Framework

#### Damage Severity Levels (1-4)

**Heavy Rainfall:**
- **Level 1** (Minor): Roof leaks, <20% crop loss
- **Level 2** (Moderate): 1-2 rooms affected, 20-50% crop loss
- **Level 3** (Severe): House uninhabitable, 50-80% crop loss
- **Level 4** (Destroyed): House collapsed, >80% crop loss

**Strong Winds:**
- **Level 1** (Minor): Minor wind damage
- **Level 2** (Moderate): Roof partly blown
- **Level 3** (Severe): >50% roof destroyed
- **Level 4** (Destroyed): Total roof/livelihood loss

**Drought:**
- **Level 1** (Minor): <20% crop loss, water access normal
- **Level 2** (Moderate): 20-50% crop loss or water impacted
- **Level 3** (Severe): 50-80% crop loss
- **Level 4** (Destroyed): >80% crop loss, complete livelihood loss

#### Vulnerability Points

| Factor | Points | Category |
|--------|--------|----------|
| Elderly head (>65 years) | +2 | Demographic |
| Children under 5 | +2 | Demographic |
| Female-headed household | +1 | Demographic |
| Household size >6 | +2 | Demographic |
| Low income (≤M3,000/month) | +3 | Economic |
| Middle income (M3,001–M10,000) | +1 | Economic |
| High income (>M10,001) | +0 | Economic |

**Composite Score = Damage Level + Total Vulnerability Points**

#### Aid Tiers

| Score Range | Tier | Typical Packages |
|-------------|------|-----------------|
| 0–3 | Basic Support | Food, Tarpaulin, Water, Blanket, Medical |
| 4–6 | Shelter + Food + Cash | Tent, Food, Cash, Water, Furniture |
| 7–9 | Tent + Reconstruction + Food | Tent, Re-roof, Food, Cash, Livelihood, Furniture |
| ≥10 | Priority Reconstruction + Livelihood | Reconstruction Grant, Tent, Livelihood, Cash, Livestock, Water Tank |

---

## API Endpoints

### Household Assessment Endpoints

#### POST /api/allocation/assessments
**Create household assessment**

```bash
curl -X POST http://localhost:5000/api/allocation/assessments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "disasterId": "507f1f77bcf86cd799439011",
    "householdId": "HH-2026-001",
    "headOfHousehold": {
      "name": "John Chirwa",
      "age": 45,
      "gender": "Male"
    },
    "householdSize": 7,
    "childrenUnder5": 2,
    "monthlyIncome": 2500,
    "disasterType": "Heavy Rainfall",
    "damageDescription": "Roof partially damaged, 30% of crops destroyed",
    "damageSeverityLevel": 2,
    "damageDetails": {
      "roomsAffected": 1,
      "cropLossPercentage": 30
    },
    "assessedBy": "Data Clerk"
  }'
```

**Response (201):**
```json
{
  "message": "Assessment created successfully",
  "assessment": {
    "_id": "507f1f77bcf86cd799439012",
    "householdId": "HH-2026-001",
    "incomeCategory": "Low",
    "status": "Pending Review",
    "createdAt": "2026-02-22T10:00:00Z"
  }
}
```

#### GET /api/allocation/assessments/:disasterId
**Get all assessments for a disaster**

```bash
curl -X GET "http://localhost:5000/api/allocation/assessments/507f1f77bcf86cd799439011?status=Pending%20Review" \
  -H "Authorization: Bearer <token>"
```

### Scoring Endpoints

#### POST /api/allocation/calculate-score
**Calculate allocation score for assessment**

```bash
curl -X POST http://localhost:5000/api/allocation/calculate-score \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assessmentId": "507f1f77bcf86cd799439012"
  }'
```

**Response:**
```json
{
  "compositeScore": 6,
  "damageLevel": 2,
  "vulnerabilityPoints": {
    "elderlyHeadScore": 0,
    "childrenUnder5Score": 2,
    "femaleHeadedScore": 0,
    "largeFamilyScore": 2,
    "incomeScore": 3
  },
  "aidTier": "Shelter + Food + Cash (4-6)",
  "scoreBreakdown": {
    "damageComponent": 2,
    "vulnerabilityComponent": 4,
    "totalScore": 6
  }
}
```

### Allocation Request Endpoints

#### POST /api/allocation/create-request
**Create aid allocation request**

```bash
curl -X POST http://localhost:5000/api/allocation/create-request \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assessmentId": "507f1f77bcf86cd799439012",
    "disasterId": "507f1f77bcf86cd799439011"
  }'
```

**Response (201):**
```json
{
  "message": "Allocation request created successfully",
  "requestId": "AL-1708607200000-abc123def456",
  "allocationRequest": {
    "compositeScore": 6,
    "aidTier": "Shelter + Food + Cash (4-6)",
    "allocatedPackages": [
      {
        "packageId": "PKG_TENT_001",
        "packageName": "Emergency Tent",
        "quantity": 1,
        "unitCost": 6500,
        "totalCost": 6500
      },
      {
        "packageId": "PKG_FOOD_001",
        "packageName": "Food Parcel",
        "quantity": 1,
        "unitCost": 800,
        "totalCost": 800
      },
      {
        "packageId": "PKG_CASH_001",
        "packageName": "Cash Transfer (3 months)",
        "quantity": 1,
        "unitCost": 3000,
        "totalCost": 3000
      }
    ],
    "totalEstimatedCost": 10300,
    "status": "Proposed"
  }
}
```

#### PUT /api/allocation/requests/:requestId/approve
**Approve allocation request**

```bash
curl -X PUT http://localhost:5000/api/allocation/requests/AL-1708607200000-abc123def456/approve \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "justification": "Score-based allocation approved per standard rules"
  }'
```

### Allocation Plan Endpoints

#### POST /api/allocation/plans
**Generate comprehensive allocation plan**

```bash
curl -X POST http://localhost:5000/api/allocation/plans \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "disasterId": "507f1f77bcf86cd799439011",
    "planName": "Heavy Rainfall Allocation Plan - February 2026"
  }'
```

**Response (201):**
```json
{
  "message": "Allocation plan generated successfully",
  "plan": {
    "planId": "PL-507f1f77bcf86cd799439011-1708607200000",
    "totalHouseholdsCovered": 150,
    "totalBudgetRequired": 1547500,
    "procurementSummary": [
      {
        "packageId": "PKG_TENT_001",
        "packageName": "Emergency Tent",
        "totalQuantity": 45,
        "unitCost": 6500,
        "totalCost": 292500
      }
    ],
    "vulnerabilityDistribution": {
      "tier0_3": { "count": 40, "percentage": "26.67" },
      "tier4_6": { "count": 75, "percentage": "50.00" },
      "tier7_9": { "count": 30, "percentage": "20.00" },
      "tier10Plus": { "count": 5, "percentage": "3.33" }
    },
    "status": "Draft"
  }
}
```

#### GET /api/allocation/plans/:disasterId
**Get allocation plans for disaster**

```bash
curl -X GET http://localhost:5000/api/allocation/plans/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <token>"
```

### Dashboard Endpoints

#### GET /api/allocation/dashboard-stats/:disasterId
**Get financial dashboard statistics**

```bash
curl -X GET http://localhost:5000/api/allocation/dashboard-stats/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "pendingAssessments": 15,
  "pendingAllocations": 8,
  "approvedAllocations": 120,
  "approvedTotal": 1200000,
  "disbursedAllocations": 95,
  "disbursedTotal": 950000,
  "estimatedNeed": 1250000
}
```

---

## User Interface Components

### 1. Allocation Dashboard
- **Location**: `/pages/AllocationDashboard.jsx`
- **Features**:
  - Real-time statistics (pending, approved, disbursed)
  - Vulnerability score distribution (pie chart)
  - Budget status (bar chart)
  - Tabbed interface for assessments, allocations, plans

### 2. Household Assessment Form
- **Location**: `/components/HouseholdAssessmentForm.jsx`
- **Features**:
  - Multi-step form for household data entry
  - Disaster-specific damage assessment fields
  - Location tracking
  - Income categorization
  - Real-time validation

### 3. Allocation Request Form
- **Location**: `/components/AllocationRequestForm.jsx`
- **Features**:
  - Assessment selection
  - Automatic score calculation display
  - Package preview
  - Override capability with justification
  - Step-by-step workflow

### 4. Allocation Plan Viewer
- **Location**: `/components/AllocationPlanViewer.jsx`
- **Features**:
  - Comprehensive plan summary
  - Itemized procurement table
  - Vulnerability distribution
  - Individual household allocations
  - Export to PDF/Excel (future)

---

## Workflow

### Standard Workflow

```
1. Create Household Assessment
   ↓
2. System calculates Damage Level + Vulnerability Points
   ↓
3. Composite Score determines Aid Tier
   ↓
4. Auto-assign relevant packages for that tier
   ↓
5. Create Allocation Request (system-generated)
   ↓
6. Finance Officer reviews and approves
   ↓
7. Generate Allocation Plan from approved requests
   ↓
8. Procurement team executes based on itemized plan
   ↓
9. Track disbursement and audit trail
```

### Override Workflow

When score-based allocation is inappropriate:

```
1. Create Assessment
2. Calculate Score
3. Select "This is an override"
4. Provide override reason + detailed justification (min. 50 chars)
5. System marks as "Pending Approval" 
6. Requires explicit approval by Finance Officer
7. Full audit trail logged with justification
```

---

## Governance & Audit

### Access Control

| Role | Permissions |
|------|-------------|
| Data Clerk | Create assessments, View assessments |
| Coordinator | Create assessments, Calculate scores, View all data |
| Finance Officer | Calculate scores, Create/approve allocations, Generate plans |
| Administrator | Full access, Override authority, Access audit logs |

### Audit Trail

All actions are logged with:
- **Action Type**: CREATE, APPROVE, UPDATE, OVERRIDE
- **Entity Type**: HouseholdAssessment, AidAllocationRequest, AllocationPlan
- **Performed By**: User ID and role
- **Timestamp**: Exact time of action
- **Changes**: Before/after values (for updates)
- **Reason**: Justification for action
- **Override Details**: Full justification text (for overrides)

### Prevention of Embezzlement

1. **Fixed Package Costs**: No custom pricing, all costs predetermined
2. **Itemized Procurement**: Every package specifies quantity × unit price × vendor
3. **No Lump Sums**: Budgets are never given as lump sums
4. **Audit Trail**: Every decision logged with justification
5. **Multi-level Approval**: Finance Officer must approve each allocation
6. **Transparent Scoring**: Automatic calculation removes discretion

---

## Data Model Reference

### HouseholdAssessment
```javascript
{
  householdId: String,
  headOfHousehold: {
    name: String,
    age: Number,
    gender: String
  },
  householdSize: Number,
  childrenUnder5: Number,
  monthlyIncome: Number,
  incomeCategory: String, // Low, Middle, High
  disasterType: String, // Heavy Rainfall, Strong Winds, Drought
  damageDescription: String,
  damageSeverityLevel: Number, // 1-4
  damageDetails: {
    roofDamage, cropLossPercentage, livestockLoss, etc.
  },
  status: String, // Pending Review, Approved, Allocated, Disbursed
  assessmentDate: Date
}
```

### AidAllocationRequest
```javascript
{
  requestId: String,
  householdAssessmentId: ObjectId,
  damageLevel: Number,
  vulnerabilityPoints: {},
  compositeScore: Number,
  aidTier: String,
  allocatedPackages: [
    {
      packageId, packageName, quantity, unitCost, totalCost
    }
  ],
  totalEstimatedCost: Number,
  status: String, // Proposed, Pending Approval, Approved, Disbursed
  isOverride: Boolean,
  overrideJustification: String
}
```

### AllocationPlan
```javascript
{
  planId: String,
  disasterId: ObjectId,
  totalBudgetRequired: Number,
  allocations: [], // Individual household allocations
  procurementSummary: [], // Aggregated by package
  vulnerabilityDistribution: {}, // Counts by tier
  disasterTypeBreakdown: {}, // Cost by disaster type
  status: String // Draft, Pending Review, Approved, In Progress, Completed
}
```

---

## Setup & Installation

### Backend Setup

1. **Install Models**: Models already created in `/models/`
2. **Seed Packages**:
   ```bash
   node scripts/seedAssistancePackages.js
   ```
3. **Update Server**: Routes already added to `server.js`
4. **Start Server**:
   ```bash
   npm start
   ```

### Frontend Setup

1. **React Components**: All components created in `/components/` and `/pages/`
2. **Add to Navbar**: Import `AllocationDashboard` and add route
3. **Install Dependencies**: Ensure recharts is installed
   ```bash
   npm install recharts
   ```

---

## Testing Scenarios

### Scenario 1: Basic Support Case
- Head age: 40, Monthly income: M2,500 (Low)
- Heavy rainfall, 1 room affected, 15% crop loss
- Household size: 5, 1 child under 5
- **Expected Score**: 1 (damage) + 2 (children) + 3 (income) = 6
- **Result**: Shelter + Food + Cash

### Scenario 2: Priority Reconstruction
- Head age: 72 (elderly), Monthly income: M5,000 (Middle)
- Strong winds, roof 80% destroyed
- Household size: 8, 2 children under 5
- **Expected Score**: 3 (damage) + 2 (elderly) + 2 (children) + 2 (size) + 1 (income) = 10
- **Result**: Priority Reconstruction + Livelihood

### Scenario 3: Drought Livelihood
- Female-headed household, Monthly income: M2,000 (Low)
- Drought, 70% crop loss, water access impacted
- Household size: 4
- **Expected Score**: 3 (damage) + 1 (female) + 3 (income) = 7
- **Result**: Tent + Reconstruction + Food

---

## Reports & Analytics

### Available Metrics
- Assessments completed per disaster type
- Average composite score by disaster type
- Package distribution and costs
- Budget vs. actual spending
- Vulnerability tier distribution
- Geographic distribution of aid

### Export Formats
- PDF: Comprehensive plan with itemization
- Excel: Detailed tables for procurement planning
- CSV: Raw data for external analysis

---

## Troubleshooting

### Issue: Scores not calculating
- Verify assessment data is complete
- Check all required fields are filled
- Ensure disaster type is valid

### Issue: Packages not assigned
- Verify assistance packages are seeded
- Check package applicability to disaster type
- Confirm score is within package range

### Issue: Audit trail not showing
- User may lack "Administrator" role
- Check audit log collection in MongoDB
- Verify timestamps are correct

---

## Future Enhancements

1. **Machine Learning**: Predict assistance needs based on historical patterns
2. **Mobile App**: Data collectors can use smartphones
3. **GPS Integration**: Auto-map household locations
4. **Multi-language**: Support for local languages
5. **Blockchain**: Immutable audit trail
6. **Community Feedback**: Beneficiary rating system
7. **Real-time Tracking**: GPS-enabled item tracking
8. **CMS Integration**: Connect with Common Humanitarian Marketplace

---

## Contact & Support

For questions or issues, contact the DMIS development team.

**Last Updated**: February 22, 2026
**Version**: 1.0
**Status**: Production Ready
