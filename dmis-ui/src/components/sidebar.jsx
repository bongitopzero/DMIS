import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  DollarSign,
  Zap,
  BookOpen,
  Receipt,
  BarChart3,
  TrendingUp,
  Users,
  Settings,
  Map,
  MessageSquare,
  CheckCircle,
  FileText,
  Plus,
} from "lucide-react";
import "./sidebar.css";

export default function Sidebar() {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.user?.role || "";

  const isActive = (path) => location.pathname === path ? "active" : "";

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-box">
          <span className="logo-icon">D</span>
        </div>
        <div className="logo-text">
          <h3>DMIS</h3>
          <p>LESOTHO DMA</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {/* Administrator Menu */}
          {userRole === "Administrator" && (
            <>
              <li className={isActive("/admin-dashboard")}>
                <Link to="/admin-dashboard">
                  <Users size={20} />
                  <span>Admin Dashboard</span>
                </Link>
              </li>
            </>
          )}

          {/* Coordinator Menu */}
          {userRole === "Coordinator" && (
            <>
              <li className={isActive("/dashboard")}>
                <Link to="/dashboard">
                  <BarChart3 size={20} />
                  <span>Dashboard</span>
                </Link>
              </li>
              <li className={isActive("/disaster-events")}>
                <Link to="/disaster-events">
                  <MessageSquare size={20} />
                  <span>Incident Management</span>
                </Link>
              </li>
              <li className={isActive("/gis-map")}>
                <Link to="/gis-map">
                  <Map size={20} />
                  <span>GIS Map</span>
                </Link>
              </li>
              <li className={isActive("/analysis")}>
                <Link to="/analysis">
                  <TrendingUp size={20} />
                  <span>Analysis</span>
                </Link>
              </li>
              <li className={isActive("/forecasting")}>
                <Link to="/forecasting">
                  <Zap size={20} />
                  <span>Forecasting</span>
                </Link>
              </li>
              <li>
                <Link to="/dashboard">
                  <Settings size={20} />
                  <span>Settings</span>
                </Link>
              </li>
            </>
          )}

          {/* Finance Officer Menu */}
          {userRole === "Finance Officer" && (
            <>
              <li className={isActive("/finance-dashboard")}>
                <Link to="/finance-dashboard">
                  <DollarSign size={20} />
                  <span>Finance Dashboard</span>
                </Link>
              </li>
              <li className={isActive("/aid-allocation")}>
                <Link to="/aid-allocation">
                  <Zap size={20} />
                  <span>Aid Allocation</span>
                </Link>
              </li>
              <li className={isActive("/budget-allocation")}>
                <Link to="/budget-allocation">
                  <BookOpen size={20} />
                  <span>Budget Allocation</span>
                </Link>
              </li>
              <li className={isActive("/expense-log")}>
                <Link to="/expense-log">
                  <Receipt size={20} />
                  <span>Expense Log</span>
                </Link>
              </li>
              <li className={isActive("/audit-trail")}>
                <Link to="/audit-trail">
                  <BarChart3 size={20} />
                  <span>Finance Audit Trail</span>
                </Link>
              </li>
              <li className={isActive("/forecasting")}>
                <Link to="/forecasting">
                  <TrendingUp size={20} />
                  <span>Forecasting</span>
                </Link>
              </li>
              <li className={isActive("/approved-disasters")}>
                <Link to="/approved-disasters">
                  <CheckCircle size={20} />
                  <span>Approved Disasters</span>
                </Link>
              </li>
            </>
          )}

          {/* Data Clerk Menu */}
          {userRole === "Data Clerk" && (
            <>
              <li className={isActive("/my-submissions")}>
                <Link to="/my-submissions">
                  <FileText size={20} />
                  <span>My Submissions</span>
                </Link>
              </li>
              <li className={isActive("/new-disaster-report")}>
                <Link to="/new-disaster-report">
                  <Plus size={20} />
                  <span>New Disaster Report</span>
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>
    </aside>
  );
}
