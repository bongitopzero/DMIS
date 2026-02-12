import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { Users, Settings, UserPlus, Edit, Trash2, Shield, Eye, EyeOff } from 'lucide-react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [systemSettings, setSystemSettings] = useState({
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireSpecialChars: true,
    enableTwoFactor: false
  });

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Data Clerk'
  });

  const roles = ["Coordinator", "Finance Officer", "Data Clerk", "Administrator"];

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/auth/users');
      setUsers(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch users: ' + (err.response?.data?.error || err.message));
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/auth/register', newUser);
      setSuccess('User created successfully!');
      setShowAddUser(false);
      setNewUser({ name: '', email: '', password: '', role: 'Data Clerk' });
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to create user: ' + (err.response?.data?.error || err.message));
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      const updateData = { ...editingUser };
      delete updateData._id;
      delete updateData.createdAt;
      delete updateData.__v;
      
      await axios.put(`/auth/users/${editingUser._id}`, updateData);
      setSuccess('User updated successfully!');
      setEditingUser(null);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update user: ' + (err.response?.data?.error || err.message));
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await axios.delete(`/auth/users/${userId}`);
        setSuccess('User deleted successfully!');
        fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('Failed to delete user: ' + (err.response?.data?.error || err.message));
        setTimeout(() => setError(''), 5000);
      }
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      // In a real application, you would save these to the backend
      setSuccess('System settings updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update settings: ' + err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const renderUserManagement = () => (
    <div className="user-management">
      <div className="section-header">
        <h2><Users size={24} /> User Management</h2>
        <button className="btn-primary" onClick={() => setShowAddUser(true)}>
          <UserPlus size={18} /> Add New User
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading users...</div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge role-${user.role.replace(/\s+/g, '-').toLowerCase()}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button 
                      className="btn-icon btn-edit" 
                      onClick={() => setEditingUser(user)}
                      title="Edit User"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="btn-icon btn-delete" 
                      onClick={() => handleDeleteUser(user._id)}
                      title="Delete User"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="modal-overlay" onClick={() => setShowAddUser(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3><UserPlus size={20} /> Add New User</h3>
            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                    minLength="6"
                  />
                  <button 
                    type="button" 
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  required
                >
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddUser(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3><Edit size={20} /> Edit User</h3>
            <form onSubmit={handleEditUser}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  required
                >
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderSystemSettings = () => (
    <div className="system-settings">
      <div className="section-header">
        <h2><Settings size={24} /> System Settings</h2>
      </div>

      <form onSubmit={handleSaveSettings}>
        <div className="settings-section">
          <h3><Shield size={20} /> Security Settings</h3>
          
          <div className="form-group">
            <label>Session Timeout (minutes)</label>
            <input
              type="number"
              value={systemSettings.sessionTimeout}
              onChange={(e) => setSystemSettings({ ...systemSettings, sessionTimeout: parseInt(e.target.value) })}
              min="5"
              max="120"
            />
            <small>Time before users are automatically logged out due to inactivity</small>
          </div>

          <div className="form-group">
            <label>Maximum Login Attempts</label>
            <input
              type="number"
              value={systemSettings.maxLoginAttempts}
              onChange={(e) => setSystemSettings({ ...systemSettings, maxLoginAttempts: parseInt(e.target.value) })}
              min="3"
              max="10"
            />
            <small>Number of failed login attempts before account is temporarily locked</small>
          </div>

          <div className="form-group">
            <label>Minimum Password Length</label>
            <input
              type="number"
              value={systemSettings.passwordMinLength}
              onChange={(e) => setSystemSettings({ ...systemSettings, passwordMinLength: parseInt(e.target.value) })}
              min="6"
              max="20"
            />
            <small>Minimum number of characters required for passwords</small>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={systemSettings.requireSpecialChars}
                onChange={(e) => setSystemSettings({ ...systemSettings, requireSpecialChars: e.target.checked })}
              />
              Require special characters in passwords
            </label>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={systemSettings.enableTwoFactor}
                onChange={(e) => setSystemSettings({ ...systemSettings, enableTwoFactor: e.target.checked })}
              />
              Enable two-factor authentication (2FA)
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3>Access Control</h3>
          <div className="info-box">
            <strong>Current Role Permissions:</strong>
            <ul>
              <li><strong>Coordinator:</strong> Review, verify, and update incident status; Access to GIS, analysis, forecasting (no financial approval)</li>
              <li><strong>Finance Officer:</strong> Fund management, financial tracking, and analysis</li>
              <li><strong>Data Clerk:</strong> Submit incidents from ministries; Full incident data entry, GIS mapping, and analysis</li>
              <li><strong>Administrator:</strong> User management and system settings only</li>
            </ul>
          </div>
        </div>

        <button type="submit" className="btn-primary">
          Save Settings
        </button>
      </form>
    </div>
  );

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Administrator Dashboard</h1>
        <p>Manage users and configure system settings</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={18} /> User Management
        </button>
        <button 
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={18} /> System Settings
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'users' && renderUserManagement()}
        {activeTab === 'settings' && renderSystemSettings()}
      </div>
    </div>
  );
};

export default AdminDashboard;
