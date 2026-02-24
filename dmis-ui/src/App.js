import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Welcome from "./components/Welcome";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import DisasterDashboard from "./pages/DisasterDashboard.jsx";
import RegisterDisaster from "./pages/RegisterDisaster.jsx";

import FundRequests from "./pages/FundRequests.jsx";
import FinanceReports from "./pages/FinanceReports.jsx";
import FinanceCenter from "./pages/FinanceCenter.jsx";
import FinancialDashboardV2 from "./pages/FinancialDashboardV2.jsx";
import FinancialBudgetHubV2 from "./pages/FinancialBudgetHubV2.jsx";
import FinancialBudgetBaselineV2 from "./pages/FinancialBudgetBaselineV2.jsx";
import FinancialBudgetPoolsV2 from "./pages/FinancialBudgetPoolsV2.jsx";
import FinancialBudgetAdjustmentsV2 from "./pages/FinancialBudgetAdjustmentsV2.jsx";
import FinancialBudgetExpendituresV2 from "./pages/FinancialBudgetExpendituresV2.jsx";
import FinancialIncidentHubV2 from "./pages/FinancialIncidentHubV2.jsx";
import FinancialIncidentManagementV2 from "./pages/FinancialIncidentManagementV2.jsx";
import FinancialForecastingHubV2 from "./pages/FinancialForecastingHubV2.jsx";
import FinancialForecastingV2 from "./pages/FinancialForecastingV2.jsx";
import FinanceIncidentFundsV2 from "./pages/FinanceIncidentFundsV2.jsx";
import FinanceIncidentFundDetailV2 from "./pages/FinanceIncidentFundDetailV2.jsx";
import FinanceExpendituresV2 from "./pages/FinanceExpendituresV2.jsx";
import FinanceSnapshotsV2 from "./pages/FinanceSnapshotsV2.jsx";
import Settings from "./pages/Settings.jsx";
import MapPage from "./pages/MapPage";
import Analysis from "./pages/Analysis.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Forecasting from "./pages/Forecasting.jsx";
import CoordinatorFundRequest from "./pages/CoordinatorFundRequest.jsx";

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
                <FinancialDashboardV2 />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-v2"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinancialDashboardV2 />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-v2/dashboard"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinancialDashboardV2 />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-v2/budgets-expenditures"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinancialBudgetHubV2 />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-v2/budgets-expenditures/baseline"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinancialBudgetBaselineV2 />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-v2/budgets-expenditures/pools"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinancialBudgetPoolsV2 />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-v2/budgets-expenditures/adjustments"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinancialBudgetAdjustmentsV2 />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-v2/budgets-expenditures/expenditures"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinancialBudgetExpendituresV2 />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-v2/incidents"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinancialIncidentHubV2 />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-v2/incidents/profile"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinancialIncidentManagementV2 />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-v2/forecasting"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinancialForecastingHubV2 />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-v2/forecasting/overview"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinancialForecastingV2 />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-v2/incident-funds"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinanceIncidentFundsV2 />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-v2/incident-funds/:id"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinanceIncidentFundDetailV2 />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-v2/expenditures"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinanceExpendituresV2 />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-v2/snapshots"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinanceSnapshotsV2 />
              </Layout>
            </ProtectedRoute>
          }
        />


        <Route
          path="/finance-v2/incident-funds"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinanceIncidentFundsV2 />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-v2/incident-funds/:id"
          element={
            <ProtectedRoute allowedRoles={["Finance Officer"]}>
              <Layout>
                <FinanceIncidentFundDetailV2 />
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
                <DisasterDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/disaster-events/register"
          element={
            <ProtectedRoute allowedRoles={["Coordinator", "Data Clerk"]}>
              <Layout>
                <RegisterDisaster />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/fund-requests"
          element={
            <ProtectedRoute allowedRoles={["Coordinator"]}>
              <Layout>
                <CoordinatorFundRequest />
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
            <ProtectedRoute allowedRoles={["Coordinator"]}>
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
