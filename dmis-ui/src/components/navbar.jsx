import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import API from "../api/axios";
import { ToastManager } from "../components/Toast";
import "./navbar.css";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [financeNotifications, setFinanceNotifications] = useState([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  // Get current user info
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = currentUser?.user?.role || "";
  const isCoordinator = userRole === "Coordinator";
  const isFinanceOfficer = userRole === "Finance Officer";

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
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isCoordinator]);

  // Fetch approved disasters for finance officers and display toast alerts
  useEffect(() => {
    if (!isFinanceOfficer) {
      setFinanceNotifications([]);
      return;
    }

    const fetchFinanceNotifications = async () => {
      try {
        const res = await API.get("/disasters/approved");
        const approvedDisasters = res.data || [];
        setFinanceNotifications(approvedDisasters);
      } catch (err) {
        console.error("Failed to fetch finance notifications:", err);
      }
    };

    fetchFinanceNotifications();
    const interval = setInterval(fetchFinanceNotifications, 30000);
    return () => clearInterval(interval);
  }, [isFinanceOfficer]);

  // Handle click outside notification panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotificationPanel(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      ) {
        setShowUserMenu(false);
      }
    };

    if (showNotificationPanel || showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNotificationPanel, showUserMenu]);

  const notificationCount = isCoordinator
    ? notifications.length
    : isFinanceOfficer
    ? financeNotifications.length
    : 0;
  const notificationItems = isCoordinator ? notifications : financeNotifications;
  const notificationTitle = isCoordinator
    ? `Pending Disaster Reports (${notifications.length})`
    : `Approved Disasters (${financeNotifications.length})`;
  const notificationQuickText = isCoordinator
    ? "A new disaster report has been submitted and is awaiting your review and approval."
    : "A verified disaster is ready for assessment.";
  const notificationNavigateTarget = isCoordinator ? "/disaster-events" : "/aid-allocation";

  const handleLogout = () => {
    // Clear user data from localStorage
    localStorage.removeItem("user");
    
    // Show logout message
    ToastManager.success("Logged out successfully", 2000);
    
    // Redirect to login page
    setTimeout(() => {
      navigate("/login");
    }, 500);
  };

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
        {(isCoordinator || isFinanceOfficer) && (
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
              {notificationCount > 0 && (
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
                  {notificationCount > 9 ? "9+" : notificationCount}
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
                {notificationCount === 0 ? (
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
                      {notificationTitle}
                    </div>
                    {notificationItems.map((disaster) => (
                      <button
                        key={disaster._id}
                        onClick={() => {
                          navigate(notificationNavigateTarget);
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
                          {notificationQuickText}
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
        {!isCoordinator && !isFinanceOfficer && (
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

        {/* User Profile Menu */}
        <div style={{ position: "relative" }} ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="icon-btn"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              color: "currentColor",
            }}
            title="User menu"
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
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
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
                minWidth: "200px",
                overflow: "hidden",
              }}
            >
              {/* User Info */}
              <div
                style={{
                  padding: "1rem",
                  borderBottom: "1px solid #f3f4f6",
                  backgroundColor: "#f9fafb",
                }}
              >
                <div
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    color: "#1f2937",
                    marginBottom: "0.25rem",
                  }}
                >
                  {currentUser?.user?.name || "User"}
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#6b7280",
                  }}
                >
                  {currentUser?.user?.role || "Role"}
                </div>
              </div>

              {/* Menu Items */}
              <div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    // Could add profile/settings navigation here
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.75rem 1rem",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    color: "#374151",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "white";
                  }}
                >
                  Profile Settings
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    handleLogout();
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.75rem 1rem",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    color: "#dc2626",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#fef2f2";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "white";
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
