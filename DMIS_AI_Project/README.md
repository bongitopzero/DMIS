# Disaster Cost Forecasting System - Documentation

## 🎯 Overview

The **DMIS Disaster Cost Forecasting System** is a comprehensive Python-based solution for predicting disaster recovery costs in Lesotho. It combines:

1. **Disaster Cost Modeling** - Realistic cost calculations for different disaster types
2. **Machine Learning Predictions** - Train models on synthetic data and make cost predictions
3. **Data Analysis & Visualization** - Comprehensive insights into disaster patterns
4. **REST API** - Deploy predictions as a service for your DMIS application

---

## 📁 Project Structure

```
DMIS_AI_Project/
├── main.py                           # Main entry point (test environment)
├── disaster_cost_model.py            # Cost calculation models
├── train_cost_model.py               # ML model training pipeline
├── data_visualization.py             # Data analysis and visualization
├── api.py                            # Flask REST API
├── requirements.txt                  # Python dependencies
├── data/
│   └── disaster_costs_synthetic.csv   # Synthetic training dataset
├── models/
│   ├── linear_regression.pkl         # Trained Linear Regression model
│   ├── random_forest.pkl             # Trained Random Forest model (Best)
│   ├── gradient_boosting.pkl         # Trained Gradient Boosting model
│   ├── scaler.pkl                    # Feature scaler
│   └── label_encoders.pkl            # Categorical encoders
└── figures/
    ├── 01_cost_distribution.png
    ├── 02_severity_analysis.png
    ├── 03_impact_factors.png
    ├── 04_district_analysis.png
    ├── 05_disaster_type_breakdown.png
    └── 06_correlation_matrix.png
```

---

## 🚀 Quick Start

### 1. Setup Virtual Environment

```bash
python -m venv venv
venv\Scripts\activate  # On Windows
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Generate Synthetic Data

```bash
python disaster_cost_model.py
```

Output: `data/disaster_costs_synthetic.csv` (500 records)

### 4. Train ML Models

```bash
python train_cost_model.py
```

Models saved to `models/` directory

### 5. Analyze Data

```bash
python data_visualization.py
```

Visualizations saved to `figures/` directory

### 6. Start API Server

```bash
python api.py
```

API runs on `http://localhost:5000`

---

## 🏗️ Three Disaster Types & Cost Models

### 1️⃣ **Strong Winds**

**Cost Components:**
- Structural repair (houses damaged)
- Temporary shelter costs
- Relief supplies (blankets, food, kits)

**Formula:**
```
Total Cost = (Houses Damaged × Repair Cost) + (Households × Relief Cost)
```

**Repair Cost Ranges:**
- Low: M15,000 - M25,000 per house
- Moderate: M25,000 - M50,000 per house
- Severe: M50,000 - M120,000 per house

**Relief Cost:** M1,500 - M5,000 per household

---

### 2️⃣ **Heavy Rainfall**

**Cost Components:**
- House damage repair
- Infrastructure repair (roads, bridges, drainage)
- Relief distribution

**Formula:**
```
Total Cost = (Houses Damaged × Repair Cost) + Infrastructure Cost + (Population × Relief Per Person)
```

**Cost Ranges:**
- House Repair: M20,000 - M80,000 per house
- Relief: M300 - M800 per person
- Infrastructure:
  - Low: M200,000 - M500,000
  - Moderate: M500,000 - M2,000,000
  - Severe: M2,000,000 - M10,000,000

---

### 3️⃣ **Drought**

**Cost Components:**
- Food relief programs
- Water supply programs
- Agricultural recovery support

**Formula:**
```
Total Cost = (Population × Food Support) + (Households × Water Support) + Agriculture Recovery
```

**Cost Ranges:**
- Food Support: M1,000 - M2,500 per person (6 months)
- Water Support: M500 - M1,500 per household
- Agriculture Recovery:
  - Low: M500,000
  - Moderate: M2,000,000
  - Severe: M5,000,000 - M15,000,000

---

## 🤖 Machine Learning Models

### Model Performance

| Model | Test MAE | Test R² | CV R² |
|-------|----------|---------|-------|
| Linear Regression | M15.6M | 0.5850 | 0.6176 |
| **Random Forest** ⭐ | **M7.3M** | **0.9032** | **0.8061** |
| Gradient Boosting | M8.2M | 0.8815 | 0.8138 |

**Best Model: Random Forest** with 90.32% accuracy

### Features Used

1. `Affected_Population` - Total people impacted
2. `Affected_Households` - Number of households
3. `Houses_Damaged` - Number of damaged structures
4. `Duration_Days` - Event duration
5. `Disaster_Type_encoded` - Type of disaster (categorical)
6. `District_encoded` - Location in Lesotho (categorical)
7. `Severity_encoded` - Severity level (Low/Moderate/Severe)
8. `Immediate_Needs_encoded` - Type of assistance needed

---

## 📊 Dataset Statistics

**Total Records:** 500

**By Disaster Type:**
- Drought: 162 events (avg cost: M56.7M)
- Heavy Rainfall: 161 events (avg cost: M39.0M)
- Strong Winds: 177 events (avg cost: M23.9M)

**By Severity:**
- Low: 229 events (avg cost: M43.7M)
- Moderate: 181 events (avg cost: M28.8M)
- Severe: 90 events (avg cost: M49.5M)

---

## 🔌 REST API Endpoints

### 1. Health Check

```
GET /api/health
```

**Response:**
```json
{
  "status": "OK",
  "message": "Disaster Cost Forecasting API is running",
  "models_loaded": true
}
```

---

### 2. Get Available Models

```
GET /api/models
```

**Response:**
```json
{
  "available_models": ["Linear Regression", "Random Forest", "Gradient Boosting"],
  "count": 3
}
```

---

### 3. Single Prediction

```
POST /api/predict
```

**Request Body:**
```json
{
  "affected_population": 5000,
  "affected_households": 1000,
  "houses_damaged": 50,
  "duration_days": 15,
  "disaster_type": "Heavy Rainfall",
  "district": "Maseru",
  "severity": "Moderate",
  "immediate_needs": "Medical Aid",
  "model": "Random Forest"
}
```

**Response:**
```json
{
  "success": true,
  "model_used": "Random Forest",
  "input_data": {
    "affected_population": 5000,
    "affected_households": 1000,
    "houses_damaged": 50,
    "duration_days": 15,
    "disaster_type": "Heavy Rainfall",
    "district": "Maseru",
    "severity": "Moderate",
    "immediate_needs": "Medical Aid"
  },
  "prediction": {
    "estimated_cost_maloti": 47500000.00,
    "uncertainty_margin": 7125000.00,
    "confidence_range": {
      "low": 40375000.00,
      "high": 54625000.00
    }
  }
}
```

---

### 4. Batch Predictions

```
POST /api/predict-batch
```

**Request Body:**
```json
{
  "disasters": [
    {
      "affected_population": 1000,
      "affected_households": 200,
      "houses_damaged": 10,
      "duration_days": 5,
      "disaster_type": "Strong Winds",
      "district": "Maseru",
      "severity": "Low",
      "immediate_needs": "Shelter"
    },
    {
      "affected_population": 50000,
      "affected_households": 10000,
      "houses_damaged": 0,
      "duration_days": 180,
      "disaster_type": "Drought",
      "district": "Thaba-Tseka",
      "severity": "Severe",
      "immediate_needs": "Food & Water Relief"
    }
  ],
  "model": "Random Forest"
}
```

**Response:**
```json
{
  "success": true,
  "model_used": "Random Forest",
  "total_disasters": 2,
  "successful_predictions": 2,
  "predictions": [
    {
      "disaster_type": "Strong Winds",
      "estimated_cost": 18500000.00,
      "uncertainty": 2775000.00
    },
    {
      "disaster_type": "Drought",
      "estimated_cost": 95000000.00,
      "uncertainty": 14250000.00
    }
  ],
  "total_estimated_cost": 113500000.00
}
```

---

### 5. Example Scenarios

```
GET /api/scenarios
```

Returns 3 pre-configured disaster scenarios for testing.

---

### 6. Statistics

```
GET /api/statistics
```

Returns train data statistics including cost ranges, distributions by type and severity.

---

## 🔗 Integration with DMIS Backend

### Node.js Integration Example

```javascript
// In your dmis-api routes
const axios = require('axios');

const FORECAST_API = 'http://localhost:5000/api';

router.post('/disasters/forecast-cost', async (req, res) => {
  try {
    const response = await axios.post(`${FORECAST_API}/predict`, {
      affected_population: req.body.affectedPopulation,
      affected_households: req.body.affectedHouseholds,
      houses_damaged: req.body.housesDamaged,
      duration_days: req.body.durationDays,
      disaster_type: req.body.disasterType,
      district: req.body.district,
      severity: req.body.severity,
      immediate_needs: req.body.immediateNeeds,
      model: 'Random Forest'
    });
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 📈 Data Visualization Outputs

The system generates 6 visualization graphs:

1. **Cost Distribution** - Box and violin plots by disaster type
2. **Severity Analysis** - Cost patterns across severity levels
3. **Impact Factors** - Scatter plots showing correlations
4. **District Analysis** - Geographic cost distribution
5. **Disaster Type Breakdown** - Histograms for each disaster type
6. **Correlation Matrix** - Feature relationships

All saved to `figures/` directory in PNG format.

---

## ⚙️ Configuration & Customization

### Modify Cost Ranges

Edit `disaster_cost_model.py`:
```python
@dataclass
class StrongWindsCosts:
    repair_cost_per_house_severe = (50000, 120000)  # Adjust ranges
    relief_cost_per_household = (1500, 5000)
```

### Add New Districts

Update `DISTRICTS` list in `SyntheticDataGenerator`:
```python
DISTRICTS = [
    "Your District 1", "Your District 2", ...
]
```

### Retrain Models

```bash
python disaster_cost_model.py  # Generate new data
python train_cost_model.py     # Train new models
```

---

## 🛠️ Troubleshooting

### Models not found
```
Run: python train_cost_model.py
```

### API fails to start
```
Check that port 5000 is available
python api.py
```

### Low prediction accuracy
```
1. Generate more synthetic data (increase n_samples)
2. Adjust cost ranges in disaster_cost_model.py
3. Retrain models
```

---

## 📝 License

Part of the DMIS (Disaster Management Information System) for Lesotho

---

## 📞 Support

For integration help, contact the DMIS development team.
