import React, { useState } from "react";
import { Plus, X, AlertCircle, CheckCircle } from "lucide-react";
import API from "../api/axios";
import { ToastManager } from "./Toast";

/**
 * HouseholdAssessmentForm Component
 * Form for creating household disaster assessments
 */
export default function HouseholdAssessmentForm({ disasterId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    householdId: "",
    headOfHousehold: {
      name: "",
      age: "",
      gender: "Male",
    },
    householdSize: "",
    childrenUnder5: 0,
    monthlyIncome: "",
    disasterType: "Heavy Rainfall",
    damageDescription: "",
    damageSeverityLevel: 1,
    damageDetails: {
      roofDamage: "None",
      cropLossPercentage: 0,
      livestockLoss: 0,
      roomsAffected: 0,
      waterAccessImpacted: false,
    },
    recommendedAssistance: "",
    location: {
      village: "",
      district: "",
    },
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith("head_")) {
      const field = name.replace("head_", "");
      setFormData({
        ...formData,
        headOfHousehold: {
          ...formData.headOfHousehold,
          [field]: type === "number" ? parseInt(value) : value,
        },
      });
    } else if (name.startsWith("damage_")) {
      const field = name.replace("damage_", "");
      setFormData({
        ...formData,
        damageDetails: {
          ...formData.damageDetails,
          [field]:
            type === "number"
              ? parseInt(value)
              : type === "checkbox"
                ? checked
                : value,
        },
      });
    } else if (name.startsWith("location_")) {
      const field = name.replace("location_", "");
      setFormData({
        ...formData,
        location: {
          ...formData.location,
          [field]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === "number" ? parseInt(value) : value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      const payload = {
        ...formData,
        disasterId,
        assessedBy: user.user?.name || "Unknown",
      };

      const res = await API.post("/allocation/assessments", payload);

      ToastManager.success(
        `✅ Assessment created for household ${formData.householdId}`,
        3000
      );

      // Reset form
      setFormData({
        householdId: "",
        headOfHousehold: {
          name: "",
          age: "",
          gender: "Male",
        },
        householdSize: "",
        childrenUnder5: 0,
        monthlyIncome: "",
        disasterType: "Heavy Rainfall",
        damageDescription: "",
        damageSeverityLevel: 1,
        damageDetails: {
          roofDamage: "None",
          cropLossPercentage: 0,
          livestockLoss: 0,
          roomsAffected: 0,
          waterAccessImpacted: false,
        },
        recommendedAssistance: "",
        location: {
          village: "",
          district: "",
        },
      });

      setShowForm(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error creating assessment:", error);
      ToastManager.error(
        error.response?.data?.message || "Failed to create assessment"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => setShowForm(!showForm)}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="h-5 w-5" />
        <span>New Assessment</span>
      </button>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  New Household Assessment
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Record disaster damage and household demographics
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Household ID & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Household ID *
                  </label>
                  <input
                    type="text"
                    name="householdId"
                    value={formData.householdId}
                    onChange={handleInputChange}
                    placeholder="e.g., HH-2026-001"
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Disaster Type *
                  </label>
                  <select
                    name="disasterType"
                    value={formData.disasterType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Heavy Rainfall">Heavy Rainfall</option>
                    <option value="Strong Winds">Strong Winds</option>
                    <option value="Drought">Drought</option>
                  </select>
                </div>
              </div>

              {/* Head of Household */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-slate-900 mb-4">
                  Head of Household
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="head_name"
                      value={formData.headOfHousehold.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Age *
                    </label>
                    <input
                      type="number"
                      name="head_age"
                      value={formData.headOfHousehold.age}
                      onChange={handleInputChange}
                      min="18"
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Gender *
                    </label>
                    <select
                      name="head_gender"
                      value={formData.headOfHousehold.gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Household Details */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-slate-900 mb-4">
                  Household Details
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Household Size *
                    </label>
                    <input
                      type="number"
                      name="householdSize"
                      value={formData.householdSize}
                      onChange={handleInputChange}
                      min="1"
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Children Under 5
                    </label>
                    <input
                      type="number"
                      name="childrenUnder5"
                      value={formData.childrenUnder5}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Monthly Income (M) *
                    </label>
                    <input
                      type="number"
                      name="monthlyIncome"
                      value={formData.monthlyIncome}
                      onChange={handleInputChange}
                      min="0"
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Damage Assessment */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-slate-900 mb-4">
                  Damage Assessment
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Damage Severity Level (1-4) *
                    </label>
                    <div className="flex space-x-3">
                      {[1, 2, 3, 4].map((level) => (
                        <label key={level} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="damageSeverityLevel"
                            value={level}
                            checked={formData.damageSeverityLevel === level}
                            onChange={handleInputChange}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-slate-700">
                            Level {level}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Damage Description *
                    </label>
                    <textarea
                      name="damageDescription"
                      value={formData.damageDescription}
                      onChange={handleInputChange}
                      placeholder="Describe the damage to property and livelihood"
                      required
                      rows="4"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Disaster-specific damage details */}
                  {formData.disasterType === "Heavy Rainfall" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Rooms Affected
                        </label>
                        <input
                          type="number"
                          name="damage_roomsAffected"
                          value={formData.damageDetails.roomsAffected}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Crop Loss (%)
                        </label>
                        <input
                          type="number"
                          name="damage_cropLossPercentage"
                          value={formData.damageDetails.cropLossPercentage}
                          onChange={handleInputChange}
                          min="0"
                          max="100"
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  )}

                  {formData.disasterType === "Strong Winds" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Roof Damage Description
                      </label>
                      <input
                        type="text"
                        name="damage_roofDamage"
                        value={formData.damageDetails.roofDamage}
                        onChange={handleInputChange}
                        placeholder="e.g., minor, partly blown, completely destroyed"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  )}

                  {formData.disasterType === "Drought" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Crop Loss (%)
                        </label>
                        <input
                          type="number"
                          name="damage_cropLossPercentage"
                          value={formData.damageDetails.cropLossPercentage}
                          onChange={handleInputChange}
                          min="0"
                          max="100"
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          name="damage_waterAccessImpacted"
                          checked={formData.damageDetails.waterAccessImpacted}
                          onChange={handleInputChange}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium text-slate-700">
                          Water access impacted
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-slate-900 mb-4">Location</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Village
                    </label>
                    <input
                      type="text"
                      name="location_village"
                      value={formData.location.village}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      District
                    </label>
                    <input
                      type="text"
                      name="location_district"
                      value={formData.location.district}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Recommended Assistance */}
              <div className="border-t border-slate-200 pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Recommended Assistance (Optional)
                </label>
                <textarea
                  name="recommendedAssistance"
                  value={formData.recommendedAssistance}
                  onChange={handleInputChange}
                  placeholder="Any specific assistance recommendations"
                  rows="3"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors font-medium"
                >
                  {loading ? "Creating..." : "Create Assessment"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-slate-200 text-slate-900 py-2 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
