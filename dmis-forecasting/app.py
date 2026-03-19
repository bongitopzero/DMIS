from flask import Flask, request, jsonify
import pandas as pd
import joblib

app = Flask(__name__)

model = joblib.load("disaster_cost_model.pkl")

disaster_map = {"Heavy Rainfall": 1, "Strong Winds": 2, "Drought": 3}

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()

    disaster_type = disaster_map.get(data["disaster_type"], 1)
    severity      = int(data["severity_level"])
    households    = int(data["households_affected"])
    hh_size       = int(data["household_size"])
    income        = int(data["income_level"])
    damage        = int(data["damage_level"])

    input_data = pd.DataFrame({
        "Disaster_Type":       [disaster_type],
        "Severity_Level":      [severity],
        "Households_Affected": [households],
        "Household_Size":      [hh_size],
        "Income_Level":        [income],
        "Damage_Level":        [damage]
    })

    predicted_cost = model.predict(input_data)[0]

    return jsonify({
        "predicted_cost": round(predicted_cost, 2),
        "currency": "LSL"
    })

if __name__ == "__main__":
    app.run(debug=True, port=5001)