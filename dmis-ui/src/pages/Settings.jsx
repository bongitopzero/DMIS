import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import "./Settings.css";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const user = storedUser?.user || {};

  const handleSignOut = () => {
    localStorage.removeItem("dmisToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>User Settings</h1>
        <p>Manage profile details and system preferences.</p>
      </div>

      <div className="settings-grid">
        <section className="settings-card">
          <h2>Profile</h2>
          <div className="settings-row">
            <span>Name</span>
            <strong>{user.name || ""}</strong>
          </div>
          <div className="settings-row">
            <span>Email</span>
            <strong>{user.email || ""}</strong>
          </div>
          <div className="settings-row">
            <span>Role</span>
            <strong>{user.role || ""}</strong>
          </div>
          {user.role === "Data Clerk" && (
            <div className="settings-row">
              <span>Ministry</span>
              <strong>{user.ministry || ""}</strong>
            </div>
          )}
        </section>

        <section className="settings-card">
          <h2>Preferences</h2>
          <div className="settings-row">
            <span>Theme</span>
            <button type="button" className="settings-btn" onClick={toggleTheme}>
              {theme === "light" ? "Switch to Dark" : "Switch to Light"}
            </button>
          </div>
        </section>

        <section className="settings-card">
          <h2>Session</h2>
          <div className="settings-row">
            <span>Signed in as</span>
            <strong>{user.email || ""}</strong>
          </div>
          <button type="button" className="settings-btn danger" onClick={handleSignOut}>
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
}
