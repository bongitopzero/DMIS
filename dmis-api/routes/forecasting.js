import express from "express";
import Disaster from "../models/Disaster.js";
import protect from "../middleware/auth.js";

const router = express.Router();

// Get comprehensive forecasting data
router.get("/", protect, async (req, res) => {
  try {
    const disasters = await Disaster.find({});
    const dataSpanYears = getDataSpanYears(disasters);

    // 1. DISASTER OCCURRENCE FORECAST
    const occurrenceForecast = calculateOccurrenceForecast(disasters);

    // 2. SEASONAL RISK FORECAST
    const seasonalForecast = calculateSeasonalForecast(disasters);

    // 3. DISTRICT RISK RANKING
    const districtRanking = calculateDistrictRanking(disasters);

    // 4. IMPACT FORECAST
    const impactForecast = calculateImpactForecast(disasters);

    // 5. BUDGET FORECAST
    const budgetForecast = calculateBudgetForecast(disasters);

    res.json({
      occurrenceForecast,
      seasonalForecast,
      districtRanking,
      impactForecast,
      budgetForecast,
      totalDisasters: disasters.length,
      dataSpanYears,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error("❌ Forecasting error:", error);
    res.status(500).json({ message: error.message });
  }
});

const getDataSpanYears = (disasters) => {
  if (!disasters.length) return 1;
  const dates = disasters
    .map((d) => new Date(d.createdAt || d.date || Date.now()))
    .filter((d) => !Number.isNaN(d.getTime()));
  if (!dates.length) return 1;
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  const months =
    (maxDate.getFullYear() - minDate.getFullYear()) * 12 +
    (maxDate.getMonth() - minDate.getMonth()) +
    1;
  return Math.max(1, Math.round(months / 12));
};

// Calculate Disaster Occurrence Forecast
function calculateOccurrenceForecast(disasters) {
  const spanYears = getDataSpanYears(disasters);
  const spanMonths = spanYears * 12;
  const byType = {};
  const byDistrict = {};
  const byTypeAndDistrict = {};

  disasters.forEach((d) => {
    const type = d.type || "unknown";
    const district = d.district || "Unknown";

    // Count by type
    byType[type] = (byType[type] || 0) + 1;

    // Count by district
    byDistrict[district] = (byDistrict[district] || 0) + 1;

    // Count by type and district
    const key = `${type}_${district}`;
    byTypeAndDistrict[key] = (byTypeAndDistrict[key] || 0) + 1;
  });

  // Calculate annual forecast (assuming data covers multiple years)
  const forecastByType = Object.entries(byType).map(([type, count]) => ({
    type,
    historicalCount: count,
    annualForecast: Math.round(count / spanYears),
    monthlyAverage: (count / spanMonths).toFixed(1),
  }));

  const forecastByDistrict = Object.entries(byDistrict)
    .map(([district, count]) => ({
      district,
      historicalCount: count,
      annualForecast: Math.round(count / spanYears),
      riskLevel: count > 50 ? "High" : count > 20 ? "Medium" : "Low",
    }))
    .sort((a, b) => b.historicalCount - a.historicalCount);

  return {
    byType: forecastByType,
    byDistrict: forecastByDistrict.slice(0, 10), // Top 10 districts
    totalHistorical: disasters.length,
    projectedAnnual: Math.round(disasters.length / spanYears),
  };
}

// Calculate Seasonal Risk Forecast
function calculateSeasonalForecast(disasters) {
  const monthlyData = Array(12).fill(0);
  const monthlyByType = {
    drought: Array(12).fill(0),
    heavy_rainfall: Array(12).fill(0),
    strong_winds: Array(12).fill(0),
  };

  disasters.forEach((d) => {
    const month = new Date(d.createdAt).getMonth();
    monthlyData[month]++;

    if (monthlyByType[d.type]) {
      monthlyByType[d.type][month]++;
    }
  });

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const seasonalTrends = months.map((month, idx) => ({
    month,
    totalIncidents: monthlyData[idx],
    riskLevel:
      monthlyData[idx] > 30 ? "High" : monthlyData[idx] > 15 ? "Medium" : "Low",
    drought: monthlyByType.drought[idx],
    heavy_rainfall: monthlyByType.heavy_rainfall[idx],
    strong_winds: monthlyByType.strong_winds[idx],
  }));

  // Identify high-risk seasons
  const highRiskMonths = seasonalTrends
    .filter((m) => m.riskLevel === "High")
    .map((m) => m.month);

  return {
    monthlyTrends: seasonalTrends,
    highRiskMonths,
    peakMonth: seasonalTrends.reduce((max, curr) =>
      curr.totalIncidents > max.totalIncidents ? curr : max
    ).month,
  };
}

// Calculate District Risk Ranking
function calculateDistrictRanking(disasters) {
  const districtStats = {};

  disasters.forEach((d) => {
    const district = d.district || "Unknown";

    if (!districtStats[district]) {
      districtStats[district] = {
        district,
        totalIncidents: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
        types: {},
      };
    }

    districtStats[district].totalIncidents++;

    // Count by severity
    if (d.severity === "high") districtStats[district].highSeverity++;
    else if (d.severity === "medium") districtStats[district].mediumSeverity++;
    else districtStats[district].lowSeverity++;

    // Count by type
    districtStats[district].types[d.type] =
      (districtStats[district].types[d.type] || 0) + 1;
  });

  // Calculate risk scores and rankings
  const rankings = Object.values(districtStats).map((stat) => {
    const riskScore =
      stat.highSeverity * 3 + stat.mediumSeverity * 2 + stat.lowSeverity * 1;

    let riskLevel = "Low";
    if (stat.totalIncidents > 50 || stat.highSeverity > 10) riskLevel = "High";
    else if (stat.totalIncidents > 20 || stat.highSeverity > 5)
      riskLevel = "Medium";

    return {
      ...stat,
      riskScore,
      riskLevel,
      dominantDisaster: Object.entries(stat.types).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0],
    };
  });

  rankings.sort((a, b) => b.riskScore - a.riskScore);

  return {
    rankings,
    highRiskDistricts: rankings.filter((r) => r.riskLevel === "High"),
    mediumRiskDistricts: rankings.filter((r) => r.riskLevel === "Medium"),
    lowRiskDistricts: rankings.filter((r) => r.riskLevel === "Low"),
  };
}

// Calculate Impact Forecast
function calculateImpactForecast(disasters) {
  const spanYears = getDataSpanYears(disasters);
  const householdIntervals = {
    "0-10": 5,
    "11-25": 18,
    "26-50": 38,
    "51-100": 75,
    "101-250": 175,
    "251-500": 375,
    "500+": 750,
  };

  let totalEstimatedHouseholds = 0;
  const impactByType = {};

  disasters.forEach((d) => {
    const householdMidpoint = householdIntervals[d.households] || 0;
    totalEstimatedHouseholds += householdMidpoint;

    if (!impactByType[d.type]) {
      impactByType[d.type] = {
        type: d.type,
        totalIncidents: 0,
        estimatedHouseholds: 0,
        highSeverity: 0,
      };
    }

    impactByType[d.type].totalIncidents++;
    impactByType[d.type].estimatedHouseholds += householdMidpoint;
    if (d.severity === "high") impactByType[d.type].highSeverity++;
  });

  // Project future impact (next 12 months)
  const annualProjection = Math.round(disasters.length / spanYears);
  const projectedHouseholds = Math.round(totalEstimatedHouseholds / spanYears);

  return {
    historical: {
      totalDisasters: disasters.length,
      estimatedHouseholdsAffected: totalEstimatedHouseholds,
      estimatedPopulation: totalEstimatedHouseholds * 5, // 5 people per household
    },
    projected12Months: {
      expectedDisasters: annualProjection,
      expectedHouseholds: projectedHouseholds,
      expectedPopulation: projectedHouseholds * 5,
    },
    byType: Object.values(impactByType).map((impact) => ({
      ...impact,
      avgHouseholdsPerIncident: Math.round(
        impact.estimatedHouseholds / impact.totalIncidents
      ),
      projectedAnnual: Math.round(impact.totalIncidents / spanYears),
    })),
  };
}

// Calculate Budget Forecast
function calculateBudgetForecast(disasters) {
  const spanYears = getDataSpanYears(disasters);
  // Average costs per disaster type (in Maloti)
  const avgCostPerType = {
    drought: 150000,
    heavy_rainfall: 200000,
    strong_winds: 180000,
  };

  const historicalByType = {};
  disasters.forEach((d) => {
    if (!historicalByType[d.type]) {
      historicalByType[d.type] = { count: 0, estimatedCost: 0 };
    }
    historicalByType[d.type].count++;
    historicalByType[d.type].estimatedCost += avgCostPerType[d.type] || 150000;
  });

  // Calculate annual budget needs
  const annualForecast = Object.entries(historicalByType).map(
    ([type, data]) => {
      const annualCount = Math.round(data.count / spanYears);
      const annualBudget = annualCount * (avgCostPerType[type] || 150000);

      return {
        type,
        historicalIncidents: data.count,
        projectedAnnualIncidents: annualCount,
        avgCostPerIncident: avgCostPerType[type] || 150000,
        projectedAnnualBudget: annualBudget,
        quarterlyBudget: Math.round(annualBudget / 4),
      };
    }
  );

  const totalAnnualBudget = annualForecast.reduce(
    (sum, f) => sum + f.projectedAnnualBudget,
    0
  );

  return {
    annualForecast,
    totalAnnualBudget,
    quarterlyBudget: Math.round(totalAnnualBudget / 4),
    monthlyReserve: Math.round(totalAnnualBudget / 12),
    emergencyReserve: Math.round(totalAnnualBudget * 0.2), // 20% buffer
  };
}

export default router;
