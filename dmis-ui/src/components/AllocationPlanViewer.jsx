import React, { useState, useEffect } from "react";
import { Download, Eye, X } from "lucide-react";
import API from "../api/axios";
import { ToastManager } from "./Toast";

/**
 * AllocationPlanViewer Component
 * Displays comprehensive allocation plans with itemized procurement details
 */
export default function AllocationPlanViewer({ planId, onClose }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPlan();
  }, [planId]);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      // Note: You'll need to add this endpoint to your backend
      // For now, this is a placeholder
      setError("");
    } catch (err) {
      console.error("Error fetching plan:", err);
      setError("Failed to load allocation plan");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    ToastManager.success("PDF export will be implemented soon");
  };

  const handleExportExcel = () => {
    ToastManager.success("Excel export will be implemented soon");
  };

  if (loading) {
    return <div className="p-6 text-center">Loading plan...</div>;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-lg flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Allocation Plan</h2>
          <p className="text-purple-100 text-sm mt-1">
            Complete itemized procurement and distribution schedule
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto bg-slate-50">
        {/* Export Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
          >
            <Download className="h-4 w-4" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
          >
            <Download className="h-4 w-4" />
            <span>Export Excel</span>
          </button>
        </div>

        {/* Plan Summary */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Plan Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Households</p>
              <p className="text-2xl font-bold text-blue-600">—</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Budget</p>
              <p className="text-2xl font-bold text-green-600">M—</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Packages</p>
              <p className="text-2xl font-bold text-purple-600">—</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Status</p>
              <p className="text-2xl font-bold text-indigo-600">—</p>
            </div>
          </div>
        </div>

        {/* Procurement Summary */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            📦 Procurement Summary
          </h3>
          <p className="text-slate-600 text-sm mb-4">
            Itemized details for procurement (quantities × unit price × vendor)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-700 font-semibold">
                    Package Name
                  </th>
                  <th className="px-4 py-3 text-left text-slate-700 font-semibold">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-slate-700 font-semibold">
                    Total Qty
                  </th>
                  <th className="px-4 py-3 text-right text-slate-700 font-semibold">
                    Unit Cost
                  </th>
                  <th className="px-4 py-3 text-right text-slate-700 font-semibold">
                    Total Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Placeholder rows */}
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td colSpan="5" className="px-4 py-4 text-center text-slate-500">
                    Plan data will be displayed here
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Vulnerability Distribution */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Vulnerability Score Distribution
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["Basic", "Moderate", "Severe", "Critical"].map((tier, i) => (
              <div
                key={i}
                className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center"
              >
                <p className="text-sm text-slate-600 mb-2">{tier}</p>
                <p className="text-xl font-bold text-slate-900">— HH</p>
                <p className="text-xs text-slate-500 mt-1">—%</p>
              </div>
            ))}
          </div>
        </div>

        {/* Household Allocations */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Individual Household Allocations
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-700 font-semibold">
                    Household ID
                  </th>
                  <th className="px-4 py-3 text-left text-slate-700 font-semibold">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-slate-700 font-semibold">
                    Tier
                  </th>
                  <th className="px-4 py-3 text-left text-slate-700 font-semibold">
                    Packages
                  </th>
                  <th className="px-4 py-3 text-right text-slate-700 font-semibold">
                    Total Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Placeholder rows */}
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td colSpan="5" className="px-4 py-4 text-center text-slate-500">
                    Household data will be displayed here
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
