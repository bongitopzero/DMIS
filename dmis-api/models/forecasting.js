import { getDB } from "../config/db.js";

const MONTHS_WINDOW = 120;
const NEXT_MONTHS = 3;

const seasonalMultipliers = {
  flood: { months: [11, 12, 1, 2, 3], multiplier: 1.4 },
  storm: { months: [10, 11, 12, 1, 2], multiplier: 1.2 },
  drought: { months: [5, 6, 7, 8, 9], multiplier: 1.3 },
};

const normalizeType = (type = "") => type.toLowerCase();

const getSeasonalMultiplier = (disasterType, month) => {
  const normalized = normalizeType(disasterType);

  if (normalized.includes("drought")) {
    return seasonalMultipliers.drought.months.includes(month)
      ? seasonalMultipliers.drought.multiplier
      : 1;
  }

  if (normalized.includes("storm") || normalized.includes("strong_winds")) {
    return seasonalMultipliers.storm.months.includes(month)
      ? seasonalMultipliers.storm.multiplier
      : 1;
  }

  if (normalized.includes("flood") || normalized.includes("heavy_rainfall")) {
    return seasonalMultipliers.flood.months.includes(month)
      ? seasonalMultipliers.flood.multiplier
      : 1;
  }

  return 1;
};

const calculateRegression = (yValues) => {
  const n = yValues.length;
  if (n === 0) {
    return { slope: 0, intercept: 0, r2: 0 };
  }

  const xValues = Array.from({ length: n }, (_, i) => i);
  const meanX = xValues.reduce((sum, x) => sum + x, 0) / n;
  const meanY = yValues.reduce((sum, y) => sum + y, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    const xDiff = xValues[i] - meanX;
    const yDiff = yValues[i] - meanY;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i += 1) {
    const predicted = slope * xValues[i] + intercept;
    ssRes += (yValues[i] - predicted) ** 2;
    ssTot += (yValues[i] - meanY) ** 2;
  }

  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
};

const normalizeIndex = (value, maxValue) => {
  if (!maxValue || maxValue <= 0) return 0;
  return Math.min(100, (value / maxValue) * 100);
};

const getBudgetRisk = (fundingGap, remainingBudget, totalProjectedCost) => {
  if (fundingGap > 0) return "High";
  if (totalProjectedCost > 0 && remainingBudget / totalProjectedCost < 0.5) {
    return "Medium";
  }
  return "Low";
};

const mapSeverityToScore = (severity) => {
  if (typeof severity === "number") return Math.min(5, Math.max(1, severity));
  const normalized = normalizeType(severity);
  if (normalized === "high") return 5;
  if (normalized === "medium") return 3;
  if (normalized === "low") return 2;
  return 1;
};

const parseHouseholds = (value) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;

  const trimmed = value.trim();
  if (trimmed.includes("+")) {
    return Number.parseInt(trimmed.replace("+", ""), 10) || 0;
  }

  const parts = trimmed.split("-").map((part) => Number.parseInt(part, 10));
  if (parts.length === 2 && parts.every((num) => Number.isFinite(num))) {
    return Math.round((parts[0] + parts[1]) / 2);
  }

  return Number.parseInt(trimmed, 10) || 0;
};

export async function generateForecast() {
  const db = getDB();
  const incidentsCollection = db.collection("incidents");
  const budgetsCollection = db.collection("budgets");

  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - MONTHS_WINDOW);

  let incidents = await incidentsCollection
    .find({ date: { $gte: startDate } })
    .toArray();

  if (incidents.length === 0) {
    const disasters = await db
      .collection("disasters")
      .find({ createdAt: { $gte: startDate } })
      .toArray();

    incidents = disasters.map((disaster) => ({
      disasterType: disaster.type,
      district: disaster.district,
      date: disaster.date || disaster.createdAt,
      severity: mapSeverityToScore(disaster.severity),
      householdsAffected: parseHouseholds(disaster.households),
      infrastructureDamageCost: disaster.damageCost || 0,
      cropLossTonnes: 0,
      responseCost: 0,
      status: disaster.status || "reported",
    }));
  }

  const disasterTypes = Array.from(
    new Set(incidents.map((incident) => incident.disasterType).filter(Boolean))
  );

  const monthlyCountsByType = {};
  const averageCostByType = {};
  const regressionScores = [];

  for (const type of disasterTypes) {
    monthlyCountsByType[type] = Array.from({ length: MONTHS_WINDOW }, () => 0);
  }

  const baseDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  incidents.forEach((incident) => {
    const type = incident.disasterType;
    if (!type) return;
    const incidentDate = incident.date ? new Date(incident.date) : null;
    if (!incidentDate) return;

    const monthIndex =
      (incidentDate.getFullYear() - baseDate.getFullYear()) * 12 +
      (incidentDate.getMonth() - baseDate.getMonth());

    if (monthIndex >= 0 && monthIndex < MONTHS_WINDOW) {
      monthlyCountsByType[type][monthIndex] += 1;
    }
  });

  incidents.forEach((incident) => {
    const type = incident.disasterType;
    if (!type) return;
    const cost =
      (incident.infrastructureDamageCost || 0) +
      (incident.responseCost || 0);

    if (!averageCostByType[type]) {
      averageCostByType[type] = { total: 0, count: 0 };
    }

    averageCostByType[type].total += cost;
    averageCostByType[type].count += 1;
  });

  const typeForecasts = disasterTypes.map((type) => {
    const monthlyCounts = monthlyCountsByType[type] ||
      Array.from({ length: MONTHS_WINDOW }, () => 0);
    const { slope, intercept, r2 } = calculateRegression(monthlyCounts);
    regressionScores.push(r2);

    let predictedIncidents = 0;
    for (let i = 0; i < NEXT_MONTHS; i += 1) {
      const monthIndex = MONTHS_WINDOW + i;
      const predicted = slope * monthIndex + intercept;
      predictedIncidents += Math.max(0, predicted);
    }

    const monthNow = now.getMonth() + 1;
    const seasonalMultiplier = getSeasonalMultiplier(type, monthNow);
    predictedIncidents *= seasonalMultiplier;

    const avgCostData = averageCostByType[type];
    const avgCost = avgCostData && avgCostData.count > 0
      ? avgCostData.total / avgCostData.count
      : 0;

    const projectedCost = predictedIncidents * avgCost;

    return {
      type,
      predictedIncidents: Math.round(predictedIncidents),
      projectedCost: Math.round(projectedCost),
      avgCost: avgCost,
    };
  });

  const totalProjectedCost = typeForecasts.reduce(
    (sum, item) => sum + item.projectedCost,
    0
  );

  const totalPredictedIncidents = typeForecasts.reduce(
    (sum, item) => sum + item.predictedIncidents,
    0
  );

  const districtStats = {};
  incidents.forEach((incident) => {
    if (!incident.district) return;
    const key = incident.district;
    if (!districtStats[key]) {
      districtStats[key] = {
        district: key,
        count: 0,
        severityTotal: 0,
        costTotal: 0,
      };
    }
    districtStats[key].count += 1;
    districtStats[key].severityTotal += incident.severity || 0;
    districtStats[key].costTotal +=
      (incident.infrastructureDamageCost || 0) +
      (incident.responseCost || 0);
  });

  const districtValues = Object.values(districtStats);
  const maxFrequency = Math.max(0, ...districtValues.map((d) => d.count));
  const maxSeverity = Math.max(
    0,
    ...districtValues.map((d) => (d.count > 0 ? d.severityTotal / d.count : 0))
  );
  const maxCost = Math.max(
    0,
    ...districtValues.map((d) => (d.count > 0 ? d.costTotal / d.count : 0))
  );

  const districtForecasts = districtValues.map((district) => {
    const avgSeverity = district.count > 0 ? district.severityTotal / district.count : 0;
    const avgCost = district.count > 0 ? district.costTotal / district.count : 0;
    const share = totalPredictedIncidents > 0 ? district.count / incidents.length : 0;
    const predictedIncidents = Math.round(totalPredictedIncidents * share);
    const projectedCost = Math.round(predictedIncidents * avgCost);

    const frequencyIndex = normalizeIndex(district.count, maxFrequency);
    const severityIndex = normalizeIndex(avgSeverity, maxSeverity);
    const costIndex = normalizeIndex(avgCost, maxCost);

    const riskScore =
      0.4 * frequencyIndex + 0.3 * severityIndex + 0.3 * costIndex;

    let riskLevel = "Low";
    if (riskScore >= 75) riskLevel = "High";
    else if (riskScore >= 50) riskLevel = "Medium";

    return {
      district: district.district,
      predictedIncidents,
      projectedCost,
      riskScore: Math.round(riskScore),
      riskLevel,
    };
  });

  const currentYear = now.getFullYear();
  let budget = await budgetsCollection.findOne({ fiscalYear: currentYear });
  if (!budget) {
    budget = await budgetsCollection.findOne({}, { sort: { fiscalYear: -1 } });
  }

  const remainingBudget =
    (budget?.allocatedBudget || 0) -
    (budget?.committedFunds || 0) -
    (budget?.spentFunds || 0);

  const fundingGap = totalProjectedCost - remainingBudget;
  const budgetRisk = getBudgetRisk(
    fundingGap,
    remainingBudget,
    totalProjectedCost
  );

  const dataVolumeScore = Math.min(100, (incidents.length / 300) * 100);
  const regressionStabilityScore = regressionScores.length > 0
    ?
      Math.max(
        0,
        Math.min(
          100,
          (regressionScores.reduce((sum, score) => sum + score, 0) /
            regressionScores.length) *
            100
        )
      )
    : 0;

  const confidenceScore = Math.round(
    0.6 * dataVolumeScore + 0.4 * regressionStabilityScore
  );

  const finalForecast = {
    period: "Next Quarter",
    dataSpanYears: Math.round(MONTHS_WINDOW / 12),
    forecastBreakdown: typeForecasts.map((item) => ({
      disasterType: item.type,
      expectedIncidents: item.predictedIncidents,
      projectedCost: item.projectedCost,
    })),
    districtForecasts,
    totalProjectedCost: Math.round(totalProjectedCost),
    remainingBudget: Math.round(remainingBudget),
    fundingGap: Math.round(fundingGap),
    budgetRisk,
    confidenceScore,
    createdAt: new Date(),
  };

  await db.collection("forecasts").insertOne(finalForecast);

  return finalForecast;
}
