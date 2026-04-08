# DMIS Aid Allocation Flow

## Current State (AidAllocation.jsx)

```
1. Load Page → BudgetBanner (Green/Red)
2. Select Disaster (dropdown all verified)
3. Tab 'Assess' → Households table loads /allocation/assessments/:id
4. Tab 'Plan' → Generate Plan button
   - Scores households (vuln + damage)
   - Assigns packages (Drought score10 = M7.5k)
   - Shows table: HH, Score, Tier, Cost, Allocate button
5. Click Allocate → POST /request (incidentId, amount, urgency, purpose)
6. Backend commits budget, logs audit
7. Button → "Allocated ✓" (local Set)
```

## Issues:
- Local Set lost on refresh → Disaster stays in dropdown → Dup possible
- Committed ↓ but no persistent "allocated" flag
- No allocated table / refund

## Fixed Flow:
```
1. Disaster dropdown: Only !allocatedAid (backend field)
2. Allocate → FundRequest + Disaster.allocatedAid = true + AuditLog
3. New Tab 'Allocated':
   GET /aid-allocations/:disasterId → FundRequests table
   Revert button: PUT /request/:id/refund → committed -= amount + allocatedAid=false
4. AuditTrail reflects all
```

**Next:** Add allocatedAid to Disaster model + routes + Aid.jsx allocated tab + refund.
