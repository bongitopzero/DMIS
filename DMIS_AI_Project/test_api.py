"""
API Testing Examples
Quick test script for the Disaster Cost Forecasting API
"""

import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_health():
    """Test API health check"""
    print("1. Testing API Health...")
    response = requests.get(f"{BASE_URL}/health")
    print(json.dumps(response.json(), indent=2))
    print()

def test_models():
    """Test available models"""
    print("2. Testing Available Models...")
    response = requests.get(f"{BASE_URL}/models")
    print(json.dumps(response.json(), indent=2))
    print()

def test_single_prediction():
    """Test single disaster prediction"""
    print("3. Testing Single Prediction (Heavy Rainfall)...")
    payload = {
        "affected_population": 5000,
        "affected_households": 1000,
        "houses_damaged": 50,
        "duration_days": 20,
        "disaster_type": "Heavy Rainfall",
        "district": "Leribe",
        "severity": "Moderate",
        "immediate_needs": "Infrastructure & Relief",
        "model": "Random Forest"
    }
    response = requests.post(f"{BASE_URL}/predict", json=payload)
    print(json.dumps(response.json(), indent=2))
    print()

def test_batch_predictions():
    """Test batch predictions"""
    print("4. Testing Batch Predictions...")
    payload = {
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
            },
            {
                "affected_population": 5000,
                "affected_households": 1000,
                "houses_damaged": 50,
                "duration_days": 20,
                "disaster_type": "Heavy Rainfall",
                "district": "Leribe",
                "severity": "Moderate",
                "immediate_needs": "Infrastructure & Relief"
            }
        ],
        "model": "Random Forest"
    }
    response = requests.post(f"{BASE_URL}/predict-batch", json=payload)
    print(json.dumps(response.json(), indent=2))
    print()

def test_scenarios():
    """Test example scenarios"""
    print("5. Testing Example Scenarios...")
    response = requests.get(f"{BASE_URL}/scenarios")
    print(json.dumps(response.json(), indent=2))
    print()

def test_statistics():
    """Test statistics endpoint"""
    print("6. Testing Statistics...")
    response = requests.get(f"{BASE_URL}/statistics")
    print(json.dumps(response.json(), indent=2))
    print()

if __name__ == "__main__":
    print("="*80)
    print("🚀 Disaster Cost Forecasting API - Test Suite")
    print("="*80)
    print()
    
    try:
        test_health()
        test_models()
        test_single_prediction()
        test_batch_predictions()
        test_scenarios()
        test_statistics()
        
        print("✅ All tests completed successfully!")
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to API")
        print("Make sure the API is running: python api.py")
    except Exception as e:
        print(f"❌ Error: {e}")
