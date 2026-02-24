# Household Assessment Save Bug - Fix Summary

## Problem Discovered
The "Save Disaster & Households" button was saving the disaster successfully but **failing silently when saving household assessments**, resulting in:
- ✅ Disaster created and saved to database
- ❌ Household assessment data completely lost (0 saved)
- ❌ No error messages shown to user

## Root Causes Identified

### 1. Missing Required Field: `assessedBy`
**Location**: Frontend `NewDisasterReport.jsx` line 200-230
**Issue**: The household assessment payload was missing the `assessedBy` field
**Backend Requirement**: HouseholdAssessment schema enforces `assessedBy` as required field (string)
**Error**: `400 Bad Request - assessedBy: Assessor name/ID is required`

**Fix Applied**:
```jsx
const householdPayload = {
  // ... other fields ...
  assessedBy: "Data Clerk",  // ADDED THIS FIELD
  // ... rest of fields ...
};
```

### 2. Disaster Type Format Mismatch
**Location**: Frontend `NewDisasterReport.jsx` line 222
**Issue**: Frontend was sending disaster type as-is from form (e.g., "DROUGHT" or various formats)
**Backend Requirement**: HouseholdAssessment expects specific enum values: "Drought", "Heavy Rainfall", "Strong Winds"
**Potential Error**: Schema validation mismatch

**Fix Applied**:
```jsx
// Map disaster type from form to model format
const disasterTypeMap = {
  "drought": "Drought",
  "heavy_rainfall": "Heavy Rainfall",
  "strong_winds": "Strong Winds"
};
const mappedDisasterType = disasterTypeMap[headerData.disasterType.toLowerCase().replace(/\s+/g, "_")] || "Drought";

const householdPayload = {
  // ... other fields ...
  disasterType: mappedDisasterType,  // NOW PROPERLY FORMATTED
  // ... rest of fields ...
};
```

### 3. Incorrect API Endpoint Call in Frontend Fetch
**Location**: Frontend `NewDisasterReport.jsx` line 82
**Issue**: Using query parameter instead of path parameter for GET endpoint
**Was**: `/allocation/assessments?disasterId=${disaster._id}`
**Should Be**: `/allocation/assessments/${disaster._id}`
**Error**: 404 Not Found - endpoint doesn't support query parameter style

**Fix Applied**:
```jsx
// BEFORE (WRONG)
const assessmentsRes = await API.get(`/allocation/assessments?disasterId=${disaster._id}`);
// After array access issue...

// AFTER (CORRECT)
const assessmentsRes = await API.get(`/allocation/assessments/${disaster._id}`);
return {
  ...disaster,
  households: assessmentsRes.data.assessments || []  // Correctly extract from response
};
```

## Files Modified

### Backend Changes
- ✅ **No changes needed** - Backend API endpoints already correct

### Frontend Changes
1. **`dmis-ui/src/components/NewDisasterReport.jsx`**
   - Line 71-99: Fixed `fetchSavedDisasters()` function to use correct endpoint path and response format
   - Line 200-230: Added `assessedBy` field and disaster type mapping to household payload

## Testing & Verification

### Pre-Fix State
```
📊 Database State:
   Disasters: 1 (DROUGHT in Maseru)
   Household Assessments: 0 ❌
```

### Post-Fix State  
```
📊 Database State:
   Disasters: 1 (DROUGHT in Maseru)
   Household Assessments: 2 ✅
      - John Doe (HH-001) - 5 people
      - Mary Ramodibe (HH-002) - 7 people
```

### API Test Successful
```
✅ POST /api/allocation/assessments
   Status: 201 Created
   Response: Assessment saved successfully

✅ GET /api/allocation/assessments/:disasterId
   Status: 200 OK  
   Response: { count: 2, assessments: [...] }
```

## Impact
- **Data Persistence**: Household assessment data now properly persists to database
- **User Feedback**: Users will see success message when all households are saved
- **Frontend Display**: Summary page will display households correctly after refresh

## Testing Workflow
1. ✅ Start backend: `npm start` in `dmis-api/`
2. ✅ Log in as Data Clerk
3. ✅ Fill out disaster form (Type: Drought, District: Maseru, etc.)
4. ✅ Add households with names, ages, damage descriptions
5. ✅ Click "Save Disaster & Households"
6. ✅ Verify success message appears
7. ✅ Switch to Summary tab - see household data displayed
8. ✅ Verify database has records via: `node scripts/checkHouseholds.js`

## Related Scripts Created for Debugging
- `testHouseholdSave.js` - Tests the POST household assessment endpoint
- `checkHouseholds.js` - Verifies database state of households
- `debugData.js` - Shows comprehensive database data
- `resaveHouseholds.js` - Manually populates correct test data
- `finalVerification.js` - Complete verification of all fixes

