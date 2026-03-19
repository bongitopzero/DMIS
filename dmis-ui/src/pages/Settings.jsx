import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import "./Settings.css";


export default function Settings() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const user = storedUser?.user || {};

  const [name, setName] = React.useState(user.name || "");
  const [ministry, setMinistry] = React.useState(user.ministry || "");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState("");
  const [error, setError] = React.useState("");

  const token = localStorage.getItem("dmisToken");

  const handleSignOut = () => {
    // Clear all authentication data
    localStorage.removeItem("dmisToken");
    localStorage.removeItem("user");
    localStorage.removeItem("token"); // Clear any alternative token names
    sessionStorage.clear(); // Clear session storage as backup
    
    // Navigate to login
    navigate("/login", { replace: true });
    
    // Force reload to clear any React state
    window.location.reload();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError("");

    if (password && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!user._id) {
      setError("User ID not found. Please sign in again.");
      return;
    }

    const payload = { name, ministry };
    if (password) payload.password = password;

    try {
      setLoading(true);
      
      // Use full URL or ensure proxy is set in package.json
      const baseUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const res = await fetch(`${baseUrl}/api/auth/users/${user._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 401) {
          // Token expired - sign out
          handleSignOut();
          throw new Error("Session expired. Please sign in again.");
        }
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || "Failed to update profile");
      }

      const updated = await res.json();
      
      // Update localStorage user object
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      stored.user = { ...stored.user, ...updated };
      localStorage.setItem("user", JSON.stringify(stored));

      setSuccess("Profile updated successfully");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Error saving profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>User Settings</h1>
        <p>Manage profile details and system preferences.</p>
      </div>

      <form className="settings-grid" onSubmit={handleSave}>
        <section className="settings-card">
          <h2>Profile Information</h2>
          <div className="settings-row">
            <span>Full Name</span>
            <input 
              type="text"
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>
          <div className="settings-row">
            <span>Email Address</span>
            <strong className="email-display">{user.email || ""}</strong>
          </div>
          <div className="settings-row">
            <span>User Role</span>
            <strong className="role-badge">{user.role || ""}</strong>
          </div>
          <div className="settings-row">
            <span>Ministry/Department</span>
            <input 
              type="text"
              value={ministry} 
              onChange={(e) => setMinistry(e.target.value)}
              placeholder="Enter your ministry"
            />
          </div>
        </section>

        <section className="settings-card">
          <h2>Appearance</h2>
          <div className="settings-row">
            <span>Color Theme</span>
            <button 
              type="button" 
              className="settings-btn theme-toggle" 
              onClick={toggleTheme}
            >
              {theme === "light" ? "🌙 Switch to Dark" : "☀️ Switch to Light"}
            </button>
          </div>
        </section>

        <section className="settings-card">
          <h2>Change Password</h2>
          <div className="settings-row">
            <span>New Password</span>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              minLength="6"
            />
          </div>
          <div className="settings-row">
            <span>Confirm Password</span>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              minLength="6"
            />
          </div>
          {password && confirmPassword && password !== confirmPassword && (
            <div className="password-mismatch">Passwords do not match</div>
          )}
        </section>

        <section className="settings-card logout-section">
          <h2>Session Management</h2>
          <div className="settings-row">
            <span>Signed in as</span>
            <strong>{user.email || ""}</strong>
          </div>
          <div className="settings-row">
            <span>Account Status</span>
            <span className="status-badge active">Active</span>
          </div>

          {error && (
            <div className="error-message">
              <span>⚠️</span> {error}
            </div>
          )}
          
          {success && (
            <div className="success-message">
              <span>✓</span> {success}
            </div>
          )}

          <div className="button-group">
            <button 
              type="submit" 
              className="settings-btn primary" 
              disabled={loading}
            >
              {loading ? 'Saving Changes...' : '💾 Save Profile'}
            </button>
            
            <button 
              type="button" 
              className="settings-btn logout-btn" 
              onClick={handleSignOut}
            >
              🚪 Sign Out
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}