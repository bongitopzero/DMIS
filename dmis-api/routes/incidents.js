// routes/incidents.js
import express from 'express';
import Incident from '../models/Incident.js';
import { protect } from '../middleware/auth.js';
import { verifyIncident } from '../controllers/incidentController.js';

const router = express.Router();

// Create an incident (report)
router.post('/', protect, async (req, res) => {
  try {
    const payload = {
      disasterType: req.body.disasterType,
      district: req.body.district,
      householdsAffected: req.body.householdsAffected || 0,
      severityIndex: req.body.severityIndex || 5,
      verifiedStatus: 'pending'
    };

    const created = await Incident.create({ ...payload, reportedBy: req.user?._id || null });
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating incident:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all incidents (mapped to frontend shape)
router.get('/', protect, async (req, res) => {
  try {
    const incidents = await Incident.find().sort({ createdAt: -1 });

    const mapped = incidents.map((inc) => {
      let severity = 'medium';
      if (typeof inc.severityIndex === 'number') {
        if (inc.severityIndex <= 3) severity = 'low';
        else if (inc.severityIndex >= 8) severity = 'high';
        else severity = 'medium';
      }

      const households = inc.householdsAffected || 0;
      const estimatedPopulation = households * 5; // heuristic

      return {
        _id: inc._id,
        disasterType: inc.disasterType,
        type: inc.disasterType,
        district: inc.district,
        households: typeof inc.householdsAffected === 'number' ? `${inc.householdsAffected}` : undefined,
        totalAffectedHouseholds: inc.householdsAffected || 0,
        totalAffectedPopulation: estimatedPopulation,
        severity: severity,
        status: inc.verifiedStatus === 'verified' ? 'verified' : (inc.verifiedStatus === 'rejected' ? 'rejected' : 'reported'),
        createdAt: inc.createdAt,
        updatedAt: inc.updatedAt,
        source: 'incident'
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error('Error listing incidents:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update incident (generic)
router.put('/:id', protect, async (req, res) => {
  try {
    const updated = await Incident.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Incident not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error updating incident:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify incident (promotes to Disaster via controller)
router.put('/:id/verify', protect, verifyIncident);

export default router;
