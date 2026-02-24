# Login Troubleshooting Guide

## Quick Checklist

### 1. Verify Backend is Running
```bash
# Check if Node.js server is running on port 5000
curl http://localhost:5000/api/auth/login
```
You should get an error about missing POST data, not "connection refused"

### 2. Test with Correct Credentials
Use EXACTLY these credentials (case-sensitive):

**DMA Coordinator:**
- Email: `coordinator@dmis.com`
- Password: `coordinator123`
- Role: Select "DMA Coordinator" from dropdown

**Finance Officer:**
- Email: `finance@dmis.com`
- Password: `finance123`
- Role: Select "Finance Officer" from dropdown

**Data Clerk:**
- Email: `clerk@dmis.com`
- Password: `clerk123`
- Role: Select "Data Clerk" from dropdown

**Administrator:**
- Email: `admin@dmis.com`
- Password: `admin123`
- Role: Select "Administrator" from dropdown

### 3. Check Browser Console
1. Press F12 to open Developer Tools
2. Go to Console tab
3. Look for messages like:
   - `🔐 Attempting login with: {...}`
   - `✅ Login successful. Response: {...}`
   - `❌ Login error: {...}`

### 4. Check Network Tab
1. Go to Network tab in DevTools
2. Attempt login
3. Find the `login` request
4. Check Response tab for errors

### 5. Verify Users Exist in Database
Run this in MongoDB:
```javascript
db.users.find({}).pretty()
```

Should return documents with:
- name
- email
- password (hashed)
- role (must be one of: "Coordinator", "Finance Officer", "Data Clerk", "Administrator")

### 6. Clear Browser Storage
1. Press F12
2. Go to Application tab
3. Click "Local Storage"
4. Delete `http://localhost:3000` entry
5. Refresh page and try again

## If Still Having Issues

Check these files are configured correctly:

**Frontend API Config:**
- `dmis-ui/src/api/axios.js` should have `baseURL: "http://localhost:5000/api"`

**Backend Environment:**
- `.env` file should have:
  - `PORT=5000`
  - `MONGODB_URI=mongodb://localhost:27017/dmis`
  - `JWT_SECRET=your_secret_key`

**Database:**
- MongoDB should be running
- Database `dmis` should exist
- Collection `users` should have test users

## Error Messages & Solutions

| Error | Solution |
|-------|----------|
| "User not found" | User doesn't exist in DB - create it first |
| "Invalid password" | Password is wrong - check spelling (case-sensitive) |
| "Cannot POST /api/auth/login" | Backend not running or wrong URL |
| "Access Denied" page | Role doesn't match route permissions |
| "Network error" | Backend/CORS issue - check backend console |

## Create Test User via API

Use Postman or curl:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@dmis.com",
    "password": "test123",
    "role": "Coordinator"
  }'
```

Then login with:
- Email: `test@dmis.com`
- Password: `test123`
- Role: Coordinator
