# Financial Allocation - Developer Quick Reference

## File Structure

```
dmis-api/
├── models/
│   ├── HouseholdAssessment.js       # Household assessment data
│   ├── AidAllocationRequest.js      # Aid allocation requests
│   ├── AllocationPlan.js            # Comprehensive allocation plans
│   └── AssistancePackage.js         # Predefined packages with unit costs
├── controllers/
│   └── allocationController.js      # Main business logic
├── routes/
│   └── allocation.js                # API endpoints
├── utils/
│   ├── assistancePackages.js        # Package definitions & rules
│   └── allocationScoringEngine.js   # Scoring algorithm
└── scripts/
    └── seedAssistancePackages.js    # Initialize packages

dmis-ui/
├── components/
│   ├── HouseholdAssessmentForm.jsx  # Create assessments
│   ├── AllocationRequestForm.jsx    # Create allocations
│   └── AllocationPlanViewer.jsx     # View plans
└── pages/
    └── AllocationDashboard.jsx      # Main dashboard
```

## Quick API Tests

### 1. Seed Packages
```bash
cd dmis-api
node scripts/seedAssistancePackages.js
```

### 2. Create Assessment
```bash
curl -X POST http://localhost:5000/api/allocation/assessments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "disasterId": "DISASTER_ID",
    "householdId": "HH-001",
    "headOfHousehold": {"name": "Test User", "age": 45, "gender": "Male"},
    "householdSize": 4,
    "childrenUnder5": 1,
    "monthlyIncome": 3000,
    "disasterType": "Heavy Rainfall",
    "damageDescription": "Roof leak",
    "damageSeverityLevel": 1,
    "assessedBy": "Assessor"
  }'
```

### 3. Calculate Score
```bash
curl -X POST http://localhost:5000/api/allocation/calculate-score \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"assessmentId": "ASSESSMENT_ID"}'
```

### 4. Create Allocation
```bash
curl -X POST http://localhost:5000/api/allocation/create-request \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assessmentId": "ASSESSMENT_ID",
    "disasterId": "DISASTER_ID"
  }'
```

### 5. Approve Allocation
```bash
curl -X PUT http://localhost:5000/api/allocation/requests/REQUEST_ID/approve \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"justification": "Score-based allocation approved"}'
```

### 6. Generate Plan
```bash
curl -X POST http://localhost:5000/api/allocation/plans \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "disasterId": "DISASTER_ID",
    "planName": "Allocation Plan 2026"
  }'
```

## Key Functions

### Scoring Engine (`utils/allocationScoringEngine.js`)

```javascript
// Calculate damage level (1-4)
const damageLevel = calculateDamageLevel(assessment);

// Calculate vulnerability points
const vulnerabilityPoints = calculateVulnerabilityPoints(assessment);

// Get composite score
const { compositeScore, scoreBreakdown } = calculateCompositeScore(assessment);

// Get aid tier string
const tier = getAidTier(compositeScore); // e.g., "Shelter + Food + Cash (4-6)"

// Validate override
const override = validateOverride(action, justification);
```

### Assistance Packages (`utils/assistancePackages.js`)

```javascript
// Get applicable packages by tier and disaster type
const packages = getPackagesByTier(compositeScore, disasterType);

// Get allocation rules for tier
const rules = getAllocationRulesForTier(tier);

// Access package definitions
const pkg = ASSISTANCE_PACKAGES.FOOD_PARCEL;
// { packageId, name, unitCost, category, ... }
```

## Scoring Examples

### Example 1: Basic Support (Score 3)
```
Household: John, age 40, monthly income M2,500
Disaster: Heavy rainfall, 1 room damaged, 10% crop loss
Household size: 4, 1 child under 5

Damage Level: 1 (minor damage, <20% crop loss)
Vulnerability:
  - Children under 5: +2
  - Low income (≤M3,000): +3
  - No elderly: +0
  - Family size ≤6: +0
  - Male-headed: +0
Total: 1 + 2 + 3 = 6 → "Shelter + Food + Cash"
```

### Example 2: Priority (Score 10+)
```
Household: Grace (F), age 68, monthly income M2,000
Disaster: Drought, 85% crop loss, water scarce
Household size: 8, 3 children under 5

Damage Level: 4 (>80% crop loss)
Vulnerability:
  - Elderly (>65): +2
  - Children under 5: +2
  - Female-headed: +1
  - Large family (>6): +2
  - Low income (≤M3,000): +3
Total: 4 + 2 + 2 + 1 + 2 + 3 = 14 → "Priority Reconstruction + Livelihood"
```

## Database Lookups

### Get pending assessments
```javascript
const assessments = await HouseholdAssessment.find({
  disasterId,
  status: 'Pending Review'
});
```

### Get approved allocations for plan
```javascript
const allocations = await AidAllocationRequest.find({
  disasterId,
  status: 'Approved'
}).populate('householdAssessmentId');
```

### Check for overrides (audit)
```javascript
const overrides = await AidAllocationRequest.find({
  disasterId,
  isOverride: true
});
```

## Common Queries

### Dashboard statistics
```javascript
const stats = {
  pending: await HouseholdAssessment.countDocuments({ 
    disasterId, 
    status: 'Pending Review' 
  }),
  approved: await AidAllocationRequest.countDocuments({ 
    disasterId, 
    status: 'Approved' 
  }),
  totalBudget: await AidAllocationRequest.aggregate([
    { $match: { disasterId, status: 'Approved' } },
    { $group: { _id: null, total: { $sum: '$totalEstimatedCost' } } }
  ])
};
```

## Audit Trail

All actions logged to AuditLog:
```javascript
{
  actionType: 'CREATE|APPROVE|UPDATE|OVERRIDE',
  entityType: 'HouseholdAssessment|AidAllocationRequest|AllocationPlan',
  entityId: ObjectId,
  disasterId: ObjectId,
  performedBy: UserId,
  performerRole: 'Finance Officer',
  newValues: { ...data },
  reason: 'Description',
  timestamp: Date
}
```

## Error Codes

| Error | Cause | Solution |
|-------|-------|----------|
| 400 | Missing required fields | Check all required fields are provided |
| 403 | Insufficient permissions | User role doesn't have permission |
| 404 | Resource not found | Verify IDs are correct |
| 500 | Server error | Check server logs |

## Environment Variables

```
MONGODB_URI=mongodb://localhost/dmis
NODE_ENV=production
PORT=5000
```

## Performance Tips

1. **Indexing**: Queries use indexes on `disasterId`, `status`, `householdId`
2. **Pagination**: Add limit/skip for large datasets
3. **Caching**: Cache assistance packages (rarely change)
4. **Aggregation**: Use MongoDB aggregation for reports

## Testing Checklist

- [ ] Create assessment with minimum data
- [ ] Calculate score returns correct tier
- [ ] Create allocation assigns packages
- [ ] Approve allocation updates status
- [ ] Generate plan aggregates correctly
- [ ] Override requires justification
- [ ] Audit trail logs all actions
- [ ] Dashboard stats are accurate

## Common Issues

**Issue**: Assessment not showing in list
**Solution**: Check status filter, verify disasterId matches

**Issue**: Score is 0
**Solution**: Verify assessment data is complete, check incomeCategory

**Issue**: No packages assigned
**Solution**: Verify AssistancePackages are seeded, check disaster type

**Issue**: Plan shows zero cost
**Solution**: Check allocations are approved, verify package unit costs

---

**Last Updated**: February 22, 2026
**Version**: 1.0
