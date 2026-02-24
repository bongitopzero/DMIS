import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Welcome from "./components/Welcome";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import DisasterEvents from "./components/DisasterEvents";
import NewDisasterReport from "./components/NewDisasterReport";
import MySubmissions from "./components/MySubmissions";

import FundManagement from "./pages/FundManagement.jsx";
import FinancialDashboard from "./pages/FinancialDashboard.jsx";
import AidAllocation from "./pages/AidAllocation.jsx";
import BudgetAllocation from "./pages/BudgetAllocation.jsx";
import ExpenseLog from "./pages/ExpenseLog.jsx";
import FinanceAuditTrail from "./pages/FinanceAuditTrail.jsx";
import ApprovedDisasters from "./pages/ApprovedDisasters.jsx";
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
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
          path="/expense-log"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <ExpenseLog />
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
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
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
            <ProtectedRoute allowedRoles={["Coordinator", "Finance Officer", "Data Clerk"]}>
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
