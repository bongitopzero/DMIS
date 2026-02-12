import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./sidebar.css";

export default function Sidebar() {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.user?.role || "";

  const isActive = (path) => location.pathname === path ? "active" : "";

  return (
    <aside className="sidebar">
      <div className="brand">DMIS Lesotho</div>
      <nav>
        <ul>
          {/* Administrator Menu */}
          {userRole === "Administrator" && (
            <>
              <li className={isActive("/admin-dashboard")}>
                <Link to="/admin-dashboard">Admin Dashboard</Link>
              </li>
            </>
          )}

          {/* Coordinator Menu */}
          {userRole === "Coordinator" && (
            <>
              <li className={isActive("/dashboard")}>
                <Link to="/dashboard">Dashboard</Link>
              </li>
              <li className={isActive("/disaster-events")}>
                <Link to="/disaster-events">Incident Management</Link>
              </li>
              <li className={isActive("/gis-map")}>
                <Link to="/gis-map">GIS Map</Link>
              </li>
              <li className={isActive("/analysis")}>
                <Link to="/analysis">Analysis</Link>
              </li>
              <li className={isActive("/forecasting")}>
                <Link to="/forecasting">Forecasting</Link>
              </li>
              <li>
                <Link to="/dashboard">Settings</Link>
              </li>
            </>
          )}

          {/* Finance Officer Menu */}
          {userRole === "Finance Officer" && (
            <>
              <li className={isActive("/finance-dashboard")}>
                <Link to="/finance-dashboard">Finance Dashboard</Link>
              </li>
              <li className={isActive("/fund-management")}>
                <Link to="/fund-management">Financial Tracking</Link>
              </li>
              <li className={isActive("/analysis")}>
                <Link to="/analysis">Analysis</Link>
              </li>
            </>
          )}

          {/* Data Clerk Menu */}
          {userRole === "Data Clerk" && (
            <>
              <li className={isActive("/disaster-events")}>
                <Link to="/disaster-events">Disaster Events</Link>
              </li>
              <li className={isActive("/gis-map")}>
                <Link to="/gis-map">GIS Map</Link>
              </li>
              <li className={isActive("/analysis")}>
                <Link to="/analysis">Analysis</Link>
              </li>
            </>
          )}
        </ul>
      </nav>
    </aside>
  );
}
