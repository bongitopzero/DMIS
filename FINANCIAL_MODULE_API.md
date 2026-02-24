# Financial Tracking Module - API Documentation

## Overview

The Financial Tracking Module provides comprehensive budget allocation, expense logging, and audit trail management for disaster relief operations.

**Base URL:** `/api/financial`

---

## Table of Contents

1. [Budget Management](#budget-management)
2. [Expense Management](#expense-management)
3. [Audit Logs](#audit-logs)
4. [Business Rules](#business-rules)
5. [Error Codes](#error-codes)
6. [Integration Guide](#integration-guide)

---

## Budget Management

### POST /budgets
**Create new budget allocation**

Creates a new budget allocation for a disaster relief operation. Budget must be approved before expenses can be logged against it.

**Authentication:** Required (Finance Officer, Administrator)

**Request Body:**
```json
{
  "disasterId": "507f1f77bcf86cd799439011",
  "category": "Food & Water",
  "allocatedAmount": 50000,
  "approvedBy": "John Doe",
  "approvalDate": "2026-02-19T10:00:00Z",
  "description": "Emergency food supplies for affected populations",
  "createdBy": "user123"
}
```

**Request Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| disasterId | ObjectId | Yes | Reference to Disaster document |
| category | String | Yes | Must match approved categories |
| allocatedAmount | Number | Yes | Amount > 0 |
| approvedBy | String | Yes | Name/ID of approver |
| approvalDate | Date | Yes | Approval date |
| description | String | No | Optional description (max 500 chars) |
| createdBy | String | Yes | User creating the record |

**Success Response (201):**
```json
{
  "message": "Budget created successfully (pending approval)",
  "budget": {
    "_id": "507f1f77bcf86cd799439012",
    "disasterId": "507f1f77bcf86cd799439011",
    "category": "Food & Water",
    "allocatedAmount": 50000,
    "approvalStatus": "Pending",
    "createdAt": "2026-02-19T10:00:00Z",
    "updatedAt": "2026-02-19T10:00:00Z"
  }
}
```

**Error Responses:**
- `400` - Invalid amount or duplicate budget for category
- `404` - Disaster not found
- `403` - Insufficient permissions

---

### GET /budgets/:disasterId
**Retrieve all budgets for a disaster**

Gets all budget allocations associated with a disaster, including summary statistics.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | String | Filter by status: Pending, Approved, Rejected |
| category | String | Filter by category |

**Example Request:**
```
GET /api/financial/budgets/507f1f77bcf86cd799439011?status=Approved
```

**Success Response (200):**
```json
{
  "budgets": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "disasterId": "507f1f77bcf86cd799439011",
      "category": "Food & Water",
      "allocatedAmount": 50000,
      "approvalStatus": "Approved",
      "createdAt": "2026-02-19T10:00:00Z"
    }
  ],
  "summary": {
    "totalBudget": 150000,
    "totalSpent": 45000,
    "percentageUsed": 30,
    "remainingBudget": 105000
  },
  "breakdown": [
    {
      "category": "Food & Water",
      "allocatedAmount": 50000,
      "totalSpent": 15000,
      "remainingAmount": 35000,
      "percentageUsed": 30
    }
  ]
}
```

---

### PUT /budgets/:id/approve
**Approve budget allocation**

Finalizes a budget allocation after approval. Once approved, the budget becomes immutable and cannot be edited (only voided).

**Authentication:** Required (Finance Officer, Administrator)

**Request Body:**
```json
{
  "approvalNotes": "Budget reviewed and approved for Q1 operations",
  "approverId": "finance_officer_123"
}
```

**Success Response (200):**
```json
{
  "message": "Budget approved successfully",
  "budget": {
    "_id": "507f1f77bcf86cd799439012",
    "approvalStatus": "Approved",
    "approvalDate": "2026-02-19T11:00:00Z"
  }
}
```

**Error Responses:**
- `400` - Budget already approved
- `404` - Budget not found
- `403` - Insufficient permissions

---

### PUT /budgets/:id/void
**Void budget allocation**

Marks a budget as voided without deleting it. Maintains audit trail of why it was voided.

**Authentication:** Required (Administrator)

**Request Body:**
```json
{
  "reason": "Budget allocation no longer needed - situation stabilized"
}
```

**Required Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| reason | String | Explanation for voiding |

**Success Response (200):**
```json
{
  "message": "Budget voided successfully",
  "budget": {
    "_id": "507f1f77bcf86cd799439012",
    "isVoided": true,
    "voidReason": "Budget allocation no longer needed",
    "voidedBy": "admin_user",
    "voidedAt": "2026-02-19T12:00:00Z"
  }
}
```

---

### GET /budgets/:disasterId/breakdown
**Get budget breakdown by category**

Provides detailed breakdown of budget allocation and spending by category.

**Authentication:** Required

**Success Response (200):**
```json
{
  "breakdown": [
    {
      "category": "Food & Water",
      "allocatedAmount": 50000,
      "totalSpent": 15000,
      "remainingAmount": 35000,
      "percentageUsed": 30
    },
    {
      "category": "Medical Supplies",
      "allocatedAmount": 40000,
      "totalSpent": 30000,
      "remainingAmount": 10000,
      "percentageUsed": 75
    }
  ],
  "totalAllocated": 150000,
  "totalSpent": 45000,
  "percentageUsed": 30,
  "remainingBudget": 105000
}
```

---

## Expense Management

### POST /expenses
**Log new expense**

Records a new expense against an approved budget. Automatically validates:
- Budget exists for category
- No duplicate invoice
- Expense doesn't exceed remaining budget

**Authentication:** Required (Data Clerk, Finance Officer, Coordinator)

**Request Body:**
```json
{
  "disasterId": "507f1f77bcf86cd799439011",
  "category": "Food & Water",
  "vendorName": "Emergency Food Supplies Inc",
  "vendorRegistrationNumber": "REG-12345-67890",
  "invoiceNumber": "INV-2026-001",
  "bankReferenceNumber": "BANK-REF-123",
  "amount": 5000,
  "supportingDocumentUrl": "https://storage.example.com/invoice-2026-001.pdf",
  "paymentMethod": "Bank Transfer",
  "receipientName": "Emergency Food Supplies",
  "receipientBankAccount": "1234567890",
  "description": "Emergency food supplies delivery",
  "userId": "data_clerk_123"
}
```

**Request Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| disasterId | ObjectId | Yes | Reference to Disaster |
| category | String | Yes | Must have approved budget |
| vendorName | String | Yes | Vendor legal name |
| vendorRegistrationNumber | String | Yes | Company registration number |
| invoiceNumber | String | Yes | Unique invoice identifier |
| bankReferenceNumber | String | No | Bank transfer reference |
| amount | Number | Yes | Amount > 0, ≤ remaining budget |
| supportingDocumentUrl | String | No | URL to invoice/receipt |
| paymentMethod | String | No | Default: "Bank Transfer" |
| receipientName | String | No | Payment recipient name |
| receipientBankAccount | String | No | Recipient bank account |
| description | String | No | Additional notes |
| userId | String | Yes | Logging user ID |

**Success Response (201):**
```json
{
  "message": "Expense logged successfully (pending approval)",
  "expense": {
    "_id": "507f1f77bcf86cd799439013",
    "disasterId": "507f1f77bcf86cd799439011",
    "category": "Food & Water",
    "vendorName": "Emergency Food Supplies Inc",
    "invoiceNumber": "INV-2026-001",
    "amount": 5000,
    "status": "Pending",
    "createdAt": "2026-02-19T10:30:00Z"
  }
}
```

**Error Responses:**
- `400` - No approved budget, amount exceeds budget, or invalid amount
- `404` - Disaster not found
- `409` - Duplicate invoice detected
- `403` - Insufficient permissions

**Duplicate Invoice Example Error:**
```json
{
  "message": "Duplicate invoice found: Vendor \"Emergency Food Supplies Inc\" already has invoice #INV-2026-001 in system"
}
```

**Budget Exceeded Example Error:**
```json
{
  "message": "Expense amount ($15000) exceeds remaining budget ($12000). Total spent: $18000 / Allocated: $30000"
}
```

---

### GET /expenses/:disasterId
**Retrieve all expenses for a disaster**

Gets all expense records for a disaster with filtering options.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | String | Filter: Pending, Approved, Rejected |
| category | String | Filter by category |

**Example Request:**
```
GET /api/financial/expenses/507f1f77bcf86cd799439011?status=Approved&category=Food%20%26%20Water
```

**Success Response (200):**
```json
{
  "expenses": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "vendorName": "Emergency Food Supplies Inc",
      "invoiceNumber": "INV-2026-001",
      "amount": 5000,
      "status": "Approved",
      "category": "Food & Water",
      "createdAt": "2026-02-19T10:30:00Z"
    }
  ],
  "summary": {
    "totalApproved": 25000,
    "totalPending": 10000,
    "totalExpenses": 12
  }
}
```

---

### PUT /expenses/:id/approve
**Approve expense**

Approves a pending expense for payment. Validates supporting documentation exists and won't cause budget overrun.

**Authentication:** Required (Finance Officer, Administrator)

**Request Body:**
```json
{
  "approvalNotes": "Verified invoice and supporting documents",
  "approverId": "finance_officer_123"
}
```

**Success Response (200):**
```json
{
  "message": "Expense approved successfully",
  "expense": {
    "_id": "507f1f77bcf86cd799439013",
    "status": "Approved",
    "approvalDate": "2026-02-19T11:30:00Z",
    "approvedBy": "finance_officer_123"
  },
  "budgetStatus": {
    "allocatedAmount": 50000,
    "totalSpent": 25000,
    "remainingAmount": 25000,
    "percentageUsed": 50
  }
}
```

**Error Responses:**
- `400` - Missing supporting documentation, budget overrun, or already approved
- `404` - Expense not found
- `403` - Insufficient permissions

**Budget Overrun Example Error:**
```json
{
  "message": "Budget overrun detected. Approving this expense would exceed budget by $5000. Allocated: $30000, Total after approval: $35000"
}
```

---

### PUT /expenses/:id/reject
**Reject expense**

Rejects a pending expense with explanation.

**Authentication:** Required (Finance Officer, Administrator)

**Request Body:**
```json
{
  "rejectionReason": "Invoice does not match supporting documentation"
}
```

**Required Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| rejectionReason | String | Explanation for rejection |

**Success Response (200):**
```json
{
  "message": "Expense rejected successfully",
  "expense": {
    "_id": "507f1f77bcf86cd799439013",
    "status": "Rejected",
    "rejectionReason": "Invoice does not match supporting documentation"
  }
}
```

---

### PUT /expenses/:id/void
**Void expense record**

Marks an expense as voided. Used when expense needs to be removed from active tracking.

**Authentication:** Required (Finance Officer, Administrator)

**Request Body:**
```json
{
  "reason": "Duplicate expense entry - corrected in INV-2026-002"
}
```

**Success Response (200):**
```json
{
  "message": "Expense voided successfully",
  "expense": {
    "_id": "507f1f77bcf86cd799439013",
    "isVoided": true,
    "voidReason": "Duplicate expense entry",
    "voidedBy": "user_123",
    "voidedAt": "2026-02-19T12:30:00Z"
  }
}
```

---

## Audit Logs

### GET /auditlogs/:disasterId
**Get audit logs for disaster**

Retrieves complete audit trail for all financial activities related to a disaster.

**Authentication:** Required (Finance Officer, Administrator)

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | Number | 100 | Max records to return |

**Success Response (200):**
```json
{
  "logs": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "actionType": "CREATE",
      "entityType": "Budget",
      "entityId": "507f1f77bcf86cd799439012",
      "performedBy": "user_123",
      "performerRole": "Finance Officer",
      "newValues": { "category": "Food & Water", "amount": 50000 },
      "reason": "Budget allocation created",
      "timestamp": "2026-02-19T10:00:00Z"
    },
    {
      "_id": "507f1f77bcf86cd799439015",
      "actionType": "APPROVE",
      "entityType": "Budget",
      "entityId": "507f1f77bcf86cd799439012",
      "performedBy": "admin_user",
      "performerRole": "Administrator",
      "oldValues": { "approvalStatus": "Pending" },
      "newValues": { "approvalStatus": "Approved" },
      "changes": [
        {
          "fieldName": "approvalStatus",
          "oldValue": "Pending",
          "newValue": "Approved"
        }
      ],
      "timestamp": "2026-02-19T11:00:00Z"
    }
  ],
  "total": 2
}
```

---

### GET /auditlogs/entity/:entityId/:entityType
**Get audit trail for specific entity**

Retrieves complete history for a specific budget or expense.

**Authentication:** Required (Finance Officer, Administrator)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| entityId | ObjectId | Budget or Expense ID |
| entityType | String | "Budget" or "Expense" |

**Example Request:**
```
GET /api/financial/auditlogs/entity/507f1f77bcf86cd799439012/Budget
```

**Success Response (200):**
```json
{
  "logs": [
    {
      "actionType": "CREATE",
      "performedBy": "user_123",
      "newValues": { "allocatedAmount": 50000 },
      "timestamp": "2026-02-19T10:00:00Z"
    },
    {
      "actionType": "APPROVE",
      "performedBy": "admin_user",
      "changes": [
        { "fieldName": "approvalStatus", "oldValue": "Pending", "newValue": "Approved" }
      ],
      "timestamp": "2026-02-19T11:00:00Z"
    }
  ],
  "total": 2
}
```

---

## Business Rules

### Budget Rules
1. ✅ Budget must be approved before expenses can be logged
2. ✅ Approved budgets are immutable - cannot be edited
3. ✅ Budget modifications require creating new allocation
4. ✅ Budgets cannot be deleted - only voided
5. ✅ Budget breakdown shows allocation by category
6. ✅ Total spending automatically calculated from approved expenses

### Expense Rules
1. ✅ Expense requires approved budget in matching category
2. ✅ Expense cannot exceed remaining budget
3. ✅ Duplicate invoice detection (vendor name + invoice number)
4. ✅ Cannot approve expense without supporting documentation
5. ✅ Cannot exceed allocated budget when approving
6. ✅ Expenses cannot be deleted - only voided
7. ✅ Immutable audit trail maintained for all operations

### Categories
Valid budget/expense categories:
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

## Error Codes

| Code | Error | Description | Solution |
|------|-------|-------------|----------|
| 400 | Bad Request | Invalid parameters | Check request body for errors |
| 400 | Budget Not Found | No approved budget for category | Create and approve budget first |
| 400 | Amount Invalid | Amount ≤ 0 or exceeds budget | Check amount is positive and within budget |
| 400 | Missing Documentation | Trying to approve without receipt | Upload supporting document URL |
| 409 | Duplicate Invoice | Invoice number already exists | Use unique invoice number |
| 403 | Insufficient Permissions | User role cannot perform action | Request from authorized user |
| 404 | Resource Not Found | Budget, expense, or disaster not found | Verify IDs are correct |
| 500 | Internal Server Error | Server error | Contact support |

---

## Integration Guide

### Setup

1. **Add routes to server.js:**
```javascript
const financialRoutes = require('./routes/financial');
app.use('/api/financial', financialRoutes);
```

2. **Ensure middleware is applied:**
```javascript
// Authentication middleware checks user role
const { authenticate } = require('./middleware/auth');
```

3. **Import models in your controllers:**
```javascript
const BudgetAllocation = require('../models/BudgetAllocation');
const Expense = require('../models/Expense');
const AuditLog = require('../models/AuditLog');
```

### Frontend Integration Example

```javascript
// Create budget
async function createBudget(disasterId, budgetData) {
  try {
    const response = await fetch('/api/financial/budgets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User': JSON.stringify(userData)
      },
      body: JSON.stringify({
        disasterId,
        ...budgetData
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Error creating budget:', error);
  }
}

// Log expense
async function logExpense(disasterId, expenseData) {
  try {
    const response = await fetch('/api/financial/expenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User': JSON.stringify(userData)
      },
      body: JSON.stringify({
        disasterId,
        ...expenseData
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Error logging expense:', error);
  }
}

// Approve expense
async function approveExpense(expenseId, notes) {
  try {
    const response = await fetch(`/api/financial/expenses/${expenseId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User': JSON.stringify(userData)
      },
      body: JSON.stringify({ approvalNotes: notes })
    });
    return await response.json();
  } catch (error) {
    console.error('Error approving expense:', error);
  }
}
```

---

## Testing

### Test Budget Creation
```bash
curl -X POST http://localhost:5000/api/financial/budgets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "disasterId": "507f1f77bcf86cd799439011",
    "category": "Food & Water",
    "allocatedAmount": 50000,
    "approvedBy": "John Doe",
    "approvalDate": "2026-02-19T10:00:00Z",
    "createdBy": "user123"
  }'
```

### Test Expense Creation
```bash
curl -X POST http://localhost:5000/api/financial/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "disasterId": "507f1f77bcf86cd799439011",
    "category": "Food & Water",
    "vendorName": "Food Supplies Co",
    "vendorRegistrationNumber": "REG-123",
    "invoiceNumber": "INV-001",
    "amount": 5000,
    "userId": "user123"
  }'
```

---

**Last Updated:** February 20, 2026  
**Version:** 1.0  
**Status:** Active
