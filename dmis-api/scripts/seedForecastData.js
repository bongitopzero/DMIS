import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config();

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGO_DB_NAME || "dmis";

const POPULATION = 2300000;

const districts = [
  "Maseru",
  "Mafeteng",
  "Mohale's Hoek",
  "Quthing",
  "Berea",
  "Leribe",
  "Butha-Buthe",
  "Mokhotlong",
  "Qacha's Nek",
  "Thaba-Tseka",
];

const disasterTypes = [
  { type: "Drought", weight: 0.6 },
  { type: "Flood", weight: 0.25 },
  { type: "Storm", weight: 0.15 },
];

const seasonalBoost = {
  Flood: { months: [11, 12, 1, 2, 3], multiplier: 1.5 },
  Storm: { months: [10, 11, 12, 1, 2], multiplier: 1.3 },
  Drought: { months: [5, 6, 7, 8, 9], multiplier: 1.4 },
};

const randomBetween = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const pickWeighted = (items) => {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  const target = Math.random() * total;
  let running = 0;
  for (const item of items) {
    running += item.weight;
    if (target <= running) return item;
  }
  return items[items.length - 1];
};

const pickMonthForType = (type) => {
  const months = Array.from({ length: 12 }, (_, idx) => idx + 1);
  const seasonal = seasonalBoost[type]?.months || [];
  if (!seasonal.length) return pick(months);
  return Math.random() < 0.65 ? pick(seasonal) : pick(months);
};

const systemTypeMap = {
  Flood: "heavy_rainfall",
  Storm: "strong_winds",
  Drought: "drought",
};

const districtRegions = {
  Maseru: "Lowlands",
  Mafeteng: "Lowlands",
  "Mohale's Hoek": "Lowlands",
  Quthing: "Lowlands",
  Berea: "Foothills",
  Leribe: "Foothills",
  "Butha-Buthe": "Foothills",
  Mokhotlong: "Highlands",
  "Qacha's Nek": "Highlands",
  "Thaba-Tseka": "Highlands",
};

const severityLabel = (score) => {
  if (score >= 4) return "high";
  if (score === 3) return "medium";
  return "low";
};

const toRange = (value, ranges) => {
  for (const range of ranges) {
    if (value >= range.min && value <= range.max) return range.label;
  }
  return ranges[ranges.length - 1].label;
};

const parseRangeValue = (value) => {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const str = String(value);
  if (str.includes("+")) {
    return Number.parseInt(str.replace("+", ""), 10);
  }
  const parts = str.split("-").map((part) => Number.parseInt(part, 10));
  if (parts.length === 2 && parts.every((num) => Number.isFinite(num))) {
    return Math.round((parts[0] + parts[1]) / 2);
  }
  const numeric = Number.parseInt(str, 10);
  return Number.isFinite(numeric) ? numeric : 0;
};

const severityMultipliers = {
  low: 1.0,
  medium: 1.3,
  high: 1.6,
};

const populationRanges = [
  { min: 0, max: 50, label: "0-50" },
  { min: 51, max: 100, label: "51-100" },
  { min: 101, max: 250, label: "101-250" },
  { min: 251, max: 500, label: "251-500" },
  { min: 501, max: 1000, label: "501-1000" },
  { min: 1001, max: 2500, label: "1001-2500" },
  { min: 2501, max: 5000, label: "2501-5000" },
  { min: 5001, max: Number.MAX_SAFE_INTEGER, label: "5000+" },
];

const householdRanges = [
  { min: 0, max: 10, label: "0-10" },
  { min: 11, max: 25, label: "11-25" },
  { min: 26, max: 50, label: "26-50" },
  { min: 51, max: 100, label: "51-100" },
  { min: 101, max: 250, label: "101-250" },
  { min: 251, max: 500, label: "251-500" },
  { min: 501, max: Number.MAX_SAFE_INTEGER, label: "500+" },
];

const needsByType = {
  drought: "Water, Food, Livestock Feed",
  heavy_rainfall: "Shelter, Food, Medical Supplies",
  strong_winds: "Shelter, Emergency Repairs, Medical Supplies",
};

const estimateIncidentCost = (incident) => {
  const infra = incident.infrastructureDamageCost || 0;
  const response = incident.responseCost || 0;
  const cropLoss = incident.cropLossTonnes || 0;
  const cropImpact = cropLoss * 150;
  return infra * 0.25 + response + cropImpact;
};

const generateIncidents = () => {
  const incidents = [];
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setMonth(start.getMonth() - 120);

  let populationImpact = 0;

  for (let yearOffset = 0; yearOffset < 10; yearOffset += 1) {
    const yearDate = new Date(start.getFullYear() + yearOffset, 0, 1);
    const incidentsPerYear = yearOffset === 9 ? 3 : 2;

    for (let i = 0; i < incidentsPerYear; i += 1) {
      const { type } = pickWeighted(disasterTypes);
      const month = pickMonthForType(type);
      const district = pick(districts);
      const severity = randomBetween(1, 5);
      const householdsAffected = randomBetween(20, 800);
      const affectedPopulation = householdsAffected * 5;
      populationImpact += affectedPopulation;
      if (populationImpact > POPULATION * 0.6) {
        continue;
      }
      const infrastructureDamageCost = randomBetween(20000, 450000);
      const responseCost = randomBetween(15000, 180000);
      const cropLossTonnes = type === "Drought" ? randomBetween(50, 900) : randomBetween(10, 200);

      incidents.push({
        disasterType: type,
        district,
        date: new Date(
          yearDate.getFullYear(),
          month - 1,
          randomBetween(1, 27)
        ),
        severity,
        householdsAffected,
        affectedPopulation,
        infrastructureDamageCost,
        cropLossTonnes,
        responseCost,
        status: pick(["reported", "verified", "closed"]),
      });
    }
  }

  return incidents;
};

const generateDisasters = (incidents) =>
  incidents.map((incident) => {
    const type = systemTypeMap[incident.disasterType] || "drought";
    const affectedPopulation = toRange(
      incident.affectedPopulation || incident.householdsAffected * 5 || 0,
      populationRanges
    );
    const households = toRange(
      incident.householdsAffected || 0,
      householdRanges
    );
    const severity = severityLabel(incident.severity || 1);
    const region = districtRegions[incident.district] || "North Area";

    return {
      type,
      district: incident.district,
      region,
      location: `${incident.district} Central` ,
      affectedPopulation,
      households,
      damages: "Auto-generated incident record",
      needs: needsByType[type] || "Food, Water",
      severity,
      status: incident.status || "reported",
      damageCost: incident.infrastructureDamageCost || 0,
      affectedHouses: Math.max(0, Math.round((incident.householdsAffected || 0) * 0.1)),
      createdAt: incident.date,
      updatedAt: incident.date,
    };
  });

const generateFundRequests = (incidents, users) => {
  if (!incidents.length) return [];
  const requests = [];
  incidents.slice(0, Math.min(incidents.length, 12)).forEach((incident) => {
    const baseCost = estimateIncidentCost(incident);
    const requestedAmount = Math.max(20000, Math.round(baseCost * randomBetween(70, 120) / 100));
    const priority = (incident.severity || 1) >= 4 || ["responding", "verified"].includes(incident.status);
    const status = priority ? "Approved" : pick(["Pending", "Approved", "Rejected"]);
    const approvedAmount = status === "Approved"
      ? Math.round(requestedAmount * randomBetween(75, 95) / 100)
      : 0;
    requests.push({
      incidentId: incident._id,
      requestedAmount,
      approvedAmount,
      status,
      requestedBy: users.coordinator,
      approvedBy: status === "Pending" ? "" : users.financeOfficer,
      createdAt: incident.date,
      updatedAt: incident.date,
    });
  });
  return requests;
};

const generateExpenditures = (incidents, users, requests) => {
  if (!incidents.length) return [];
  const requestMap = new Map(
    (requests || []).map((request) => [String(request.incidentId), request])
  );
  const expenditures = [];
  incidents.slice(0, Math.min(incidents.length, 10)).forEach((incident) => {
    const systemType = systemTypeMap[incident.disasterType] || "drought";
    const rawNeeds = incident.needs || needsByType[systemType] || "Relief Support";
    const needsList = Array.isArray(rawNeeds)
      ? rawNeeds
      : String(rawNeeds)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
    const request = requestMap.get(String(incident._id));
    const approvedAmount = request?.approvedAmount || 0;
    const cap = approvedAmount > 0
      ? approvedAmount
      : Math.max(12000, Math.round(estimateIncidentCost(incident) * 0.35));
    const transactions = randomBetween(1, 2);
    let remaining = cap;
    for (let i = 0; i < transactions; i += 1) {
      const maxSpend = Math.max(3000, Math.round(remaining / (transactions - i)));
      const amount = Math.min(remaining, randomBetween(3000, maxSpend));
      remaining -= amount;
      const need = needsList.length ? pick(needsList) : "Relief Support";
      const description = `${need} procurement`;
      expenditures.push({
        incidentId: incident._id,
        amountSpent: amount,
        description,
        recordedBy: users.financeOfficer,
        date: incident.date,
        createdAt: incident.date,
        updatedAt: incident.date,
      });
    }
  });
  return expenditures;
};

const generateFunds = (incidents, expenditures = []) => {
  const districtTotals = incidents.reduce((acc, incident) => {
    const district = incident.district || "Unknown";
    acc[district] = (acc[district] || 0) + estimateIncidentCost(incident);
    return acc;
  }, {});

  const spendTotals = expenditures.reduce((acc, item) => {
    const district = incidents.find((incident) => String(incident._id) === String(item.incidentId))?.district || "Unknown";
    acc[district] = (acc[district] || 0) + item.amountSpent;
    return acc;
  }, {});

  return districts.map((district, idx) => {
    const need = districtTotals[district] || randomBetween(90000, 240000);
    const allocatedAmount = Math.max(120000, Math.round(need * 1.35));
    const expenses = Math.min(allocatedAmount * 0.85, spendTotals[district] || randomBetween(20000, 90000));
    const status = expenses / allocatedAmount > 0.8 ? "Pending" : "Active";
    return {
      name: `Relief Fund ${idx + 1}`,
      location: district,
      allocatedAmount,
      expenses: Math.round(expenses),
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
};

const upsertBudget = async (collection, totals) => {
  const fiscalYear = new Date().getFullYear();
  const allocatedBudget = Math.max(
    4200000,
    Math.round((totals?.fundAllocated || 0) * 1.15)
  );
  const committedFunds = Math.round(totals?.approvedTotal || 0);
  const spentFunds = Math.round(totals?.spentTotal || 0);

  await collection.updateOne(
    { fiscalYear },
    {
      $set: {
        fiscalYear,
        allocatedBudget,
        committedFunds,
        spentFunds,
        lastUpdated: new Date(),
      },
    },
    { upsert: true }
  );
};

const run = async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    const incidentsCollection = db.collection("incidents");
    const disastersCollection = db.collection("disasters");
    const costProfilesCollection = db.collection("disastercostprofiles");
    const housingProfilesCollection = db.collection("housingcostprofiles");
    const needProfilesCollection = db.collection("needcostprofiles");
    const annualBudgetsCollection = db.collection("annualbudgets");
    const incidentImpactsCollection = db.collection("incidentimpacts");
    const incidentSnapshotsCollection = db.collection("incidentfinancialsnapshots");
    const incidentFundsCollection = db.collection("incidentfunds");
    const incidentExpendituresCollection = db.collection("incidentexpenditures");
    const baselineBudgetsCollection = db.collection("baselinebudgets");
    const adjustmentRequestsCollection = db.collection("budgetadjustmentrequests");
    const closureReportsCollection = db.collection("incidentclosurereports");
    const standardCostsCollection = db.collection("standardcostconfigs");
    const budgetsCollection = db.collection("budgets");
    const fundsCollection = db.collection("funds");
    const fundRequestsCollection = db.collection("fundRequests");
    const expendituresCollection = db.collection("expenditures");

    await fundsCollection.deleteMany({});
    await fundRequestsCollection.deleteMany({});
    await expendituresCollection.deleteMany({});
    await needProfilesCollection.deleteMany({});
    await incidentImpactsCollection.deleteMany({});
    await incidentSnapshotsCollection.deleteMany({});
    await incidentFundsCollection.deleteMany({});
    await incidentExpendituresCollection.deleteMany({});
    await baselineBudgetsCollection.deleteMany({});
    await adjustmentRequestsCollection.deleteMany({});
    await closureReportsCollection.deleteMany({});
    await standardCostsCollection.deleteMany({});

    const costProfiles = [
      {
        disasterType: "drought",
        costPerHousehold: 450,
        costPerPerson: 120,
        costPerLivestockUnit: 30,
        costPerFarmingHousehold: 120,
        operationalRate: 0.12,
        contingencyRate: 0.08,
      },
      {
        disasterType: "heavy_rainfall",
        costPerHousehold: 520,
        costPerPerson: 140,
        costPerLivestockUnit: 40,
        costPerFarmingHousehold: 130,
        operationalRate: 0.1,
        contingencyRate: 0.07,
      },
      {
        disasterType: "strong_winds",
        costPerHousehold: 480,
        costPerPerson: 130,
        costPerLivestockUnit: 35,
        costPerFarmingHousehold: 125,
        operationalRate: 0.11,
        contingencyRate: 0.08,
      },
    ];
    await costProfilesCollection.deleteMany({});
    await costProfilesCollection.insertMany(costProfiles);

    await housingProfilesCollection.deleteMany({});
    await housingProfilesCollection.insertOne({
      tierA: 3000,
      tierB: 6000,
      tierC: 10000,
      damageMultipliers: {
        partial: 0.5,
        severe: 0.8,
        destroyed: 1.0,
      },
    });

    await standardCostsCollection.insertOne({
      financialYear: "2025/2026",
      costPerPartialHouse: 3000,
      costPerSevereHouse: 6000,
      costPerDestroyedHouse: 15000,
      costPerSchool: 150000,
      costPerClinic: 200000,
      costPerKmRoad: 80000,
      costPerLivestockUnit: 250,
      logisticsRate: 0.05,
      contingencyPercentage: 0.07,
      severityMultipliers: {
        low: 0.9,
        medium: 1.0,
        high: 1.2,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const needProfiles = [
      {
        disasterType: "drought",
        costPerHectare: 220,
        needs: [
          { name: "Water", costPerHousehold: 120, costPerPerson: 30 },
          { name: "Food", costPerHousehold: 150, costPerPerson: 40 },
          { name: "Livestock Feed", costPerHousehold: 80, costPerPerson: 0 },
        ],
      },
      {
        disasterType: "heavy_rainfall",
        costPerHectare: 260,
        needs: [
          { name: "Shelter", costPerHousehold: 200, costPerPerson: 50 },
          { name: "Food", costPerHousehold: 140, costPerPerson: 35 },
          { name: "Medical Supplies", costPerHousehold: 90, costPerPerson: 25 },
        ],
      },
      {
        disasterType: "strong_winds",
        costPerHectare: 240,
        needs: [
          { name: "Shelter", costPerHousehold: 180, costPerPerson: 45 },
          { name: "Emergency Repairs", costPerHousehold: 160, costPerPerson: 0 },
          { name: "Medical Supplies", costPerHousehold: 80, costPerPerson: 20 },
        ],
      },
    ];
    await needProfilesCollection.insertMany(needProfiles);

    const annualBudgets = [
      { fiscalYear: "2025/2026", totalAllocated: 75606994 },
      { fiscalYear: "2026/2027", totalAllocated: 82648374 },
      { fiscalYear: "2027/2028", totalAllocated: 84532677 },
      { fiscalYear: "2028/2029", totalAllocated: 84677078 },
    ].map((item) => ({
      ...item,
      reservedForForecast: Math.round(item.totalAllocated * 0.1),
      committed: Math.round(item.totalAllocated * 0.35),
      spent: Math.round(item.totalAllocated * 0.28),
      remaining: Math.round(item.totalAllocated * 0.37),
    }));
    await annualBudgetsCollection.deleteMany({});
    await annualBudgetsCollection.insertMany(annualBudgets);

    const baselineBudget = {
      fiscalYear: annualBudgets[0]?.fiscalYear || "2025/2026",
      version: 1,
      status: "approved",
      allocations: [
        { disasterType: "drought", allocationPercent: 40, baselineAmount: 30242798 },
        { disasterType: "heavy_rainfall", allocationPercent: 30, baselineAmount: 22682098 },
        { disasterType: "strong_winds", allocationPercent: 20, baselineAmount: 15121399 },
        { disasterType: "emergency_reserve", allocationPercent: 10, baselineAmount: 7560699 },
      ],
      createdBy: "System",
      approvedBy: "Finance Officer",
      approvals: [
        { role: "Finance Officer", name: "Finance Officer", decision: "approved", date: new Date() },
        { role: "Coordinator", name: "Coordinator", decision: "approved", date: new Date() },
      ],
      lockedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await baselineBudgetsCollection.insertOne(baselineBudget);

    const adjustmentRequests = [
      {
        fromType: "drought",
        toType: "heavy_rainfall",
        amount: 1200000,
        reason: "Flood response surge",
        status: "approved",
        requestedBy: "Coordinator",
        approvals: [
          { role: "Finance Officer", name: "Finance Officer", decision: "approved", date: new Date() },
          { role: "Coordinator", name: "Coordinator", decision: "approved", date: new Date() },
        ],
        logs: [
          { action: "created", actor: "Coordinator", notes: "Flood response surge", date: new Date() },
          { action: "approved", actor: "Finance Officer", notes: "Approved", date: new Date() },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        fromType: "heavy_rainfall",
        toType: "strong_winds",
        amount: 650000,
        reason: "Wind damage escalation",
        status: "pending",
        requestedBy: "Coordinator",
        approvals: [],
        logs: [{ action: "created", actor: "Coordinator", notes: "Wind damage escalation", date: new Date() }],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await adjustmentRequestsCollection.insertMany(adjustmentRequests);

    let insertedIncidents = await incidentsCollection.find({}).toArray();
    if (!insertedIncidents.length) {
      const incidents = generateIncidents();
      if (incidents.length > 0) {
        const insertResult = await incidentsCollection.insertMany(incidents);
        insertedIncidents = incidents.map((incident, idx) => ({
          ...incident,
          _id: insertResult.insertedIds[idx],
        }));
      }
    }

    const existingDisasterCount = await disastersCollection.countDocuments();
    if (!existingDisasterCount && insertedIncidents.length > 0) {
      const disasters = generateDisasters(insertedIncidents);
      if (disasters.length > 0) {
        await disastersCollection.insertMany(disasters);
      }
    }

    const users = {
      coordinator: "Coordinator",
      financeOfficer: "Finance Officer",
    };

    const disasters = await disastersCollection.find({}).toArray();
    const costProfileMap = costProfiles.reduce((acc, profile) => {
      acc[profile.disasterType] = profile;
      return acc;
    }, {});
    const housingProfile = await housingProfilesCollection.findOne({});
    const needProfileMap = needProfiles.reduce((acc, profile) => {
      acc[profile.disasterType] = profile;
      return acc;
    }, {});

    const incidentImpacts = [];
    const incidentSnapshots = [];
    const incidentFunds = [];
    const incidentExpenditures = [];
    const closureReports = [];

    for (const disaster of disasters) {
      const householdsAffected = parseRangeValue(disaster.households) || 0;
      const individualsAffected = parseRangeValue(disaster.affectedPopulation) || householdsAffected * 5;
      const severityMultiplier = severityMultipliers[disaster.severity] || 1.0;
      const tierA = Math.max(1, Math.round((disaster.affectedHouses || 0) * 0.6));
      const tierB = Math.max(0, Math.round((disaster.affectedHouses || 0) * 0.3));
      const tierC = Math.max(0, (disaster.affectedHouses || 0) - tierA - tierB);
      const impactId = new ObjectId();
      incidentImpacts.push({
        _id: impactId,
        disasterId: disaster._id,
        disasterType: disaster.type,
        householdsAffected,
        individualsAffected,
        livestockAffected: Math.round(householdsAffected * 0.2),
        farmingHouseholds: Math.round(householdsAffected * 0.4),
        tierBreakdown: { tierA, tierB, tierC },
        severityLevel: disaster.severity || "medium",
        createdAt: disaster.createdAt || new Date(),
        updatedAt: disaster.updatedAt || new Date(),
      });

      const profile = costProfileMap[disaster.type];
      const baseCost = profile
        ? householdsAffected * profile.costPerHousehold +
          individualsAffected * profile.costPerPerson +
          (Math.round(householdsAffected * 0.2) * profile.costPerLivestockUnit) +
          (Math.round(householdsAffected * 0.4) * profile.costPerFarmingHousehold)
        : householdsAffected * 400 + individualsAffected * 120;

      const housingCost = housingProfile
        ? (tierA * housingProfile.tierA + tierB * housingProfile.tierB + tierC * housingProfile.tierC) *
          (housingProfile.damageMultipliers?.partial || 0.5)
        : 0;

      const operationalCost = profile ? (baseCost + housingCost) * profile.operationalRate : baseCost * 0.1;
      const contingencyCost = profile ? (baseCost + housingCost) * profile.contingencyRate : baseCost * 0.08;
      const totalBudget = (baseCost + housingCost + operationalCost + contingencyCost) * severityMultiplier;

      const snapshotId = new ObjectId();
      incidentSnapshots.push({
        _id: snapshotId,
        disasterId: disaster._id,
        impactId,
        baseCost,
        housingCost,
        operationalCost,
        contingencyCost,
        totalBudget,
        forecastRiskLevel: "Low",
        generatedAt: disaster.createdAt || new Date(),
        createdAt: disaster.createdAt || new Date(),
        updatedAt: disaster.updatedAt || new Date(),
      });

      const needProfile = needProfileMap[disaster.type];
      const needsCost = needProfile
        ? needProfile.needs.reduce((sum, need) => {
            const householdCost = householdsAffected * (need.costPerHousehold || 0);
            const personCost = individualsAffected * (need.costPerPerson || 0);
            return sum + householdCost + personCost;
          }, 0)
        : 0;

      const adjustedBudget = totalBudget + needsCost;
      const fundId = new ObjectId();
      incidentFunds.push({
        _id: fundId,
        disasterId: disaster._id,
        snapshotId,
        disasterType: disaster.type,
        baseBudget: totalBudget,
        needsCost,
        adjustmentCost: 0,
        adjustedBudget,
        committed: adjustedBudget,
        spent: Math.round(adjustedBudget * 0.35),
        remaining: Math.max(0, Math.round(adjustedBudget * 0.65)),
        adjustments: { houseTier: "TierA", damagedLandHectares: 0 },
        status: "open",
        createdAt: disaster.createdAt || new Date(),
        updatedAt: disaster.updatedAt || new Date(),
      });

      const categories = ["Direct Relief", "Infrastructure", "Operations"];
      categories.forEach((category, idx) => {
        const amount = Math.round(adjustedBudget * (idx === 0 ? 0.15 : idx === 1 ? 0.12 : 0.08));
        incidentExpenditures.push({
          incidentFundId: fundId,
          category,
          amount,
          description: `${category} procurement`,
          recordedBy: users.financeOfficer,
          date: disaster.createdAt || new Date(),
          overrideApproved: false,
          receiptUrl: "https://example.org/receipt.pdf",
          approvalStatus: "Approved",
          approvedBy: users.financeOfficer,
          approvedAt: disaster.createdAt || new Date(),
          createdAt: disaster.createdAt || new Date(),
          updatedAt: disaster.updatedAt || new Date(),
        });
      });

      if (disaster.status === "closed") {
        const totalSpent = Math.round(adjustedBudget * 0.35);
        closureReports.push({
          incidentFundId: fundId,
          disasterId: disaster._id,
          totalAllocated: adjustedBudget,
          totalSpent,
          surplusReturned: Math.max(0, adjustedBudget - totalSpent),
          generatedBy: "System",
          createdAt: disaster.updatedAt || new Date(),
          updatedAt: disaster.updatedAt || new Date(),
        });
      }
    }

    if (incidentImpacts.length) {
      await incidentImpactsCollection.insertMany(incidentImpacts);
    }
    if (incidentSnapshots.length) {
      await incidentSnapshotsCollection.insertMany(incidentSnapshots);
    }
    if (incidentFunds.length) {
      await incidentFundsCollection.insertMany(incidentFunds);
    }
    if (incidentExpenditures.length) {
      await incidentExpendituresCollection.insertMany(incidentExpenditures);
    }
    if (closureReports.length) {
      await closureReportsCollection.insertMany(closureReports);
    }

    const fundRequests = generateFundRequests(insertedIncidents, users);
    if (fundRequests.length > 0) {
      await fundRequestsCollection.insertMany(fundRequests);
    }

    const expenditures = generateExpenditures(insertedIncidents, users, fundRequests);
    if (expenditures.length > 0) {
      await expendituresCollection.insertMany(expenditures);
    }

    const funds = generateFunds(insertedIncidents, expenditures);
    if (funds.length > 0) {
      await fundsCollection.insertMany(funds);
    }

    const totals = {
      fundAllocated: funds.reduce((sum, fund) => sum + (fund.allocatedAmount || 0), 0),
      approvedTotal: fundRequests.reduce((sum, request) => sum + (request.approvedAmount || 0), 0),
      spentTotal: expenditures.reduce((sum, item) => sum + (item.amountSpent || 0), 0),
    };
    await upsertBudget(budgetsCollection, totals);

    console.log(`Using ${insertedIncidents.length} incidents from ${dbName}.incidents`);
    if (!existingDisasterCount) {
      console.log(`Seeded disasters into ${dbName}.disasters`);
    }
    console.log(`Seeded ${funds.length} funds into ${dbName}.funds`);
    console.log(`Seeded ${fundRequests.length} fund requests into ${dbName}.fundRequests`);
    console.log(`Seeded ${expenditures.length} expenditures into ${dbName}.expenditures`);
    console.log(`Seeded ${costProfiles.length} disaster cost profiles into ${dbName}.disastercostprofiles`);
    console.log(`Seeded housing cost profile into ${dbName}.housingcostprofiles`);
    console.log(`Seeded ${needProfiles.length} need cost profiles into ${dbName}.needcostprofiles`);
    console.log(`Seeded ${annualBudgets.length} annual budgets into ${dbName}.annualbudgets`);
    console.log(`Seeded baseline budget into ${dbName}.baselinebudgets`);
    console.log(`Seeded ${adjustmentRequests.length} adjustment requests into ${dbName}.budgetadjustmentrequests`);
    console.log(`Seeded ${incidentImpacts.length} incident impacts into ${dbName}.incidentimpacts`);
    console.log(`Seeded ${incidentSnapshots.length} incident snapshots into ${dbName}.incidentfinancialsnapshots`);
    console.log(`Seeded ${incidentFunds.length} incident funds into ${dbName}.incidentfunds`);
    console.log(`Seeded ${incidentExpenditures.length} incident expenditures into ${dbName}.incidentexpenditures`);
    console.log(`Seeded ${closureReports.length} incident closure reports into ${dbName}.incidentclosurereports`);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
};

run();
