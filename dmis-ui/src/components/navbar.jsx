import { useLocation, useNavigate } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import "./navbar.css";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  
  // Get user information from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = user?.user?.name || "User";
  const userRole = user?.user?.role || "";
  
  // Get user initials (first letter of first and last name)
  const getInitials = (name) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Dashboard";
    if (path === "/disaster-events") return "Disaster Events";
    if (path === "/gis-map") return "GIS Map";
    if (path === "/finance-dashboard") return "Finance Dashboard";
    if (path === "/fund-management") return "Fund Management";
    if (path === "/aid-allocation") return "Aid Allocation";
    if (path === "/admin-dashboard") return "Administrator Dashboard";
    if (path === "/forecasting") return "Forecasting";
    if (path === "/analysis") return "Analysis";
    if (path === "/approved-disasters") return "Approved Disasters";
    if (path === "/budget-allocation") return "Budget Allocation";
  
    if (path === "/finance-audit-trail") return "Finance Audit Trail";
    if (path === "/allocation-dashboard") return "Financial Allocation";

    if (path === "/finance/reports") return "Finance Reports";

    return "Dashboard";
  };

  return (
    <div className="navbar">
      <div className="navbar-left">
        <h2>{getPageTitle()}</h2>
      </div>
      <div className="user">
        {/* Theme Toggle */}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* User Profile with Initials */}
        <button
          type="button"
          className="user-avatar"
          title={`${userName} (${userRole})`}
          onClick={() => navigate("/settings")}
        >
          <span className="user-initials">{getInitials(userName)}</span>
        </button>
      </div>
    </div>
  );
}
