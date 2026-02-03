import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./sidebar.css";

export default function Sidebar() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? "active" : "";

  return (
    <aside className="sidebar">
      <div className="brand">DMIS Lesotho</div>
      <nav>
        <ul>
          <li className={isActive("/dashboard")}>
            <Link to="/dashboard">Dashboard</Link>
          </li>
          <li className={isActive("/disaster-events")}>
            <Link to="/disaster-events">Disaster Events</Link>
          </li>
          <li className={isActive("/gis-map")}>
            <Link to="/gis-map">GIS Map</Link>
          </li>
          <li className={isActive("/fund-management")}>
            <Link to="/fund-management">Financial Tracking</Link>
          </li>
          <li>
            <Link to="/dashboard">Forecasting Reports</Link>
          </li>
          <li>
            <Link to="/dashboard">Settings</Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
