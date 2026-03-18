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
  Menu,
} from "lucide-react";
import "./sidebar.css";

export default function Sidebar({ collapsed = false, onToggle }) {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.user?.role || "";

  const isActive = (path) => location.pathname === path ? "active" : "";

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-box">
          <span className="logo-icon">D</span>
        </div>
        <div className="logo-text">
          <h3>DMIS</h3>
          <p>LESOTHO DMA</p>
        </div>
        <button
          className="sidebar-toggle"
          onClick={() => onToggle && onToggle()}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        >
          <Menu size={18} />
        </button>
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
                    <span className="nav-text">Dashboard</span>
                </Link>
              </li>
              <li className={isActive("/disaster-events")}>
                <Link to="/disaster-events">
                  <MessageSquare size={20} />
                  <span className="nav-text">Incident Management</span>
                </Link>
              </li>
              <li className={isActive("/gis-map")}>
                <Link to="/gis-map">
                  <Map size={20} />
                  <span className="nav-text">GIS Map</span>
                </Link>
              </li>
              <li className={isActive("/analysis")}>
                <Link to="/analysis">
                  <TrendingUp size={20} />
                  <span className="nav-text">Analysis</span>
                </Link>
              </li>
              <li className={isActive("/forecasting")}>
                <Link to="/forecasting">
                  <Zap size={20} />
                  <span className="nav-text">Forecasting</span>
                </Link>
              </li>
              <li>
                <Link to="/dashboard">
                  <Settings size={20} />
                  <span className="nav-text">Settings</span>
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
                    <span className="nav-text">Finance Dashboard</span>
                </Link>
              </li>
              <li className={isActive("/aid-allocation")}>
                <Link to="/aid-allocation">
                  <Zap size={20} />
                  <span className="nav-text">Aid Allocation</span>
                </Link>
              </li>
              <li className={isActive("/budget-allocation")}>
                <Link to="/budget-allocation">
                  <BookOpen size={20} />
                  <span className="nav-text">Budget Allocation</span>
                </Link>
              </li>
              {/* Expense Log removed */}
              <li className={isActive("/audit-trail")}>
                <Link to="/audit-trail">
                  <BarChart3 size={20} />
                  <span className="nav-text">Finance Audit Trail</span>
                </Link>
              </li>
              <li className={isActive("/forecasting")}>
                <Link to="/forecasting">
                  <TrendingUp size={20} />
                  <span className="nav-text">Forecasting</span>
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
                  <span className="nav-text">My Submissions</span>
                </Link>
              </li>
              <li className={isActive("/new-disaster-report")}>
                <Link to="/new-disaster-report">
                  <Plus size={20} />
                  <span className="nav-text">New Disaster Report</span>
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>
    </aside>
  );
}
