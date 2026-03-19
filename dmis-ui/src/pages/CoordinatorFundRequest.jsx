import React, { useEffect, useState } from "react";
import API from "../api/axios";

export default function CoordinatorFundRequest() {
  const [disasters, setDisasters] = useState([]);
  const [requestForm, setRequestForm] = useState({
    incidentId: "",
    amount: "",
    category: "",
    urgency: "",
    purpose: "",
    notes: "",
    supportingDocs: "",
  });
  const [requestStatus, setRequestStatus] = useState({ type: "", message: "" });
  const [fundRequests, setFundRequests] = useState([]);
  const [requestSummary, setRequestSummary] = useState(null);
  const [step, setStep] = useState(1);
  const [overview, setOverview] = useState(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchDisasters();
    fetchFundRequests();
    fetchOverview();
  }, []);

  const fetchDisasters = async () => {
    try {
      const res = await API.get("/disasters");
      setDisasters(res.data || []);
    } catch (err) {
      // Silent fail
    }
  };

  const fetchFundRequests = async () => {
    try {
      const res = await API.get("/finance-v2/activities");
      setFundRequests(res.data?.requests || []);
      setRequestSummary(res.data?.summary || null);
    } catch (err) {
      // Silent fail
    }
  };

  const fetchOverview = async () => {
    try {
      const res = await API.get("/finance-v2/overview");
      setOverview(res.data || null);
    } catch (err) {
      // Silent fail
    }
  };

  const submitFundRequest = async () => {
    setRequestStatus({ type: "", message: "" });
    if (!requestForm.incidentId || !requestForm.amount || !requestForm.category || !requestForm.urgency || !requestForm.purpose) {
      setRequestStatus({ type: "error", message: "Complete all required fields before submitting." });
      return;
    }
    try {
      await API.post("/finance/request", {
        incidentId: requestForm.incidentId,
        requestedAmount: Number(requestForm.amount),
        category: requestForm.category,
        urgency: requestForm.urgency,
        purpose: requestForm.purpose,
        notes: requestForm.notes,
        supportingDocs: requestForm.supportingDocs
          ? requestForm.supportingDocs.split(",").map((item) => item.trim()).filter(Boolean)
          : [],
      });
      setRequestStatus({ type: "success", message: "Fund request submitted." });
      setRequestForm({ incidentId: "", amount: "", category: "", urgency: "", purpose: "", notes: "", supportingDocs: "" });
      setStep(1);
      fetchFundRequests();
    } catch (err) {
      setRequestStatus({
        type: "error",
        message: err.response?.data?.message || "Failed to submit request",
      });
    }
  };

  const formatMoney = (value) => {
    const numeric = Number.isFinite(value) ? value : 0;
    return numeric.toLocaleString();
  };

  const currentYearDisasters = disasters.filter((item) => {
    const date = new Date(item.createdAt || item.date || Date.now());
    return date.getFullYear() === currentYear;
  });
  const selectedIncident = currentYearDisasters.find((item) => item._id === requestForm.incidentId);
  const steps = [
    { id: 1, label: "Select Incident" },
    { id: 2, label: "Request Details" },
    { id: 3, label: "Review & Submit" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text" style={{ letterSpacing: "-0.3px" }}>
          Request Funds
        </h1>
        <p className="text-sm text-muted">Coordinator fund request workflow</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <h2 className="text-lg font-semibold text-text mb-4">Submit Fund Request</h2>
          <div className="flex flex-wrap gap-3 mb-6">
            {steps.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step >= item.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {item.id}
                </div>
                <span className={`text-xs font-medium ${step >= item.id ? "text-slate-700" : "text-slate-400"}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          {requestStatus.message && (
            <div
              className={`text-xs mb-3 p-2 rounded ${
                requestStatus.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}
            >
              {requestStatus.message}
            </div>
          )}
          <div className="space-y-4">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Incident <span className="text-red-500">*</span></label>
                  <select
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                    value={requestForm.incidentId}
                    onChange={(e) => setRequestForm((prev) => ({ ...prev, incidentId: e.target.value }))}
                  >
                    <option value="">Select incident</option>
                    {currentYearDisasters.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.type?.replace(/_/g, " ")} • {item.district}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedIncident && (
                  <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-3">
                    <div className="font-semibold text-slate-700">Selected Incident</div>
                    <div>{selectedIncident.type?.replace(/_/g, " ")} • {selectedIncident.district}</div>
                    <div>Status: {selectedIncident.status || "reported"}</div>
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700"
                    onClick={() => {
                      if (!requestForm.incidentId) {
                        setRequestStatus({ type: "error", message: "Select an incident to continue." });
                        return;
                      }
                      setStep(2);
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {selectedIncident && (
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-600">
                    <div className="font-semibold text-slate-700 mb-2">Impact Summary</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>Total Affected Households: <strong>{selectedIncident.totalAffectedHouseholds || 0}</strong></div>
                      <div>Total Affected Population: <strong>{selectedIncident.totalAffectedPopulation || 0}</strong></div>
                      <div>Male Population: <strong>{selectedIncident.malePopulation || 0}</strong></div>
                      <div>Female Population: <strong>{selectedIncident.femalePopulation || 0}</strong></div>
                      <div>Children (0–17): <strong>{selectedIncident.childrenCount || 0}</strong></div>
                      <div>Elderly (60+): <strong>{selectedIncident.elderlyCount || 0}</strong></div>
                      <div>Persons with Disabilities: <strong>{selectedIncident.disabledCount || 0}</strong></div>
                      <div>Child-Headed Households: <strong>{selectedIncident.childHeadedHouseholds || 0}</strong></div>
                      <div>Female-Headed Households: <strong>{selectedIncident.femaleHeadedHouseholds || 0}</strong></div>
                      <div>Vulnerable Households: <strong>{selectedIncident.vulnerableHouseholds || 0}</strong></div>
                    </div>
                  </div>
                )}

                {selectedIncident?.householdDamageDetails?.length ? (
                  <div className="border border-slate-200 rounded-md p-3">
                    <div className="text-xs font-semibold text-slate-700 mb-2">Household Damage Details</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-slate-600">
                        <thead className="text-[11px] uppercase text-slate-400">
                          <tr>
                            <th className="text-left py-1">Household ID</th>
                            <th className="text-left py-1">Head Name</th>
                            <th className="text-left py-1">Structure</th>
                            <th className="text-left py-1">Roof</th>
                            <th className="text-left py-1">Condition</th>
                            <th className="text-left py-1">Damage</th>
                            <th className="text-left py-1">Repair</th>
                            <th className="text-left py-1">Rebuild</th>
                            <th className="text-left py-1">Livestock</th>
                            <th className="text-left py-1">Crops</th>
                            <th className="text-left py-1">Assets</th>
                            <th className="text-left py-1">Needs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedIncident.householdDamageDetails.map((row, idx) => (
                            <tr key={`${row.householdId || idx}`} className="border-t">
                              <td className="py-1 pr-2">{row.householdId || "-"}</td>
                              <td className="py-1 pr-2">{row.headName || "-"}</td>
                              <td className="py-1 pr-2">{row.structureType || "-"}</td>
                              <td className="py-1 pr-2">{row.roofType || "-"}</td>
                              <td className="py-1 pr-2">{row.conditionBefore || "-"}</td>
                              <td className="py-1 pr-2">{row.damageLevel || "-"}</td>
                              <td className="py-1 pr-2">M {formatMoney(Number(row.estimatedRepairCost || 0))}</td>
                              <td className="py-1 pr-2">M {formatMoney(Number(row.estimatedRebuildCost || 0))}</td>
                              <td className="py-1 pr-2">{row.livestockLost || 0}</td>
                              <td className="py-1 pr-2">{row.cropsLost || "-"}</td>
                              <td className="py-1 pr-2">{row.assetsDamaged || "-"}</td>
                              <td className="py-1">
                                {Array.isArray(row.needsCategory) && row.needsCategory.length > 0
                                  ? row.needsCategory.join(", ")
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">No household damage details recorded.</div>
                )}

                {selectedIncident && (
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-600">
                    <div className="font-semibold text-slate-700 mb-2">Infrastructure Damage</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>Schools Damaged: <strong>{selectedIncident.schoolsDamaged || 0}</strong></div>
                      <div>Clinics Damaged: <strong>{selectedIncident.clinicsDamaged || 0}</strong></div>
                      <div>Roads Damaged (km): <strong>{selectedIncident.roadsDamagedKm || 0}</strong></div>
                      <div>Bridges Damaged: <strong>{selectedIncident.bridgesDamaged || 0}</strong></div>
                      <div>Water Systems Affected: <strong>{selectedIncident.waterSystemsAffected || 0}</strong></div>
                      <div>Electricity Infrastructure Damage: <strong>{selectedIncident.electricityDamage || 0}</strong></div>
                      <div>Public Buildings Damaged: <strong>{selectedIncident.publicBuildingsDamaged || 0}</strong></div>
                      <div>Estimated Infrastructure Repair Cost: <strong>M {formatMoney(Number(selectedIncident.infrastructureRepairCost || 0))}</strong></div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Category <span className="text-red-500">*</span></label>
                    <select
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                      value={requestForm.category}
                      onChange={(e) => setRequestForm((prev) => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="">Select category</option>
                      <option value="Shelter">Shelter</option>
                      <option value="Food">Food</option>
                      <option value="Medical">Medical</option>
                      <option value="WASH">WASH</option>
                      <option value="Logistics">Logistics</option>
                      <option value="Infrastructure">Infrastructure</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Urgency <span className="text-red-500">*</span></label>
                    <select
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                      value={requestForm.urgency}
                      onChange={(e) => setRequestForm((prev) => ({ ...prev, urgency: e.target.value }))}
                    >
                      <option value="">Select urgency</option>
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Requested Amount (M) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                    value={requestForm.amount}
                    onChange={(e) => setRequestForm((prev) => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Purpose <span className="text-red-500">*</span></label>
                  <textarea
                    rows={3}
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                    value={requestForm.purpose}
                    onChange={(e) => setRequestForm((prev) => ({ ...prev, purpose: e.target.value }))}
                    placeholder="Explain what this request will fund"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                  <textarea
                    rows={2}
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                    value={requestForm.notes}
                    onChange={(e) => setRequestForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional context for finance review"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Supporting Docs (URLs)</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                    value={requestForm.supportingDocs}
                    onChange={(e) => setRequestForm((prev) => ({ ...prev, supportingDocs: e.target.value }))}
                    placeholder="https://... , https://..."
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="text-sm text-slate-600 hover:text-slate-800"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700"
                    onClick={() => {
                      if (!requestForm.amount || !requestForm.category || !requestForm.urgency || !requestForm.purpose) {
                        setRequestStatus({ type: "error", message: "Complete all required fields to continue." });
                        return;
                      }
                      setStep(3);
                    }}
                  >
                    Review
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-sm text-slate-600">
                  <div className="font-semibold text-slate-700 mb-2">Request Summary</div>
                  <div>Incident: {selectedIncident?.type?.replace(/_/g, " ")} • {selectedIncident?.district}</div>
                  <div>Category: {requestForm.category}</div>
                  <div>Urgency: {requestForm.urgency}</div>
                  <div>Amount: M {formatMoney(Number(requestForm.amount || 0))}</div>
                  <div className="mt-2">Purpose: {requestForm.purpose}</div>
                  {requestForm.notes && <div className="mt-1">Notes: {requestForm.notes}</div>}
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="text-sm text-slate-600 hover:text-slate-800"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700"
                    onClick={submitFundRequest}
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text">Recent Requests</h2>
              {requestSummary && (
                <span className="text-xs text-slate-500">Pending: {requestSummary.pendingCount}</span>
              )}
            </div>
            {fundRequests.length === 0 ? (
              <div className="text-xs text-slate-500">No fund requests yet.</div>
            ) : (
              <div className="space-y-3">
                {fundRequests.map((req) => (
                  <div key={req._id} className="border border-slate-100 rounded-md p-2">
                    <div className="text-xs text-slate-600">
                      {req.incidentId?.district || "Incident"} • {req.incidentId?.type?.replace(/_/g, " ")}
                    </div>
                    <div className="text-sm font-semibold">M {formatMoney(req.requestedAmount || 0)}</div>
                    <div className="text-[11px] text-slate-500">Status: {req.status}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
            <h2 className="text-lg font-semibold text-text mb-4">Disaster Pool Summary</h2>
            {overview?.envelopes?.length ? (
              <div className="space-y-3">
                {overview.envelopes.map((env) => (
                  <div key={env._id} className="border border-slate-100 rounded-md p-2">
                    <div className="text-xs text-slate-600">
                      {env.disasterType?.replace(/_/g, " ")}
                    </div>
                    <div className="text-sm font-semibold">Remaining: M {formatMoney(env.remaining || 0)}</div>
                    <div className="text-[11px] text-slate-500">Allocated: M {formatMoney(env.totalAllocated || 0)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500">Pool summary unavailable.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
