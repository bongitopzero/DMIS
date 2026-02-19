import dotenv from "dotenv";
import { MongoClient } from "mongodb";

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
        status: pick(["reported", "verified", "responding", "closed"]),
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
      expenditures.push({
        incidentId: incident._id,
        amountSpent: amount,
        description: pick([
          "Emergency supplies",
          "Shelter materials",
          "Food & water distribution",
          "Medical response",
          "Logistics support",
        ]),
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
    const budgetsCollection = db.collection("budgets");
    const fundsCollection = db.collection("funds");
    const fundRequestsCollection = db.collection("fundRequests");
    const expendituresCollection = db.collection("expenditures");

    await fundsCollection.deleteMany({});
    await fundRequestsCollection.deleteMany({});
    await expendituresCollection.deleteMany({});

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
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
};

run();
