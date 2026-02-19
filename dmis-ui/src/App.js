import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Welcome from "./components/Welcome";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import DisasterEvents from "./components/DisasterEvents";

import FinanceDashboard from "./pages/FinanceDashboard.jsx";
import FundRequests from "./pages/FundRequests.jsx";
import FinanceReports from "./pages/FinanceReports.jsx";
import FinanceCenter from "./pages/FinanceCenter.jsx";
import Settings from "./pages/Settings.jsx";
import MapPage from "./pages/MapPage";
import Analysis from "./pages/Analysis.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Forecasting from "./pages/Forecasting.jsx";

import Sidebar from "./components/sidebar";
import Navbar from "./components/navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";

import "./App.css";

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="app-shell">
      <div
        className={`sidebar-overlay ${sidebarOpen ? "show" : ""}`}
        onClick={() => setSidebarOpen(false)}
        role="presentation"
      ></div>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-main">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
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
                <FinanceDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance/budget-overview"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinanceCenter initialTab="budget" />
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
          path="/fund-management"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinanceCenter initialTab="tracking" />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance/requests"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FundRequests />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance/expenditures"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinanceCenter initialTab="expenditures" />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance/risk"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinanceCenter initialTab="risk" />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance/forecast-alignment"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinanceCenter initialTab="forecast" />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-center"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinanceCenter />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance/reports"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinanceReports />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={["Coordinator", "Data Clerk", "Finance Officer", "Administrator"]}>
              <Layout>
                <Settings />
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
            <ProtectedRoute allowedRoles={["Coordinator"]}>
              <Layout>
                <Analysis />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/forecasting"
          element={
            <ProtectedRoute allowedRoles={["Coordinator"]}>
              <Layout>
                <Forecasting />
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
          path="/unauthorized"
          element={
            <div className="p-10 text-red-600">
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
