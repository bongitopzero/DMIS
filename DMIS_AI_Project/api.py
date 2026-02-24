"""
Flask API for Disaster Cost Forecasting
Provides REST endpoints for disaster cost prediction and data management
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
import os

app = Flask(__name__)
CORS(app)

# Load models and scalers at startup
MODELS = {}
SCALER = None
LABEL_ENCODERS = {}

def load_models():
    """Load pre-trained models from disk"""
    global MODELS, SCALER, LABEL_ENCODERS
    
    models_dir = "models"
    
    if not Path(models_dir).exists():
        print(f"⚠️  Models directory not found. Run train_cost_model.py first.")
        return False
    
    try:
        # Load scaler
        with open(f"{models_dir}/scaler.pkl", 'rb') as f:
            SCALER = pickle.load(f)
        
        # Load label encoders
        with open(f"{models_dir}/label_encoders.pkl", 'rb') as f:
            LABEL_ENCODERS = pickle.load(f)
        
        # Load models
        model_files = ['linear_regression.pkl', 'random_forest.pkl', 'gradient_boosting.pkl']
        model_names = ['Linear Regression', 'Random Forest', 'Gradient Boosting']
        
        for model_file, model_name in zip(model_files, model_names):
            filepath = f"{models_dir}/{model_file}"
            if Path(filepath).exists():
                with open(filepath, 'rb') as f:
                    MODELS[model_name] = pickle.load(f)
                print(f"✓ Loaded {model_name}")
        
        if not MODELS:
            print("⚠️  No models found")
            return False
        
        print(f"✓ Loaded {len(MODELS)} models")
        return True
    
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        return False


def preprocess_prediction_data(data: dict) -> tuple:
    """
    Preprocess input data for prediction
    
    Returns:
        (features_array, success_flag)
    """
    try:
        # Extract features
        affected_population = int(data.get('affected_population', 0))
        affected_households = int(data.get('affected_households', 0))
        houses_damaged = int(data.get('houses_damaged', 0))
        duration_days = int(data.get('duration_days', 0))
        disaster_type = data.get('disaster_type', 'Strong Winds')
        district = data.get('district', 'Maseru')
        severity = data.get('severity', 'Moderate')
        immediate_needs = data.get('immediate_needs', 'Medical Aid')
        
        # Encode categorical variables
        disaster_type_encoded = LABEL_ENCODERS['Disaster_Type'].transform([disaster_type])[0]
        district_encoded = LABEL_ENCODERS['District'].transform([district])[0]
        severity_encoded = LABEL_ENCODERS['Severity'].transform([severity])[0]
        immediate_needs_encoded = LABEL_ENCODERS['Immediate_Needs'].transform([immediate_needs])[0]
        
        # Create feature array
        features = np.array([[
            affected_population,
            affected_households,
            houses_damaged,
            duration_days,
            disaster_type_encoded,
            district_encoded,
            severity_encoded,
            immediate_needs_encoded
        ]])
        
        # Scale features
        features_scaled = SCALER.transform(features)
        
        return features_scaled, True
    
    except Exception as e:
        print(f"❌ Preprocessing error: {e}")
        return None, False


# Routes

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'message': 'Disaster Cost Forecasting API is running',
        'models_loaded': len(MODELS) > 0
    }), 200


@app.route('/api/models', methods=['GET'])
def get_models():
    """Get list of available models"""
    return jsonify({
        'available_models': list(MODELS.keys()),
        'count': len(MODELS)
    }), 200


@app.route('/api/predict', methods=['POST'])
def predict_cost():
    """
    Predict disaster cost
    
    Request body:
    {
        "affected_population": 5000,
        "affected_households": 1000,
        "houses_damaged": 50,
        "duration_days": 15,
        "disaster_type": "Heavy Rainfall",
        "district": "Maseru",
        "severity": "Moderate",
        "immediate_needs": "Medical Aid",
        "model": "Random Forest"  (optional, defaults to Random Forest)
    }
    """
    try:
        data = request.json
        
        # Validate model selection
        model_name = data.get('model', 'Random Forest')
        if model_name not in MODELS:
            return jsonify({
                'error': f'Model {model_name} not found',
                'available_models': list(MODELS.keys())
            }), 400
        
        # Preprocess data
        features_scaled, success = preprocess_prediction_data(data)
        if not success:
            return jsonify({'error': 'Failed to preprocess input data'}), 400
        
        # Make prediction
        model = MODELS[model_name]
        predicted_cost = float(model.predict(features_scaled)[0])
        
        # Add uncertainty estimate (rough std dev)
        uncertainty = predicted_cost * 0.15  # 15% uncertainty margin
        
        return jsonify({
            'success': True,
            'model_used': model_name,
            'input_data': {
                'affected_population': data.get('affected_population'),
                'affected_households': data.get('affected_households'),
                'houses_damaged': data.get('houses_damaged'),
                'duration_days': data.get('duration_days'),
                'disaster_type': data.get('disaster_type'),
                'district': data.get('district'),
                'severity': data.get('severity'),
                'immediate_needs': data.get('immediate_needs')
            },
            'prediction': {
                'estimated_cost_maloti': round(predicted_cost, 2),
                'uncertainty_margin': round(uncertainty, 2),
                'confidence_range': {
                    'low': round(predicted_cost - uncertainty, 2),
                    'high': round(predicted_cost + uncertainty, 2)
                }
            }
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Prediction error: {str(e)}'}), 500


@app.route('/api/predict-batch', methods=['POST'])
def predict_batch():
    """
    Predict costs for multiple disasters
    
    Request body:
    {
        "disasters": [
            { /* disaster 1 data */ },
            { /* disaster 2 data */ },
            ...
        ],
        "model": "Random Forest"
    }
    """
    try:
        data = request.json
        disasters = data.get('disasters', [])
        model_name = data.get('model', 'Random Forest')
        
        if not disasters:
            return jsonify({'error': 'No disasters provided'}), 400
        
        if model_name not in MODELS:
            return jsonify({
                'error': f'Model {model_name} not found',
                'available_models': list(MODELS.keys())
            }), 400
        
        model = MODELS[model_name]
        predictions = []
        
        for disaster in disasters:
            features_scaled, success = preprocess_prediction_data(disaster)
            if success:
                cost = float(model.predict(features_scaled)[0])
                uncertainty = cost * 0.15
                predictions.append({
                    'disaster_type': disaster.get('disaster_type'),
                    'estimated_cost': round(cost, 2),
                    'uncertainty': round(uncertainty, 2)
                })
        
        return jsonify({
            'success': True,
            'model_used': model_name,
            'total_disasters': len(disasters),
            'successful_predictions': len(predictions),
            'predictions': predictions,
            'total_estimated_cost': round(sum(p['estimated_cost'] for p in predictions), 2)
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Batch prediction error: {str(e)}'}), 500


@app.route('/api/scenarios', methods=['GET'])
def get_scenarios():
    """Get example disaster scenarios"""
    scenarios = {
        'strong_winds_low': {
            'name': 'Strong Winds - Low Severity',
            'affected_population': 1000,
            'affected_households': 200,
            'houses_damaged': 10,
            'duration_days': 5,
            'disaster_type': 'Strong Winds',
            'district': 'Maseru',
            'severity': 'Low',
            'immediate_needs': 'Shelter'
        },
        'rainfall_moderate': {
            'name': 'Heavy Rainfall - Moderate Severity',
            'affected_population': 5000,
            'affected_households': 1000,
            'houses_damaged': 50,
            'duration_days': 20,
            'disaster_type': 'Heavy Rainfall',
            'district': 'Leribe',
            'severity': 'Moderate',
            'immediate_needs': 'Infrastructure & Relief'
        },
        'drought_severe': {
            'name': 'Drought - Severe',
            'affected_population': 50000,
            'affected_households': 10000,
            'houses_damaged': 0,
            'duration_days': 180,
            'disaster_type': 'Drought',
            'district': 'Thaba-Tseka',
            'severity': 'Severe',
            'immediate_needs': 'Food & Water Relief'
        }
    }
    
    return jsonify(scenarios), 200


@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    """Get statistics from training data"""
    try:
        df = pd.read_csv('data/disaster_costs_synthetic.csv')
        
        stats = {
            'total_records': len(df),
            'cost_statistics': {
                'mean': round(df['Estimated_Cost_Maloti'].mean(), 2),
                'median': round(df['Estimated_Cost_Maloti'].median(), 2),
                'min': round(df['Estimated_Cost_Maloti'].min(), 2),
                'max': round(df['Estimated_Cost_Maloti'].max(), 2),
                'std_dev': round(df['Estimated_Cost_Maloti'].std(), 2)
            },
            'by_disaster_type': df.groupby('Disaster_Type')['Estimated_Cost_Maloti'].agg([
                'count', 'mean', 'min', 'max'
            ]).round(2).to_dict(),
            'by_severity': df.groupby('Severity')['Estimated_Cost_Maloti'].agg([
                'count', 'mean', 'min', 'max'
            ]).round(2).to_dict()
        }
        
        return jsonify(stats), 200
    
    except Exception as e:
        return jsonify({'error': f'Statistics error: {str(e)}'}), 500


@app.errorhandler(404)
def not_found(error):
    """404 error handler"""
    return jsonify({
        'error': 'Endpoint not found',
        'available_endpoints': [
            'GET /api/health',
            'GET /api/models',
            'POST /api/predict',
            'POST /api/predict-batch',
            'GET /api/scenarios',
            'GET /api/statistics'
        ]
    }), 404


if __name__ == '__main__':
    print("🚀 Loading Disaster Cost Forecasting API...")
    if load_models():
        print("✅ API started successfully!")
        app.run(debug=True, host='0.0.0.0', port=5000)
    else:
        print("❌ Failed to load models. Please run train_cost_model.py first.")
