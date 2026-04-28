import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import './AdminDashboard.css';

const SystemSettings = () => {
  const [systemSettings, setSystemSettings] = useState({
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireSpecialChars: true,
    enableTwoFactor: false
  });

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSuccess('System settings updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update settings: ' + (err.message || 'Unknown'));
      setTimeout(() => setError(''), 5000);
    }
  };

  return (
    <div className="system-settings page-container">
      <div className="dashboard-header">
        <p>Configure global system settings and access control</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSaveSettings} className="settings-form">
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
              <li><strong>Coordinator:</strong> Review, verify, and update incident status; Access to GIS and analysis (no financial approval)</li>
              <li><strong>Finance Officer:</strong> Fund management, financial tracking, and analysis</li>
              <li><strong>Data Clerk:</strong> Submit incidents from ministries; Full incident data entry, GIS mapping, and analysis</li>
              <li><strong>Administrator:</strong> User management and system settings only</li>
            </ul>
          </div>
        </div>

        <button type="submit" className="btn-primary">Save Settings</button>
      </form>
    </div>
  );
};

export default SystemSettings;