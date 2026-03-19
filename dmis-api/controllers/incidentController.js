// Incident verification controller
import Incident from '../models/Incident.js';
import Disaster from '../models/Disaster.js';

export async function verifyIncident(req, res) {
  try {
    const { id } = req.params;
    const { verifiedStatus } = req.body;
    const incident = await Incident.findByIdAndUpdate(id, { verifiedStatus }, { new: true });

    // If incident was verified, promote it to the canonical Disaster collection
    if (incident && verifiedStatus === 'verified') {
      // Avoid creating duplicate Disaster entries for the same incident
      // We try to find an existing Disaster with same type/district and recent creation
        // Ensure we map the incident type into the Disaster enum before searching for duplicates
        const allowedTypes = ['drought', 'heavy_rainfall', 'strong_winds'];
        const mappedType = allowedTypes.includes(incident.disasterType) ? incident.disasterType : 'drought';

        // Avoid creating duplicate Disaster entries for the same incident
        // We try to find an existing Disaster with same mapped type and district
        const existing = await Disaster.findOne({ type: mappedType, district: incident.district });

        if (!existing) {
          // Map severityIndex to severity label (simple heuristic)
        let severity = 'medium';
        if (typeof incident.severityIndex === 'number') {
          if (incident.severityIndex <= 3) severity = 'low';
          else if (incident.severityIndex >= 8) severity = 'high';
          else severity = 'medium';
        }

          const disasterPayload = {
            type: mappedType,
            district: incident.district || 'unknown',
            affectedPopulation: `${incident.householdsAffected || 0} households`,
            totalAffectedHouseholds: incident.householdsAffected || 0,
            damages: 'From verified incident',
            needs: 'Assistance required (auto-created from incident)',
            severity,
            status: 'verified',
            reportedBy: req.user?._id || null,
            verifiedBy: req.user?._id || null,
            verifiedAt: new Date()
          };

        try {
          const created = await Disaster.create(disasterPayload);
          // Return both records for clarity
          return res.json({ incident, disaster: created });
        } catch (createErr) {
          // If creating Disaster fails, still return the incident update but log the error
          console.error('Failed to create Disaster from Incident:', createErr);
          return res.status(200).json({ incident, warning: 'Disaster creation failed' });
        }
      }
    }

    res.json(incident);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}
