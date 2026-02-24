import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./sidebar.css";

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.user?.role || "";

  const isActive = (path) => (location.pathname === path ? "active" : "");
  const isCoordinator = userRole === "Coordinator";
  const isFinanceOfficer = userRole === "Finance Officer";
  const isDataClerk = userRole === "Data Clerk";
  const isAdmin = userRole === "Administrator";

  const coreItems = [];
  if (isCoordinator) {
    coreItems.push({ label: "Dashboard", path: "/dashboard" });
  }

  const operationsItems = [];
  if (isCoordinator) {
    operationsItems.push(
      { label: "Disaster Dashboard", path: "/disaster-events" },
      { label: "Register Disaster", path: "/disaster-events/register" },
      { label: "Request Funds", path: "/fund-requests" },
      { label: "GIS Map", path: "/gis-map" },
      { label: "Analysis", path: "/analysis" },
      { label: "Forecasting", path: "/forecasting" }
    );
  }
  if (isDataClerk) {
    operationsItems.push(
      { label: "Disaster Dashboard", path: "/disaster-events" },
      { label: "Register Disaster", path: "/disaster-events/register" }
    );
  }

  const financeItems = isFinanceOfficer
    ? [
        { label: "Financial Dashboard", path: "/finance-v2/dashboard" },
        { label: "Budget Modules", path: "/finance-v2/budgets-expenditures" },
        { label: "Incident Modules", path: "/finance-v2/incidents" },
        { label: "Forecasting Modules", path: "/finance-v2/forecasting" },
      ]
    : [];

  const navItems = [
    ...(isAdmin ? [{ label: "Admin Dashboard", path: "/admin-dashboard" }] : []),
    ...coreItems,
    ...operationsItems,
    ...financeItems,
  ];

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <div className="brand">DMIS Lesotho</div>
        <button type="button" className="sidebar-close" onClick={onClose}>
          ×
        </button>
      </div>
      <nav>
        <ul>
          {navItems.map((item) => (
            <li key={item.path} className={isActive(item.path)}>
              <Link to={item.path} onClick={onClose}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
