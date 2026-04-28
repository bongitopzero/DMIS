/**
 * Funds Routes
 * Handles fund management, allocation tracking, and financial analytics
 */

import express from 'express';
import BudgetAllocation from '../models/BudgetAllocation.js';
import Disaster from '../models/Disaster.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/funds
 * Get all funds with aggregated data for analysis
 * Returns consolidated fund information for dashboard and analysis pages
 */
router.get('/', protect, async (req, res) => {
  try {
    // Fetch all budget allocations (representing funds)
    const budgetAllocations = await BudgetAllocation.find({ isVoided: false })
      .sort({ createdAt: -1 });

    // Transform BudgetAllocations into funds format
    const funds = budgetAllocations.map(ba => ({
      _id: ba._id,
      id: ba._id,
      disasterId: ba.disasterId,
      amount: ba.allocatedAmount,
      allocatedAmount: ba.allocatedAmount,
      category: ba.category,
      status: ba.approvalStatus?.toLowerCase() === 'approved' 
        ? 'allocated' 
        : ba.approvalStatus?.toLowerCase() === 'pending' 
        ? 'pending' 
        : 'available',
      approvalStatus: ba.approvalStatus,
      createdAt: ba.createdAt,
      updatedAt: ba.updatedAt,
      source: ba.description || 'Budget Allocation',
      description: ba.description,
      fiscalYear: ba.fiscalYear,
    }));

    // Also include aggregated fund data by source/category
    const fundsByCategory = {};
    budgetAllocations.forEach(ba => {
      const category = ba.category || 'General Fund';
      if (!fundsByCategory[category]) {
        fundsByCategory[category] = {
          category,
          totalAllocated: 0,
          count: 0,
        };
      }
      fundsByCategory[category].totalAllocated += ba.allocatedAmount;
      fundsByCategory[category].count += 1;
    });

    res.status(200).json({
      success: true,
      data: funds,
      summary: {
        totalFunds: funds.reduce((sum, f) => sum + (f.amount || 0), 0),
        allocatedFunds: funds
          .filter(f => f.status === 'allocated')
          .reduce((sum, f) => sum + (f.amount || 0), 0),
        availableFunds: funds
          .filter(f => f.status === 'available')
          .reduce((sum, f) => sum + (f.amount || 0), 0),
        pendingFunds: funds
          .filter(f => f.status === 'pending')
          .reduce((sum, f) => sum + (f.amount || 0), 0),
        fundCount: funds.length,
        byCategory: fundsByCategory,
      },
    });
  } catch (err) {
    console.error('Error fetching funds:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching funds', 
      error: err.message 
    });
  }
});

/**
 * GET /api/funds/by-disaster/:disasterId
 * Get all funds allocated to a specific disaster
 */
router.get('/by-disaster/:disasterId', protect, async (req, res) => {
  try {
    const { disasterId } = req.params;

    const budgetAllocations = await BudgetAllocation.find({
      disasterId,
      isVoided: false,
    }).sort({ createdAt: -1 });

    const funds = budgetAllocations.map(ba => ({
      _id: ba._id,
      id: ba._id,
      disasterId: ba.disasterId,
      amount: ba.allocatedAmount,
      allocatedAmount: ba.allocatedAmount,
      category: ba.category,
      status: ba.approvalStatus?.toLowerCase() === 'approved' 
        ? 'allocated' 
        : ba.approvalStatus?.toLowerCase() === 'pending' 
        ? 'pending' 
        : 'available',
      approvalStatus: ba.approvalStatus,
      createdAt: ba.createdAt,
    }));

    const totalAmount = funds.reduce((sum, f) => sum + (f.amount || 0), 0);
    const allocatedAmount = funds
      .filter(f => f.status === 'allocated')
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    res.status(200).json({
      success: true,
      data: funds,
      summary: {
        totalAmount,
        allocatedAmount,
        availableAmount: totalAmount - allocatedAmount,
        utilisationRate: totalAmount > 0 ? ((allocatedAmount / totalAmount) * 100).toFixed(2) : 0,
      },
    });
  } catch (err) {
    console.error('Error fetching funds for disaster:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching funds', 
      error: err.message 
    });
  }
});

/**
 * GET /api/funds/summary
 * Get aggregate fund statistics for analysis and reporting
 */
router.get('/summary', protect, async (req, res) => {
  try {
    const budgetAllocations = await BudgetAllocation.find({ isVoided: false });

    const summary = {
      totalFunds: budgetAllocations.reduce((sum, ba) => sum + (ba.allocatedAmount || 0), 0),
      allocatedFunds: budgetAllocations
        .filter((ba) => (ba.approvalStatus || '').toString().toLowerCase() === 'approved')
        .reduce((sum, ba) => sum + (ba.allocatedAmount || 0), 0),
      availableFunds: budgetAllocations
        .filter((ba) => (ba.approvalStatus || '').toString().toLowerCase() !== 'approved')
        .reduce((sum, ba) => sum + (ba.allocatedAmount || 0), 0),
      pendingFunds: budgetAllocations
        .filter((ba) => (ba.approvalStatus || '').toString().toLowerCase() === 'pending')
        .reduce((sum, ba) => sum + (ba.allocatedAmount || 0), 0),
      rejectedFunds: budgetAllocations
        .filter((ba) => (ba.approvalStatus || '').toString().toLowerCase() === 'rejected')
        .reduce((sum, ba) => sum + (ba.allocatedAmount || 0), 0),
      byCategory: budgetAllocations.reduce((acc, ba) => {
        const cat = ba.category || 'Other';
        acc[cat] = (acc[cat] || 0) + (ba.allocatedAmount || 0);
        return acc;
      }, {}),
      utilizationRate: 0,
    };

    summary.utilizationRate = summary.totalFunds > 0
      ? ((summary.allocatedFunds / summary.totalFunds) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (err) {
    console.error('Error fetching fund summary:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching fund summary', 
      error: err.message 
    });
  }
});

export default router;
