# Financial Tracking Module - Quick Reference

## Installation

1. Copy models to `/dmis-api/models/`:
   - `BudgetAllocation.js`
   - `Expense.js`
   - `AuditLog.js`

2. Copy controller to `/dmis-api/controllers/`:
   - `financialController.js`

3. Copy routes to `/dmis-api/routes/`:
   - `financial.js`

4. Copy utilities to `/dmis-api/utils/`:
   - `financialUtils.js`

5. Add to `server.js`:
```javascript
const financialRoutes = require('./routes/financial');
app.use('/api/financial', financialRoutes);
```

---

## Key Features

### ✅ Budget Management
- Create budget allocations
- Approve budgets (makes immutable)
- Void budgets (with reason)
- View breakdown by category

### ✅ Expense Logging
- Log expenses against approved budgets
- Automatic duplicate invoice detection
- Budget validation before logging
- Support file attachments

### ✅ Approval Workflow
- Pending/Approved/Rejected states
- Supporting documentation required
- Budget overrun prevention
- Real-time budget status

### ✅ Audit Trail
- Immutable log of all actions
- Before/after values tracked
- Who/what/when/why recorded
- Cannot be modified or deleted

### ✅ Business Rules
- No budget = no expenses
- Expenses cannot exceed budget
- Approved budgets are immutable
- No duplicate invoices
- No delete operations (void only)

---

## Common Operations

### Create Budget
```javascript
POST /api/financial/budgets
{
  "disasterId": "...",
  "category": "Food & Water",
  "allocatedAmount": 50000,
  "approvedBy": "John Doe",
  "approvalDate": "2026-02-20T10:00:00Z",
  "createdBy": "user123"
}
```

### Approve Budget
```javascript
PUT /api/financial/budgets/:id/approve
{
  "approverId": "admin123"
}
```

### Log Expense
```javascript
POST /api/financial/expenses
{
  "disasterId": "...",
  "category": "Food & Water",
  "vendorName": "ABC Supplies",
  "vendorRegistrationNumber": "REG-123",
  "invoiceNumber": "INV-001",
  "amount": 5000,
  "supportingDocumentUrl": "https://...",
  "userId": "user123"
}
```

### Approve Expense
```javascript
PUT /api/financial/expenses/:id/approve
{
  "approverId": "finance123"
}
```

### Get Budget Breakdown
```javascript
GET /api/financial/budgets/:disasterId/breakdown
```

### Get Audit Trail
```javascript
GET /api/financial/auditlogs/:disasterId
```

---

## Role Permissions

| Action | Admin | Finance | Coordinator | Data Clerk |
|--------|-------|---------|-------------|-----------|
| Create Budget | ✅ | ✅ | ❌ | ❌ |
| Approve Budget | ✅ | ✅ | ❌ | ❌ |
| Log Expense | ✅ | ✅ | ✅ | ✅ |
| Approve Expense | ✅ | ✅ | ❌ | ❌ |
| Void Record | ✅ | ✅ | ❌ | ❌ |
| View Audit Logs | ✅ | ✅ | ❌ | ❌ |

---

## Error Messages

### Budget Errors
```
"Budget already exists for [category]"
"No approved budget found for category: [category]"
"Cannot edit budget after approval"
"Budget is already approved"
```

### Expense Errors
```
"Duplicate invoice found: Vendor '[name]' already has invoice #[num]"
"Expense amount ($X) exceeds remaining budget ($Y)"
"Cannot approve expense without supporting documentation"
"Budget overrun detected. Would exceed budget by $X"
```

### Permission Errors
```
"Insufficient permissions to create budget"
"Insufficient permissions to approve budget"
"Insufficient permissions to approve expense"
"Insufficient permissions to view audit logs"
```

---

## Validation Rules

### Budget
- ✅ Amount must be > 0
- ✅ Category must be valid
- ✅ Disaster must exist
- ✅ Only one approved budget per category per disaster

### Expense
- ✅ Amount must be > 0
- ✅ Amount must ≤ remaining budget
- ✅ Category must have approved budget
- ✅ Vendor name + invoice number must be unique
- ✅ Cannot approve without supporting document

### Audit
- ✅ Cannot be updated
- ✅ Cannot be deleted
- ✅ Tracks all changes
- ✅ Immutable record

---

## Budget Categories

- Food & Water
- Medical Supplies
- Shelter & Housing
- Transportation
- Communication
- Security
- Infrastructure
- Education
- Livelihood Support
- Other

---

## Status Values

### Budget Status
- Pending (awaiting approval)
- Approved (finalized, immutable)
- Rejected (did not pass review)

### Expense Status
- Pending (awaiting approval)
- Approved (ready for payment)
- Rejected (not approved)

---

## Calculation Examples

### Remaining Budget
```
Remaining = Allocated - TotalSpent(Approved Expenses)
```

### Percentage Used
```
PercentageUsed = (TotalSpent / Allocated) * 100
```

### Budget Summary
```
{
  "totalBudget": 150000,
  "totalSpent": 45000,
  "remainingBudget": 105000,
  "percentageUsed": 30
}
```

---

## Audit Log Fields

```javascript
{
  actionType: 'CREATE|UPDATE|APPROVE|REJECT|VOID',
  entityType: 'Budget|Expense',
  entityId: ObjectId,
  disasterId: ObjectId,
  performedBy: String (user id),
  performerRole: String (user role),
  oldValues: Object,
  newValues: Object,
  changes: Array,
  reason: String,
  timestamp: Date
}
```

---

## API Endpoint Summary

### Budget
- `POST /api/financial/budgets` - Create
- `GET /api/financial/budgets/:disasterId` - List
- `PUT /api/financial/budgets/:id/approve` - Approve
- `PUT /api/financial/budgets/:id/void` - Void
- `GET /api/financial/budgets/:disasterId/breakdown` - Breakdown

### Expense
- `POST /api/financial/expenses` - Create
- `GET /api/financial/expenses/:disasterId` - List
- `PUT /api/financial/expenses/:id/approve` - Approve
- `PUT /api/financial/expenses/:id/reject` - Reject
- `PUT /api/financial/expenses/:id/void` - Void

### Audit
- `GET /api/financial/auditlogs/:disasterId` - Get logs
- `GET /api/financial/auditlogs/entity/:id/:type` - Get trail

---

## Testing

### Test Duplicate Detection
```javascript
// Log same invoice twice
POST /api/financial/expenses
{ vendorName: "ABC", invoiceNumber: "INV-001", ... }

// Should fail on second attempt
// Error: "Duplicate invoice found"
```

### Test Budget Overrun
```javascript
// Budget: 10000
// Expense 1: 7000 (approved)
// Expense 2: 4000 (try to approve)

// Should fail: Total would be 11000 > 10000
// Error: "Budget overrun detected"
```

### Test Immutability
```javascript
// After budget approved, try to update
PUT /api/financial/budgets/:id
{ allocatedAmount: 60000 }

// Should fail
// Error: "Cannot edit budget after approval"
```

---

## Database Queries

### Get all pending approvals
```javascript
// Budgets pending
db.budgets.find({ approvalStatus: 'Pending' })

// Expenses pending
db.expenses.find({ status: 'Pending' })
```

### Get spending by disaster
```javascript
db.expenses.aggregate([
  { $match: { disasterId: ObjectId(...), status: 'Approved', isVoided: false } },
  { $group: { _id: '$disasterId', total: { $sum: '$amount' } } }
])
```

### Get audit trail for entity
```javascript
db.auditlogs.find({ entityId: ObjectId(...) }).sort({ timestamp: -1 })
```

---

## Fee Notes

**All operations:**
- Use `async/await`
- Include error handling
- Return appropriate HTTP status codes
- Log all errors
- Validate input
- Check permissions
- Create audit entry

**Never:**
- Delete records
- Edit approved budgets
- Approve without documents
- Exceed budget limits
- Create duplicate invoices
- Modify audit logs

---

## Support Files

1. **FINANCIAL_MODULE_API.md** - Complete API documentation
2. **FINANCIAL_IMPLEMENTATION_INSTRUCTIONS.md** - Setup guide
3. **Models:** BudgetAllocation.js, Expense.js, AuditLog.js
4. **Controller:** financialController.js
5. **Routes:** financial.js
6. **Utils:** financialUtils.js

---

**Last Updated:** February 20, 2026  
**Version:** 1.0  
**Status:** Production Ready
