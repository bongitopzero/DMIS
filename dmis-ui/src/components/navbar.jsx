import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import API from "../api/axios";
import "./navbar.css";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationRef = useRef(null);

  // Get current user info
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = currentUser?.user?.role || "";
  const isCoordinator = userRole === "Coordinator";

  // Fetch pending/reported disasters for coordinator
  useEffect(() => {
    if (!isCoordinator) {
      setNotifications([]);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const res = await API.get("/disasters");
        const disasters = res.data || [];
        // Filter for pending, reported, or submitted status (waiting for coordinator review)
        const pendingDisasters = disasters.filter(
          (d) =>
            d.status?.toLowerCase() === "reported" ||
            d.status?.toLowerCase() === "pending" ||
            d.status?.toLowerCase() === "submitted"
        );
        setNotifications(pendingDisasters);
        console.log("📢 Fetched notifications:", pendingDisasters.length, "disasters needing review");
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };

    fetchNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isCoordinator]);

  // Handle click outside notification panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotificationPanel(false);
      }
    };

    if (showNotificationPanel) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNotificationPanel]);

  const getPageTitle = () => {
    const path = location.pathname;
    
    // Route to page title mapping
    const pathTitleMap = {
      "/new-disaster-report": "New Disaster Report",
      "/dashboard": "Dashboard",
      "/my-submissions": "My Submissions",
      "/finance-dashboard": "Finance Dashboard",
      "/aid-allocation": "Aid Allocation",
      "/budget-allocation": "Budget Allocation",
      "/audit-trail": "Finance Audit Trail",
      "/finance-audit-trail": "Finance Audit Trail",

      "/disaster-events": "Incident Management",
      "/incidents": "Incident Management",
      "/fund-management": "Fund Management",
      "/gis-map": "GIS Map",
      "/analysis": "Analysis",
      "/forecasting": "Forecasting",
      "/admin-dashboard/settings": "System Settings",
      "/admin-dashboard": "Admin Dashboard",
      "/settings": "Settings",
    };
    
    return pathTitleMap[path] || "Dashboard";
  };

  return (
    <div className="navbar">
      <h2>{getPageTitle()}</h2>
      <div className="user">
        {/* Notification Bell */}
        {isCoordinator && (
          <div style={{ position: "relative" }} ref={notificationRef}>
            <button
              onClick={() => setShowNotificationPanel(!showNotificationPanel)}
              className="icon-btn"
              style={{
                position: "relative",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                color: "currentColor",
              }}
              title="Notifications"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>

              {/* Badge */}
              {notifications.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-5px",
                    right: "-5px",
                    backgroundColor: "#dc2626",
                    color: "white",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                  }}
                >
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotificationPanel && (
              <div
                style={{
                  position: "absolute",
                  top: "40px",
                  right: "0",
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  zIndex: 1000,
                  minWidth: "350px",
                  maxHeight: "500px",
                  overflowY: "auto",
                }}
              >
                {notifications.length === 0 ? (
                  <div
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      color: "#9ca3af",
                      fontSize: "0.9rem",
                    }}
                  >
                    No pending notifications
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        padding: "0.75rem 1rem",
                        borderBottom: "1px solid #f3f4f6",
                        fontWeight: "600",
                        fontSize: "0.9rem",
                        color: "#1f2937",
                      }}
                    >
                      Pending Disaster Reports ({notifications.length})
                    </div>
                    {notifications.map((disaster) => (
                      <button
                        key={disaster._id}
                        onClick={() => {
                          navigate("/disaster-events");
                          setShowNotificationPanel(false);
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "1rem",
                          borderBottom: "1px solid #f3f4f6",
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f9fafb";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "white";
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.9rem",
                            color: "#1f2937",
                            fontWeight: "500",
                            marginBottom: "0.5rem",
                          }}
                        >
                          A new disaster report has been submitted and is
                          awaiting your review and approval.
                        </div>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "#6b7280",
                          }}
                        >
                          <span style={{ textTransform: "capitalize" }}>
                            {disaster.type?.replace(/_/g, " ")}
                          </span>
                          {" • "}
                          {disaster.district}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Non-coordinator notification bell (no functionality) */}
        {!isCoordinator && (
          <svg
            className="icon-btn"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        )}

        {/* Theme Toggle */}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* User Profile */}
        <div className="user-avatar">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      </div>
    </div>
  );
}
