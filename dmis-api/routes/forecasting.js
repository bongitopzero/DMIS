import express from 'express';
import axios from 'axios';

const router = express.Router();

router.post('/predict', async (req, res) => {
  try {
    const {
      disaster_type,
      severity_level,
      households_affected,
      household_size,
      income_level,
      damage_level
    } = req.body;

    const response = await axios.post('http://127.0.0.1:5001/predict', {
      disaster_type,
      severity_level,
      households_affected,
      household_size,
      income_level,
      damage_level
    });

    res.json({
      success: true,
      predicted_cost: response.data.predicted_cost,
      currency: response.data.currency
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Forecasting service unavailable. Make sure the Python server is running.'
    });
  }
});

export default router;
