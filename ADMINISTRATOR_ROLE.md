# Administrator Role - DMIS Lesotho

## Login Credentials
- **Email:** admin@dmis.com
- **Password:** admin123

## Access & Permissions

### ✅ What Administrator CAN Access:
1. **User Management**
   - View all system users
   - Create new user accounts
   - Edit existing user information (name, email, role)
   - Delete user accounts
   - Assign roles to users

2. **System Settings**
   - Configure session timeout
   - Set maximum login attempts
   - Define password requirements
   - Enable/disable two-factor authentication
   - View and manage access control policies

### ❌ What Administrator CANNOT Access:
1. **Operational Modules**
   - Disaster Events (cannot enter or edit incident data)
   - GIS Mapping
   - Financial Tracking
   - Fund Management

2. **Analytical Features**
   - Analysis Dashboard
   - Forecasting Reports
   - Custom Reports

3. **System Control**
   - Cannot override system decisions
   - Cannot access raw operational data
   - No full system access

## Navigation
Administrator users will only see:
- **Admin Dashboard** (main page with two tabs)
  - User Management tab
  - System Settings tab

## Role-Based Access Control
The system enforces strict role separation:
- **Director:** Full access to disasters, GIS, analysis, forecasting
- **Finance Officer:** Fund management, financial tracking, analysis
- **Data Clerk:** Disaster events entry, GIS mapping, analysis
- **Administrator:** User and system management ONLY

## Security Features
- All user management operations require Administrator role authentication
- Administrators cannot delete their own account
- JWT token-based authentication
- Password encryption using bcryptjs
- Protected API endpoints with middleware validation

## API Endpoints (Administrator Only)
- `GET /api/auth/users` - Fetch all users
- `PUT /api/auth/users/:id` - Update user information
- `DELETE /api/auth/users/:id` - Delete a user
- `POST /api/auth/register` - Create new user (available to all for registration)

## System Settings (Configurable)
Current defaults:
- Session Timeout: 30 minutes
- Maximum Login Attempts: 5
- Minimum Password Length: 8 characters
- Special Characters Required: Yes
- Two-Factor Authentication: Disabled

## Notes
- The Administrator role is designed for system management, not operational use
- This separation ensures data integrity and proper access control
- Administrators manage WHO can access the system, not WHAT data is in the system
