import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Welcome from "./components/Welcome";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import DisasterEvents from "./components/DisasterEvents";
import IncidentManagement from "./pages/IncidentManagement.jsx";
import NewDisasterReport from "./components/NewDisasterReport";
import MySubmissions from "./components/MySubmissions";

import FundManagement from "./pages/FundManagement.jsx";
import FinancialDashboard from "./pages/FinancialDashboard.jsx";
import AidAllocation from "./pages/AidAllocation.jsx";
import BudgetAllocation from "./pages/BudgetAllocation.jsx";
import FinanceAuditTrail from "./pages/FinanceAuditTrail.jsx";
import ApprovedDisasters from "./pages/ApprovedDisasters.jsx";
import MapPage from "./pages/MapPage";
import Analysis from "./pages/Analysis.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import SystemSettings from "./pages/SystemSettings.jsx";
import Settings from "./pages/Settings";

import Sidebar from "./components/sidebar";
import Navbar from "./components/navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";

import "./App.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-red-50 to-orange-50">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-red-200">
            <div className="text-center mb-6">
<div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{backgroundColor: 'var(--danger-light)'}}>
                <span style={{fontSize: '2.5rem', color: 'var(--danger)'}}>!</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
              <p className="text-gray-600 mb-6">We encountered an unexpected error. Please refresh the page.</p>
            </div>
            <div className="space-y-3 mb-6 text-sm">
              <details className="bg-gray-50 p-3 rounded-lg open:bg-gray-100">
                <summary className="font-medium text-gray-900 cursor-pointer select-none">Error details</summary>
                <pre className="mt-2 text-xs text-gray-700 overflow-auto max-h-40 bg-gray-900 text-green-400 p-3 rounded font-mono">
                  {this.state.error?.message || 'Unknown error'}
                </pre>
              </details>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-indigo-600 text-white py-2.5 px-4 rounded-xl font-medium hover:bg-indigo-700 transition-all duration-200"
              >
                🔄 Refresh Page
              </button>
              <a href="/dashboard" className="flex-1 bg-gray-100 text-gray-900 py-2.5 px-4 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200 text-center">
                🏠 Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  return (
    <ErrorBoundary>
      <div
        className="flex min-h-screen"
        style={{
          backgroundColor: "var(--bg-secondary)",
          color: "var(--text-primary)",
          transition: "background-color 0.3s ease, color 0.3s ease",
        }}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((s) => !s)}
        />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["Coordinator"]}>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/finance-dashboard"
            element={
              <ProtectedRoute allowedRoles={["Finance Officer"]}>
                <Layout>
                  <FinancialDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/aid-allocation"
            element={
              <ProtectedRoute allowedRoles={["Finance Officer"]}>
                <Layout>
                  <AidAllocation />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/budget-allocation"
            element={
              <ProtectedRoute allowedRoles={["Finance Officer"]}>
                <Layout>
                  <BudgetAllocation />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/audit-trail"
            element={
              <ProtectedRoute allowedRoles={["Finance Officer"]}>
                <Layout>
                  <FinanceAuditTrail />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/approved-disasters"
            element={
              <ProtectedRoute allowedRoles={["Coordinator", "Administrator"]}>
                <Layout>
                  <ApprovedDisasters />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-submissions"
            element={
              <ProtectedRoute allowedRoles={["Data Clerk"]}>
                <Layout>
                  <MySubmissions />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/new-disaster-report"
            element={
              <ProtectedRoute allowedRoles={["Data Clerk"]}>
                <Layout>
                  <NewDisasterReport />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/disaster-events"
            element={
              <ProtectedRoute allowedRoles={["Coordinator", "Data Clerk"]}>
                <Layout>
                  <DisasterEvents />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/incidents"
            element={
              <ProtectedRoute allowedRoles={["Coordinator", "Data Clerk"]}>
                <Layout>
                  <IncidentManagement />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/fund-management"
            element={
              <ProtectedRoute allowedRoles={["Finance Officer"]}>
                <Layout>
                  <FundManagement />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/gis-map"
            element={
              <ProtectedRoute allowedRoles={["Coordinator", "Data Clerk"]}>
                <Layout>
                  <MapPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/analysis"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "Coordinator",
                  "Finance Officer",
                  "Data Clerk",
                ]}
              >
                <Layout>
                  <Analysis />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={["Administrator"]}>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin-dashboard/settings"
            element={
              <ProtectedRoute allowedRoles={["Administrator"]}>
                <Layout>
                  <SystemSettings />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "Coordinator",
                  "Finance Officer",
                  "Data Clerk",
                  "Administrator",
                ]}
              >
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/unauthorized"
            element={
              <div className="p-10" style={{ color: "var(--danger)" }}>
                <h2 className="text-xl font-semibold">Access Denied</h2>
                <p>You do not have permission to view this page.</p>
              </div>
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;