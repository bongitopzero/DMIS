import express from 'express';
import { getOverview } from '../controllers/coordinatorController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// GET /api/coordinator/overview
router.get('/overview', protect, getOverview);

export default router;
