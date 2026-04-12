"""
predict.py
----------
This script is called by Node.js to make a funding prediction.
It reads input from command line arguments, loads the trained model,
and prints the predicted funding amount as a number.

Node.js calls it like this:
  python predict.py "Heavy Rainfall" "Maseru" "Critical" "Winter" 150
"""

import sys
import pickle
import numpy as np

def predict(disaster_type, district, severity, season, num_households):
    # Load the trained model
    with open("disaster_model.pkl", "rb") as f:
        model = pickle.load(f)

    # Load the encoders
    with open("disaster_encoders.pkl", "rb") as f:
        encoders = pickle.load(f)

    le_type     = encoders["le_type"]
    le_district = encoders["le_district"]
    le_severity = encoders["le_severity"]
    le_season   = encoders["le_season"]

    # Enforce minimum households based on severity
    # This keeps inputs within the range the model was trained on
    num_households = int(num_households)
    severity_minimums = {
        "Low":      10,
        "Moderate": 51,
        "Critical": 201,
    }
    minimum = severity_minimums.get(severity, 10)
    if num_households < minimum:
        num_households = minimum

    # Encode the inputs into numbers
    X = np.array([[
        le_type.transform([disaster_type])[0],
        le_district.transform([district])[0],
        le_severity.transform([severity])[0],
        le_season.transform([season])[0],
        num_households,
    ]])

    # Make the prediction
    prediction = model.predict(X)[0]

    # Floor at zero — funding cannot be negative
    prediction = max(0, prediction)

    # Print just the number so Node.js can read it
    print(round(prediction))


if __name__ == "__main__":
    # Read arguments passed by Node.js
    # sys.argv[0] is the script name, so inputs start at index 1
    disaster_type  = sys.argv[1]
    district       = sys.argv[2]
    severity       = sys.argv[3]
    season         = sys.argv[4]
    num_households = sys.argv[5]

    predict(disaster_type, district, severity, season, num_households)
