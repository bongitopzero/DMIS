import React, { useState, useEffect } from "react";
import { Plus, X, AlertCircle, CheckCircle2, Loader } from "lucide-react";
import API from "../api/axios";
import { ToastManager } from "./Toast";

/**
 * AllocationRequestForm Component
 * Form for creating aid allocation requests based on household assessments
 */
export default function AllocationRequestForm({ disasterId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [scoringResult, setScoringResult] = useState(null);
  const [step, setStep] = useState(1); // Step 1: Select, Step 2: Review, Step 3: Override
  const [override, setOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideJustification, setOverrideJustification] = useState("");

  useEffect(() => {
    if (showForm) {
      fetchAssessments();
    }
  }, [showForm]);

  const fetchAssessments = async () => {
    try {
      const res = await API.get(
        `/allocation/assessments/${disasterId}?status=Pending Review`
      );
      setAssessments(res.data.assessments || []);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      ToastManager.error("Failed to load assessments");
    }
  };

  const handleSelectAssessment = async (assessmentId) => {
    setSelectedAssessmentId(assessmentId);

    try {
      setLoading(true);
      const res = await API.post("/allocation/calculate-score", {
        assessmentId,
      });
      setScoringResult(res.data);
      setStep(2);
    } catch (error) {
      console.error("Error calculating score:", error);
      ToastManager.error("Failed to calculate allocation score");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAllocation = async () => {
    try {
      setLoading(true);

      const payload = {
        assessmentId: selectedAssessmentId,
        disasterId,
        override,
        overrideReason: override ? overrideReason : undefined,
        overrideJustification: override ? overrideJustification : undefined,
      };

      const res = await API.post("/allocation/create-request", payload);

      ToastManager.success(
        `✅ Allocation created - Total Cost: M${res.data.allocationRequest.totalEstimatedCost.toLocaleString()}`,
        3000
      );

      // Reset form
      setStep(1);
      setSelectedAssessmentId("");
      setScoringResult(null);
      setOverride(false);
      setOverrideReason("");
      setOverrideJustification("");
      setShowForm(false);

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error creating allocation:", error);
      ToastManager.error(
        error.response?.data?.message || "Failed to create allocation"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => {
          setShowForm(!showForm);
          setStep(1);
        }}
        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <Plus className="h-5 w-5" />
        <span>New Allocation</span>
      </button>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Create Aid Allocation
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Step {step} of 3 - {["Select Assessment", "Review Score", "Confirm"][
                    step - 1
                  ]}
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-slate-600 mb-4">
                    Select a household assessment to create an allocation request:
                  </p>

                  {assessments.length === 0 ? (
                    <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
                      <AlertCircle className="h-12 w-12 text-blue-600 mx-auto mb-2 opacity-50" />
                      <p className="text-blue-900 font-medium">
                        No pending assessments found
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        Create household assessments first
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {assessments.map((assessment) => (
                        <button
                          key={assessment._id}
                          onClick={() =>
                            handleSelectAssessment(assessment._id)
                          }
                          disabled={loading}
                          className="w-full p-4 border-2 border-slate-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {assessment.headOfHousehold.name}
                              </p>
                              <p className="text-sm text-slate-600">
                                ID: {assessment.householdId} • {assessment.disasterType} •
                                Damage Level {assessment.damageSeverityLevel}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                Household size: {assessment.householdSize} •
                                Income: M{assessment.monthlyIncome.toLocaleString()}
                              </p>
                            </div>
                            {loading && selectedAssessmentId === assessment._id && (
                              <Loader className="h-5 w-5 animate-spin text-blue-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 2 && scoringResult && (
                <div className="space-y-6">
                  {/* Scoring Summary */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="font-semibold text-slate-900 mb-4">
                      📊 Scoring Summary
                    </h3>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Damage Level</p>
                        <p className="text-3xl font-bold text-red-600">
                          {scoringResult.damageLevel}/4
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 mb-1">
                          Vulnerability Points
                        </p>
                        <p className="text-3xl font-bold text-orange-600">
                          +{scoringResult.scoreBreakdown.vulnerabilityComponent}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border-t border-blue-200 pt-4">
                      <h4 className="font-semibold text-slate-900 mb-3">
                        Vulnerability Breakdown:
                      </h4>
                      <div className="space-y-2 text-sm">
                        {Object.entries(scoringResult.vulnerabilityPoints).map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className="flex justify-between text-slate-700"
                            >
                              <span>
                                {key
                                  .replace(/([A-Z])/g, " $1")
                                  .toLowerCase()
                                  .trim()}
                              </span>
                              <span className="font-medium">+{value}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Composite Score & Tier */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                    <div className="text-center mb-4">
                      <p className="text-sm text-slate-600 mb-2">
                        Composite Score
                      </p>
                      <p className="text-5xl font-bold text-green-600">
                        {scoringResult.compositeScore}
                      </p>
                    </div>

                    <div className="bg-white rounded p-4 text-center border border-green-200">
                      <p className="text-sm text-slate-600 mb-1">Aid Tier</p>
                      <p className="text-xl font-bold text-green-700">
                        {scoringResult.aidTier}
                      </p>
                    </div>
                  </div>

                  {/* Allocated Packages Preview */}
                  <div className="border border-slate-200 rounded-lg p-6">
                    <h4 className="font-semibold text-slate-900 mb-4">
                      📦 Allocated Packages
                    </h4>
                    <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                      {/* Note: Packages will be assigned after clicking Create */}
                      <p className="text-slate-600 italic">
                        Packages will be auto-assigned based on tier
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && scoringResult && (
                <div className="space-y-6">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <h3 className="font-semibold text-purple-900 mb-4 flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5" />
                      <span>Override Information</span>
                    </h3>

                    <div className="space-y-4">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={override}
                          onChange={(e) => setOverride(e.target.checked)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-slate-900 font-medium">
                          This is an override from standard rules
                        </span>
                      </label>

                      {override && (
                        <div className="space-y-4 mt-4 p-4 bg-white rounded border border-purple-200">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Override Reason *
                            </label>
                            <input
                              type="text"
                              value={overrideReason}
                              onChange={(e) =>
                                setOverrideReason(e.target.value)
                              }
                              placeholder="Brief reason for override"
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Written Justification (min. 50 characters) *
                            </label>
                            <textarea
                              value={overrideJustification}
                              onChange={(e) =>
                                setOverrideJustification(e.target.value)
                              }
                              placeholder="Provide detailed justification for this override..."
                              rows="4"
                              minLength="50"
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                              {overrideJustification.length}/50+ characters
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex space-x-3">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  disabled={loading}
                  className="flex-1 bg-slate-200 text-slate-900 py-2 rounded-lg hover:bg-slate-300 disabled:bg-slate-100 transition-colors font-medium"
                >
                  Back
                </button>
              )}

              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={loading || (step === 2 && !scoringResult)}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors font-medium"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleCreateAllocation}
                  disabled={
                    loading ||
                    (override &&
                      overrideJustification.length < 50)
                  }
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors font-medium flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Create Allocation</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => setShowForm(false)}
                disabled={loading}
                className="flex-1 bg-slate-200 text-slate-900 py-2 rounded-lg hover:bg-slate-300 disabled:bg-slate-100 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
