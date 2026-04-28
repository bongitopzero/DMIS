import Disaster from '../models/Disaster.js';
import Incident from '../models/Incident.js';
import Budget from '../models/Budget.js';
import BudgetAllocation from '../models/BudgetAllocation.js';

function startOfYear(year) {
  return new Date(Date.UTC(year, 0, 1));
}

function endOfYear(year) {
  return new Date(Date.UTC(year + 1, 0, 1));
}

export async function getOverview(req, res) {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();

    const start = startOfYear(currentYear);
    const end = endOfYear(currentYear);

    const incidentsCount = await Incident.countDocuments({ createdAt: { $gte: start, $lt: end } });
    const disastersCount = await Disaster.countDocuments({ date: { $gte: start, $lt: end } });
    const verifiedIncidents = await Incident.countDocuments({ verifiedStatus: 'verified', updatedAt: { $gte: start, $lt: end } });

    // Sum affected population heuristically where numeric stored in totalAffectedPopulation or parse string
    const disasters = await Disaster.find({ date: { $gte: start, $lt: end } }).select('totalAffectedPopulation totalEstimatedRequirement numberOfHouseholdsAffected');
    let totalAffectedPopulation = 0;
    let totalRequestedFunds = 0;
    for (const d of disasters) {
      totalAffectedPopulation += Number(d.totalAffectedPopulation || 0);
      totalRequestedFunds += Number(d.totalEstimatedRequirement || 0);
    }

    // Sum approved budget allocations for the current fiscal year
    let totalAllocatedFunds = 0;
    try {
      const allocs = await BudgetAllocation.aggregate([
        {
          $match: {
            fiscalYear: { $in: [currentYear.toString(), `${currentYear}/${currentYear + 1}`] },
            approvalStatus: 'Approved',
            isVoided: false,
          }
        },
        { $group: { _id: null, sum: { $sum: '$allocatedAmount' } } }
      ]);
      totalAllocatedFunds = allocs?.[0]?.sum || 0;
    } catch (e) {
      // collection may not exist; ignore
    }

    // Fallback to Budget envelope totals when BudgetAllocation is empty
    if (!totalAllocatedFunds) {
      try {
        const envelopeTotals = await Budget.aggregate([
          {
            $match: {
              fiscalYear: { $in: [currentYear, currentYear.toString()] },
            }
          },
          { $group: { _id: null, sum: { $sum: '$allocatedBudget' } } }
        ]);
        totalAllocatedFunds = envelopeTotals?.[0]?.sum || totalAllocatedFunds;
      } catch (e) {
        // collection may not exist; ignore
      }
    }

    // Return current year live metrics (no past year summaries since YearlySummary removed)

    const overview = {
      currentYear: {
        year: currentYear,
        incidentsCount,
        disastersCount,
        verifiedIncidents,
        totalAffectedPopulation,
        totalAllocatedFunds,
        totalRequestedFunds,
      },
      pastYears: [],
    };

    res.json(overview);
  } catch (err) {
    console.error('Overview error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

export default { getOverview };
