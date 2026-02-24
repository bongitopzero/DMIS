# DMIS Lesotho - Test User Credentials

## All User Accounts

### 1. DMA Coordinator (Operational Role)
- **Email:** coordinator@dmis.com
- **Password:** coordinator123
- **Access:** Dashboard, Incident Management, GIS Map, Analysis, Forecasting
- **Restrictions:** Cannot approve funds or modify financial records

### 2. Finance Officer
- **Email:** finance@dmis.com
- **Password:** finance123
- **Access:** Finance Dashboard, Financial Tracking, Analysis

### 3. Data Clerk
- **Email:** clerk@dmis.com
- **Password:** clerk123
- **Access:** Disaster Events, GIS Map, Analysis

### 4. Administrator
- **Email:** admin@dmis.com
- **Password:** admin123
- **Access:** User Management, System Settings ONLY

---

## Quick Login Guide

1. Navigate to http://localhost:3000/login
2. Enter the email and password credentials below
3. Click "Sign In"
4. You will be automatically redirected to the appropriate dashboard based on your assigned role:
   - Coordinator → `/dashboard`
   - Finance Officer → `/finance-dashboard`
   - Data Clerk → `/disaster-events`
   - Administrator → `/admin-dashboard`

## Role-Based Navigation

Each role sees only their authorized menu items:

**Coordinator Navigation:**
- Dashboard
- Incident Management
- GIS Map
- Analysis
- Forecasting
- Settings

**Finance Officer Navigation:**
- Finance Dashboard
- Financial Tracking
- Analysis

**Data Clerk Navigation:**
- Disaster Events
- GIS Map
- Analysis

**Administrator Navigation:**
- Admin Dashboard (User Management & System Settings)

## Testing Administrator Features

### User Management
1. Login as admin@dmis.com
2. Click on "User Management" tab
3. View all users in the system
4. Click "Add New User" to create accounts
5. Use Edit icon to modify user details
6. Use Delete icon to remove users

### System Settings
1. Login as admin@dmis.com
2. Click on "System Settings" tab
3. Configure security settings
4. View role permissions
5. Click "Save Settings" to apply changes

---

## Important Notes

- All passwords are for testing purposes only
- Change passwords in production environment
- Administrator cannot access operational modules (disasters, finances, etc.)
- Each role has strict access control enforced by protected routes
- JWT tokens expire after 7 days
