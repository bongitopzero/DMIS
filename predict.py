"""
predict.py
----------
Called by Node.js to make a disaster funding prediction.
Reads input from command line arguments, loads the trained model,
and prints the predicted funding amount as a number.

Node.js calls it like this:
  python predict.py \
    "Strong Winds" \
    "Critical" \
    "Winter" \
    300 \
    2.8 \
    0.12 \
    0.18 \
    0.07 \
    6.0

Arguments (in order):
  1. disaster_type     : "Heavy Rainfall" | "Strong Winds" | "Drought"
  2. severity          : "Low" | "Moderate" | "Critical"
  3. season            : "Summer" | "Autumn" | "Winter" | "Spring"
  4. num_households    : integer — estimated number of affected households
  5. avg_damage_level  : float 1.0–4.0 — average damage level
                         1 = minor, 2 = moderate, 3 = severe, 4 = destroyed
  6. pct_elderly       : float 0–1 — proportion of elderly households
  7. pct_children_u5   : float 0–1 — proportion of households with child under 5
  8. pct_disabled      : float 0–1 — proportion of households with disabled member
  9. avg_household_size: float — average household size in affected district

District vulnerability values (args 6–9) should come from
the district profiles stored in your backend, not entered manually
by the user. The user only enters args 1–5.
"""

import sys
import pickle
import numpy as np


# ─────────────────────────────────────────────────────────────────────────────
# SEVERITY MINIMUMS
# Enforces that num_households stays within the range
# the model was trained on for each severity level
# ─────────────────────────────────────────────────────────────────────────────

SEVERITY_MINIMUMS = {
    "Low":      10,
    "Moderate": 51,
    "Critical": 201,
}

# Default district vulnerability profiles
# Your Node.js backend should look up the selected district and pass
# these values as arguments. This is the fallback if not provided.
DISTRICT_PROFILES = {
    "Maseru":        {"pct_elderly": 0.08, "pct_children_u5": 0.12, "pct_disabled": 0.05, "avg_household_size": 4.5},
    "Berea":         {"pct_elderly": 0.10, "pct_children_u5": 0.15, "pct_disabled": 0.06, "avg_household_size": 5.5},
    "Leribe":        {"pct_elderly": 0.11, "pct_children_u5": 0.16, "pct_disabled": 0.06, "avg_household_size": 5.5},
    "Mafeteng":      {"pct_elderly": 0.12, "pct_children_u5": 0.18, "pct_disabled": 0.07, "avg_household_size": 6.0},
    "Mohale's Hoek": {"pct_elderly": 0.13, "pct_children_u5": 0.19, "pct_disabled": 0.07, "avg_household_size": 6.0},
    "Quthing":       {"pct_elderly": 0.14, "pct_children_u5": 0.20, "pct_disabled": 0.08, "avg_household_size": 7.0},
    "Qacha's Nek":   {"pct_elderly": 0.15, "pct_children_u5": 0.22, "pct_disabled": 0.09, "avg_household_size": 7.0},
    "Butha-Buthe":   {"pct_elderly": 0.14, "pct_children_u5": 0.19, "pct_disabled": 0.08, "avg_household_size": 6.5},
    "Thaba-Tseka":   {"pct_elderly": 0.16, "pct_children_u5": 0.23, "pct_disabled": 0.09, "avg_household_size": 7.5},
    "Mokhotlong":    {"pct_elderly": 0.17, "pct_children_u5": 0.24, "pct_disabled": 0.10, "avg_household_size": 8.0},
}


def predict(
    disaster_type,
    severity,
    season,
    num_households,
    avg_damage_level,
    pct_elderly,
    pct_children_u5,
    pct_disabled,
    avg_household_size,
):
    # --- Load model ---
    with open("disaster_model.pkl", "rb") as f:
        model = pickle.load(f)

    # --- Load encoders ---
    with open("disaster_encoders.pkl", "rb") as f:
        encoders = pickle.load(f)

    le_disaster_type = encoders["le_disaster_type"]
    le_severity      = encoders["le_severity"]
    le_season        = encoders["le_season"]

    # --- Enforce minimum households for severity ---
    num_households = int(num_households)
    minimum        = SEVERITY_MINIMUMS.get(severity, 10)
    if num_households < minimum:
        num_households = minimum

    # --- Clamp avg_damage_level to valid range 1.0–4.0 ---
    avg_damage_level = float(avg_damage_level)
    avg_damage_level = max(1.0, min(4.0, avg_damage_level))

    # --- Clamp percentage values to valid range 0–1 ---
    pct_elderly        = max(0.0, min(1.0, float(pct_elderly)))
    pct_children_u5    = max(0.0, min(1.0, float(pct_children_u5)))
    pct_disabled       = max(0.0, min(1.0, float(pct_disabled)))
    avg_household_size = max(1.0, float(avg_household_size))

    # --- Build feature vector ---
    # Order must exactly match feature_columns in disaster_funding_model.py
    X = np.array([[
        le_disaster_type.transform([disaster_type])[0],
        le_severity.transform([severity])[0],
        le_season.transform([season])[0],
        num_households,
        avg_damage_level,
        pct_elderly,
        pct_children_u5,
        pct_disabled,
        avg_household_size,
    ]])

    # --- Predict ---
    prediction = model.predict(X)[0]

    # --- Floor at zero — funding cannot be negative ---
    prediction = max(0, prediction)

    # --- Print result for Node.js to read ---
    print(round(prediction))


if __name__ == "__main__":
    """
    Expected call from Node.js:
      python predict.py <disaster_type> <severity> <season> <num_households>
                        <avg_damage_level> <pct_elderly> <pct_children_u5>
                        <pct_disabled> <avg_household_size>

    The district vulnerability values (pct_elderly, pct_children_u5,
    pct_disabled, avg_household_size) should be looked up from
    DISTRICT_PROFILES in your Node.js backend using the selected district,
    then passed here as arguments. The user does not enter these manually.

    Example Node.js lookup:
      const profiles = {
        "Maseru":    { pct_elderly: 0.08, pct_children_u5: 0.12, pct_disabled: 0.05, avg_household_size: 4.5 },
        "Mafeteng":  { pct_elderly: 0.12, pct_children_u5: 0.18, pct_disabled: 0.07, avg_household_size: 6.0 },
        ...
      };
      const p = profiles[selectedDistrict];
      const args = [disasterType, severity, season, numHouseholds,
                    avgDamageLevel, p.pct_elderly, p.pct_children_u5,
                    p.pct_disabled, p.avg_household_size];
    """

    if len(sys.argv) != 10:
        print("ERROR: Expected 9 arguments.", file=sys.stderr)
        print("Usage: python predict.py <disaster_type> <severity> <season>", file=sys.stderr)
        print("       <num_households> <avg_damage_level> <pct_elderly>", file=sys.stderr)
        print("       <pct_children_u5> <pct_disabled> <avg_household_size>", file=sys.stderr)
        sys.exit(1)

    predict(
        disaster_type      = sys.argv[1],
        severity           = sys.argv[2],
        season             = sys.argv[3],
        num_households     = sys.argv[4],
        avg_damage_level   = sys.argv[5],
        pct_elderly        = sys.argv[6],
        pct_children_u5    = sys.argv[7],
        pct_disabled       = sys.argv[8],
        avg_household_size = sys.argv[9],
    )
