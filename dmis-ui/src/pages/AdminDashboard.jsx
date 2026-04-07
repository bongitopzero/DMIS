import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { Link } from 'react-router-dom';
import { Users, Settings, UserPlus, Edit, Trash2, Shield, Eye, EyeOff } from 'lucide-react';
import './AdminDashboard.css';

function DeleteUserConfirmationModal({ show, userInfo, onConfirm, onCancel, isLoading }) {
  if (!show || !userInfo) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={onCancel}>
      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '2rem', maxWidth: '400px', width: '90%', boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#dc2626', margin: '0 0 1.5rem 0' }}>Delete User - {userInfo.name}</h2>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '1.5rem' }}>Are you sure you want to permanently delete this user? This action cannot be undone.</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={isLoading} style={{ padding: '0.5rem 1.5rem', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500', fontSize: '0.9rem' }}>Cancel</button>
          <button onClick={onConfirm} disabled={isLoading} style={{ padding: '0.5rem 1.5rem', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500', fontSize: '0.9rem' }} onMouseEnter={(e) => !isLoading && (e.target.style.backgroundColor = '#991b1b')} onMouseLeave={(e) => !isLoading && (e.target.style.backgroundColor = '#dc2626')}>{isLoading ? 'Deleting...' : 'Delete'}</button>
        </div>
      </div>
    </div>
  );
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetInfo, setDeleteTargetInfo] = useState(null);
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
    role: 'Data Clerk',
    ministry: ''
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
      setNewUser({ name: '', email: '', password: '', role: 'Data Clerk', ministry: '' });
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

  const handleDeleteUser = (userId, user) => {
    setDeleteTargetId(userId);
    setDeleteTargetInfo(user);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    setLoading(true);
    try {
      await axios.delete(`/auth/users/${deleteTargetId}`);
      setSuccess('User deleted successfully!');
      fetchUsers();
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
      setDeleteTargetInfo(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete user: ' + (err.response?.data?.error || err.message));
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
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
                <th>Ministry</th>
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
                  <td>{user.ministry || "-"}</td>
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
                      onClick={() => handleDeleteUser(user._id, user)}
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
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value, ministry: e.target.value === "Data Clerk" ? newUser.ministry : "" })}
                  required
                >
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              {newUser.role === "Data Clerk" && (
                <div className="form-group">
                  <label>Ministry</label>
                  <input
                    type="text"
                    value={newUser.ministry}
                    onChange={(e) => setNewUser({ ...newUser, ministry: e.target.value })}
                    required
                  />
                </div>
              )}
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
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value, ministry: e.target.value === "Data Clerk" ? editingUser.ministry : "" })}
                  required
                >
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              {editingUser.role === "Data Clerk" && (
                <div className="form-group">
                  <label>Ministry</label>
                  <input
                    type="text"
                    value={editingUser.ministry || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, ministry: e.target.value })}
                    required
                  />
                </div>
              )}
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
        <p>Manage users and configure system settings</p>
        <div style={{ marginTop: 8 }}>
          <Link to="/admin-dashboard/settings" className="btn-secondary">Open System Settings Page</Link>
        </div>
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
      <DeleteUserConfirmationModal 
        show={showDeleteConfirm}
        userInfo={deleteTargetInfo}
        onConfirm={confirmDeleteUser}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={loading}
      />
    </div>
  );
};

export default AdminDashboard;
