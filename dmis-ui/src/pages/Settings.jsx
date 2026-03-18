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
    localStorage.removeItem("dmisToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError("");

    if (password && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const payload = { name, ministry };
    if (password) payload.password = password;

    try {
      setLoading(true);
      const res = await fetch(`/api/auth/users/${user._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || "Failed to update profile");
      }

      const updated = await res.json();
      // update localStorage user object
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
          <h2>Profile</h2>
          <div className="settings-row">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="settings-row">
            <span>Email</span>
            <strong>{user.email || ""}</strong>
          </div>
          <div className="settings-row">
            <span>Role</span>
            <strong>{user.role || ""}</strong>
          </div>
          <div className="settings-row">
            <span>Ministry</span>
            <input value={ministry} onChange={(e) => setMinistry(e.target.value)} />
          </div>
        </section>

        <section className="settings-card">
          <h2>Preferences</h2>
          <div className="settings-row">
            <span>Theme</span>
            <button type="button" className="settings-btn" onClick={toggleTheme}>
              {theme === "light" ? "Switch to Dark" : "Switch to Light"}
            </button>
          </div>

          <h2>Change Password</h2>
          <div className="settings-row">
            <span>New password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="settings-row">
            <span>Confirm</span>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
        </section>

        <section className="settings-card">
          <h2>Session</h2>
          <div className="settings-row">
            <span>Signed in as</span>
            <strong>{user.email || ""}</strong>
          </div>

          {error && <div style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</div>}
          {success && <div style={{ color: 'var(--success)', fontSize: '0.9rem' }}>{success}</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="submit" className="settings-btn" disabled={loading}>
              {loading ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="settings-btn danger" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
