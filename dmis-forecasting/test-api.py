import requests

response = requests.post(
    "http://127.0.0.1:5000/predict",
    json={
        "disaster_type": "Heavy Rainfall",
        "severity_level": 3,
        "households_affected": 45,
        "household_size": 6,
        "income_level": 3,
        "damage_level": 3
    }
)

print(response.json())