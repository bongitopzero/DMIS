# Financial Allocation Module - Integration Guide

## Step-by-Step Integration into Existing DMIS Application

### Step 1: Add Sidebar Navigation Link

**File**: `dmis-ui/src/components/sidebar.jsx`

Add this link to your navigation:

```jsx
import { FileText, DollarSign } from "lucide-react";

// In your navigation links array, add:
{
  label: "Financial Allocation",
  icon: DollarSign,
  href: "/allocation-dashboard",
  roles: ["Finance Officer", "Administrator", "Coordinator"]
}
```

### Step 2: Add Route to App

**File**: `dmis-ui/src/App.js`

Add this route:

```jsx
import AllocationDashboard from "./pages/AllocationDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

// In your Routes component:
<Route 
  path="/allocation-dashboard" 
  element={
    <ProtectedRoute 
      component={AllocationDashboard}
      allowedRoles={["Finance Officer", "Administrator", "Coordinator"]}
    />
  } 
/>
```

### Step 3: Update Navbar Quick Actions

**File**: `dmis-ui/src/components/navbar.jsx`

Add allocation button to the "New Request" dropdown:

```jsx
// Add to your action menu
{
  label: "New Assessment",
  icon: FileText,
  action: () => navigate("/allocation-dashboard"),
  color: "bg-blue-600"
},
{
  label: "New Allocation Request",  
  icon: DollarSign,
  action: () => navigate("/allocation-dashboard"),
  color: "bg-green-600"
}
```

### Step 4: Import Dependencies in UI Components

Ensure these are installed:

```bash
cd dmis-ui
npm install recharts
npm install lucide-react  # If not already installed
```

### Step 5: Update Backend Server Configuration

**File**: `dmis-api/server.js`

The allocation routes are already added. Verify:

```javascript
const allocationRoutes = require("./routes/allocation.js");
app.use("/api/allocation", allocationRoutes);
```

### Step 6: Run Database Seed Script

Initialize the assistance packages once:

```bash
cd dmis-api
node scripts/seedAssistancePackages.js
```

**Output**:
```
✅ Successfully seeded 18 assistance packages:

   • PKG_FOOD_001: Food Parcel - M800
   • PKG_TARP_001: Tarpaulin Kit - M2,000
   • PKG_TENT_001: Emergency Tent - M6,500
   ... (etc)
```

### Step 7: Verify API Connectivity

Test the API from React:

```bash
# Get dashboard stats for a test disaster
curl http://localhost:5000/api/allocation/dashboard-stats/DISASTER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 8: Update User Roles (if needed)

**File**: `dmis-api/scripts/fixAdminRole.js` or similar

Ensure these roles exist in your User collection:
- Finance Officer
- Administrator
- Coordinator
- Data Clerk

### Step 9: Test the Integration

1. **Login** as Finance Officer
2. Navigate to **Financial Allocation** dashboard
3. Click **"New Assessment"** button
4. Fill in household data for a test disaster
5. Click **"New Allocation"** button
6. Select the assessment you just created
7. Verify the score calculation
8. Confirm allocation request is created
9. Test the **Dashboard Statistics** update

### Step 10: Add to Dashboard Welcome Page

**File**: `dmis-ui/src/pages/Dashboard.jsx` or similar

Add a card linking to Financial Allocation:

```jsx
<div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg hover:shadow-lg transition-all cursor-pointer" 
  onClick={() => navigate("/allocation-dashboard")}>
  <DollarSign className="h-8 w-8 text-green-600 mb-2" />
  <h3 className="font-semibold text-slate-900">Financial Allocation</h3>
  <p className="text-sm text-slate-600 mt-1">Manage fair aid distribution</p>
  <p className="text-xs text-green-600 font-medium mt-3">→ Open Dashboard</p>
</div>
```

---

## Component Dependency Tree

```
App.js
├── AllocationDashboard (main page)
│   ├── HouseholdAssessmentForm
│   │   └── Toast notifications
│   ├── AllocationRequestForm
│   │   └── Toast notifications
│   ├── Charts (Recharts)
│   │   ├── PieChart (vulnerability distribution)
│   │   └── BarChart (budget status)
│   └── Data Tables
└── Sidebar
    └── Navigation link
```

## API Integration Flow

```
Frontend (React)
    ↓
    ├─→ POST /api/allocation/assessments
    │    └─→ HouseholdAssessment model
    │         └─→ Audit log
    │
    ├─→ POST /api/allocation/calculate-score
    │    └─→ Scoring engine
    │         └─→ AidAllocationRequest
    │
    ├─→ POST /api/allocation/create-request
    │    ├─→ Package assignment
    │    └─→ Audit log
    │
    └─→ POST /api/allocation/plans
         └─→ AllocationPlan aggregation
```

## Environment Setup for Development

### Backend (.env)
```
MONGODB_URI=mongodb://localhost:27017/dmis
NODE_ENV=development
PORT=5000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000
```

## File Manifest

### Backend Files Created/Modified
- ✅ `dmis-api/models/HouseholdAssessment.js` - NEW
- ✅ `dmis-api/models/AidAllocationRequest.js` - NEW
- ✅ `dmis-api/models/AllocationPlan.js` - NEW
- ✅ `dmis-api/models/AssistancePackage.js` - NEW
- ✅ `dmis-api/controllers/allocationController.js` - NEW
- ✅ `dmis-api/routes/allocation.js` - NEW
- ✅ `dmis-api/utils/assistancePackages.js` - NEW
- ✅ `dmis-api/utils/allocationScoringEngine.js` - NEW
- ✅ `dmis-api/scripts/seedAssistancePackages.js` - NEW
- ✅ `dmis-api/server.js` - MODIFIED (added allocation routes)

### Frontend Files Created/Modified
- ✅ `dmis-ui/src/components/HouseholdAssessmentForm.jsx` - NEW
- ✅ `dmis-ui/src/components/AllocationRequestForm.jsx` - NEW
- ✅ `dmis-ui/src/components/AllocationPlanViewer.jsx` - NEW
- ✅ `dmis-ui/src/pages/AllocationDashboard.jsx` - NEW

### Documentation Files
- ✅ `FINANCIAL_ALLOCATION_IMPLEMENTATION.md` - NEW
- ✅ `FINANCIAL_ALLOCATION_QUICK_REF.md` - NEW

## Feature Checklist

### Core Features
- [x] Household assessment data collection
- [x] Damage severity scoring (1-4 levels)
- [x] Vulnerability point calculation
- [x] Composite score calculation
- [x] Aid tier assignment (0-3, 4-6, 7-9, 10+)
- [x] Automatic package assignment
- [x] Override capability with justification
- [x] Allocation plan generation
- [x] Itemized procurement tracking

### UI Features
- [x] Dashboard with KPI cards
- [x] Vulnerability distribution chart
- [x] Budget status chart
- [x] Household assessment form
- [x] Allocation request form
- [x] Multi-step workflow
- [x] Data tables
- [x] Status badges

### Backend Features
- [x] Assessment CRUD operations
- [x] Score calculation endpoint
- [x] Allocation request creation
- [x] Approval workflow
- [x] Plan generation
- [x] Dashboard statistics
- [x] Audit logging
- [x] Access control by role

### Governance Features
- [x] Fixed unit costs (no custom pricing)
- [x] Itemized procurement (qty × price × vendor)
- [x] Multi-level approval
- [x] Comprehensive audit trail
- [x] Override justification requirements
- [x] Role-based access control

---

## Database Indexes

The system automatically creates indexes on:
- `HouseholdAssessment`: `disasterId`, `status`
- `AidAllocationRequest`: `disasterId`, `status`, `householdId`
- `AllocationPlan`: `disasterId`, `status`

These ensure fast queries for common operations.

---

## Testing the System End-to-End

### Test Case 1: Complete Flow
1. Create a disaster (if not exists)
2. Create household assessment
3. Verify score calculation
4. Create allocation request
5. Approve allocation
6. Generate allocation plan
7. Verify budget calculations

### Test Case 2: Override Flow
1. Create assessment
2. Calculate score
3. Select "This is an override"
4. Enter override reason and justification
5. Verify "Pending Approval" status
6. Approve with justification
7. Check audit log for override details

### Test Case 3: Dashboard Statistics
1. Create multiple assessments
2. Create allocations
3. Verify dashboard counts update
4. Check chart data accuracy
5. Verify total budget calculations

---

## Troubleshooting Integration Issues

### Issue: Allocation button not appearing
**Solution**: Check user role includes "Finance Officer", "Administrator", or "Coordinator"

### Issue: API returns 404
**Solution**: 
1. Verify allocation routes are in server.js
2. Check MongoDB connection
3. Restart backend server

### Issue: Packages not loading in form
**Solution**:
1. Run seed script: `node scripts/seedAssistancePackages.js`
2. Verify AssistancePackage collection has data
3. Check API response for packages

### Issue: Charts not rendering
**Solution**:
1. Check recharts is installed: `npm list recharts`
2. Verify data is returned from API
3. Check browser console for errors

### Issue: Form validation failing
**Solution**:
1. Fill all required fields (marked with *)
2. Check age is ≥ 18
3. Verify household size is > 0

---

## Performance Optimization Tips

1. **Lazy load components**:
   ```jsx
   const AllocationDashboard = lazy(() => 
     import('./pages/AllocationDashboard')
   );
   ```

2. **Use React.memo for charts** to prevent re-renders

3. **Add pagination to data tables** for large datasets

4. **Cache assistance packages** on first load

5. **Use database indexes** (already configured)

---

## Post-Integration Checklist

- [ ] Module appears in sidebar navigation
- [ ] Routes work (can navigate to /allocation-dashboard)
- [ ] Forms submit successfully
- [ ] API calls return correct data
- [ ] Dashboard charts display
- [ ] Scores calculate correctly
- [ ] Audit logs are created
- [ ] Overrides are tracked
- [ ] Plans generate without errors
- [ ] User access control works
- [ ] No console errors
- [ ] No MongoDB errors
- [ ] Performance is acceptable

---

## Support & Documentation

For detailed information see:
- `FINANCIAL_ALLOCATION_IMPLEMENTATION.md` - Complete guide
- `FINANCIAL_ALLOCATION_QUICK_REF.md` - Quick reference for developers

---

**Integration Date**: February 22, 2026
**Version**: 1.0
**Status**: Ready for Integration
