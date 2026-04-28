import HouseholdAssessment from '../models/HouseholdAssessment.js';
import Disaster from '../models/Disaster.js';

export const getAssessmentsByDisaster = async (req, res) => {
  try {
    const { disasterId } = req.params;
    
    const assessments = await HouseholdAssessment.find({ disasterId })
      .populate('headOfHousehold');
    
    // If no assessments, return empty array
    res.json({ assessments: assessments || [] });
  } catch (error) {
    console.error('getAssessmentsByDisaster error:', error);
    res.status(500).json({ message: 'Failed to fetch assessments' });
  }
};
