"""
Disaster Funding Prediction Model
==================================
This script does 3 things:
  1. Simulates 800 disaster events with realistic household data
  2. Runs each household through the allocation engine to get total cost
  3. Trains a linear regression model and saves it

After running this script you will have:
  - disaster_model.pkl  (the trained model)
  - disaster_encoder.pkl (encodes text like district and disaster type into numbers)
"""

import random
import pickle
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1: DISTRICT PROFILES
# Each district has realistic ranges for age, income, and household size
# based on Lesotho's actual demographics
# ─────────────────────────────────────────────────────────────────────────────

DISTRICT_PROFILES = {
    "Maseru": {
        "age_range": (25, 65),
        "income_weights": [0.2, 0.5, 0.3],   # low, middle, high
        "household_size_range": (2, 7),
    },
    "Leribe": {
        "age_range": (28, 70),
        "income_weights": [0.4, 0.45, 0.15],
        "household_size_range": (3, 8),
    },
    "Berea": {
        "age_range": (28, 70),
        "income_weights": [0.4, 0.45, 0.15],
        "household_size_range": (3, 8),
    },
    "Mafeteng": {
        "age_range": (30, 72),
        "income_weights": [0.6, 0.35, 0.05],
        "household_size_range": (3, 9),
    },
    "Mohale's Hoek": {
        "age_range": (30, 72),
        "income_weights": [0.65, 0.30, 0.05],
        "household_size_range": (3, 9),
    },
    "Quthing": {
        "age_range": (32, 74),
        "income_weights": [0.7, 0.25, 0.05],
        "household_size_range": (4, 10),
    },
    "Qacha's Nek": {
        "age_range": (35, 75),
        "income_weights": [0.75, 0.22, 0.03],
        "household_size_range": (4, 10),
    },
    "Butha-Buthe": {
        "age_range": (32, 74),
        "income_weights": [0.70, 0.25, 0.05],
        "household_size_range": (4, 9),
    },
    "Thaba-Tseka": {
        "age_range": (35, 76),
        "income_weights": [0.78, 0.20, 0.02],
        "household_size_range": (4, 11),
    },
    "Mokhotlong": {
        "age_range": (35, 76),
        "income_weights": [0.80, 0.18, 0.02],
        "household_size_range": (5, 11),
    },
}

DISTRICTS = list(DISTRICT_PROFILES.keys())

# Income ranges in Maloti per income category
INCOME_RANGES = {
    "low":    (500,   3000),
    "middle": (3001, 10000),
    "high":  (10001, 30000),
}

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2: DISASTER RULES
# Controls how many households and what damage levels per disaster type/severity
# ─────────────────────────────────────────────────────────────────────────────

HOUSEHOLD_COUNT_RANGES = {
    "Low":      (10,  50),
    "Moderate": (51,  200),
    "Critical": (201, 500),
}

# Damage level probabilities per disaster type
# [level1, level2, level3, level4]
DAMAGE_LEVEL_WEIGHTS = {
    "Heavy Rainfall": [0.10, 0.25, 0.40, 0.25],
    "Strong Winds":   [0.15, 0.30, 0.35, 0.20],
    "Drought":        [0.50, 0.40, 0.10, 0.00],
}

DISASTER_TYPES = list(DAMAGE_LEVEL_WEIGHTS.keys())
SEVERITIES     = ["Low", "Moderate", "Critical"]
SEASONS        = ["Summer", "Autumn", "Winter", "Spring"]


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3: DAMAGE DESCRIPTION GENERATOR
# Generates realistic damage descriptions that match your keyword engine
# ─────────────────────────────────────────────────────────────────────────────

def generate_damage_description(damage_level, disaster_type):
    """
    Creates a realistic damage description string.
    The keywords in these descriptions are picked up by your allocation engine
    to assign the right packages.
    """

    descriptions = {
        "Heavy Rainfall": {
            1: [
                "Minor water seepage through the walls. House is still habitable.",
                "Small flood in the yard. House partially damaged but rooms habitable.",
                "Some dampness in walls. Rooms habitable with minor repairs needed.",
            ],
            2: [
                "Roof damaged by heavy rain. Two rooms still habitable.",
                "Flooding caused roof damage. Some rooms habitable.",
                "Water supply damaged by floods. Roof blown partially.",
            ],
            3: [
                "House severely flooded. Roof damaged and no clean water access.",
                "Severely flooded home. Injured family member needs medical attention.",
                "Roof destroyed by rainfall. Infant and toddler in household.",
            ],
            4: [
                "House completely destroyed by flooding. Family uninhabitable situation.",
                "Fully destroyed by floods. Newborn baby in household. No water access.",
                "Collapsed structure. Household members injured. Totally uninhabitable.",
            ],
        },
        "Strong Winds": {
            1: [
                "Minor roof damage. House still habitable with some rooms affected.",
                "Small section of roof blown. Rooms habitable.",
                "Light structural damage. House partially damaged but livable.",
            ],
            2: [
                "Roof blown off by strong winds. Two rooms still habitable.",
                "Roof damaged. Partially damaged structure with some rooms usable.",
                "Roof destroyed. Child under 5 in household.",
            ],
            3: [
                "Roof blown completely. No roof remaining. Several injured.",
                "Roof damaged severely. Disabled member in wheelchair needs help.",
                "Strong winds destroyed roof. Bedridden elderly member in household.",
            ],
            4: [
                "House completely destroyed by winds. Family displaced. Uninhabitable.",
                "Fully destroyed structure. Collapsed walls. Casualties reported.",
                "Total loss of property. Uninhabitable. Infant in household injured.",
            ],
        },
        "Drought": {
            1: [
                "Crops failed due to drought. No structural damage to house.",
                "Water supply damaged by drought conditions. House intact.",
                "Drought affected the area. No access to water for the household.",
            ],
            2: [
                "Severe drought. No water access. Elderly member over 70 years.",
                "Water cut off. No clean water available. Large household affected.",
                "Drought destroyed crops. No access to water. Food shortage.",
            ],
            3: [
                "Critical drought. Water supply damaged. Child under 5 in household.",
                "No water access. Disabled member. Household severely affected.",
                "Extreme drought. No clean water. Medical attention needed.",
            ],
            4: [
                "Catastrophic drought. No water. Multiple casualties in area.",
                "Total water supply damaged. Uninhabitable conditions due to drought.",
                "No water access. Infant in household. Critically affected.",
            ],
        },
    }

    options = descriptions.get(disaster_type, {}).get(damage_level, ["House affected by disaster."])
    return random.choice(options)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4: ALLOCATION ENGINE
# This mirrors your AidAllocation.jsx logic exactly
# ─────────────────────────────────────────────────────────────────────────────

def detect_keywords(description):
    desc = description.lower()
    return {
        "hasChildrenUnder5":  any(k in desc for k in ["infant", "baby", "toddler", "child under 5", "young child", "newborn"]),
        "hasDisabledMembers": any(k in desc for k in ["disabled", "wheelchair", "bedridden", "handicapped", "disability"]),
        "hasNoWaterAccess":   any(k in desc for k in ["no water", "water cut", "no access to water", "water supply damaged", "no clean water"]),
        "hasInjuries":        any(k in desc for k in ["injured", "hurt", "wound", "hospital", "medical attention", "casualty"]),
        "isUninhabitable":    any(k in desc for k in ["completely destroyed", "fully destroyed", "uninhabitable", "collapsed", "total loss"]),
        "hasRoofDamage":      any(k in desc for k in ["roof blown", "roof damaged", "roof destroyed", "roof off", "no roof", "roofless"]),
    }


def process_household(household, disaster_type):
    """
    Runs one household through the allocation engine.
    Returns total cost of packages assigned to that household.
    """
    age           = household["age"]
    size          = household["household_size"]
    income        = household["monthly_income"]
    damage_level  = household["damage_level"]
    description   = household["damage_description"]

    keywords = detect_keywords(description)
    desc     = description.lower()

    # Step 3: Override damage level if uninhabitable keywords found
    final_damage = damage_level
    if keywords["isUninhabitable"]:
        final_damage = 4

    is_uninhabitable = final_damage == 4

    # Step 4: Disqualification check
    is_habitable = (
        final_damage <= 2 or
        "still habitable" in desc or
        "partially damaged" in desc or
        "rooms habitable" in desc
    )
    is_disqualified = (age < 40 and size <= 4 and income > 10000 and is_habitable)

    if is_disqualified:
        return 0

    # Section: No aid needed check
    has_habitable_rooms = (
        "still habitable" in desc or
        "remaining rooms" in desc or
        "rooms habitable" in desc
    )
    no_aid_needed = (has_habitable_rooms and not keywords["hasInjuries"] and not keywords["hasDisabledMembers"])

    if no_aid_needed:
        return 0

    # Step 8: Package assignment
    disaster_lower = disaster_type.lower()
    is_wind_rain   = "rainfall" in disaster_lower or "wind" in disaster_lower
    is_drought     = "drought" in disaster_lower
    is_fully_destroyed = "completely destroyed" in desc or "fully destroyed" in desc

    packages_cost = 0

    # Emergency Tent
    if is_uninhabitable and final_damage == 4:
        packages_cost += 6500

    # Reconstruction Grant
    if is_fully_destroyed and final_damage == 4 and is_wind_rain:
        packages_cost += 75000

    # Re-roofing Kit
    if keywords["hasRoofDamage"] and final_damage in [2, 3] and is_wind_rain and not has_habitable_rooms:
        packages_cost += 18000

    # Tarpaulin Kit
    if final_damage >= 2 and is_wind_rain and not has_habitable_rooms:
        packages_cost += 2000

    # Food Parcel
    if income < 10000 or is_uninhabitable:
        packages_cost += 1500

    # Water Tank
    if is_drought and keywords["hasNoWaterAccess"]:
        packages_cost += 6000

    # Blanket & Clothing
    if keywords["hasChildrenUnder5"] or age > 65 or keywords["hasDisabledMembers"]:
        packages_cost += 1500

    # Medical Aid
    if keywords["hasInjuries"] or keywords["hasDisabledMembers"]:
        packages_cost += 1000

    return packages_cost


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5: HOUSEHOLD GENERATOR
# Creates one realistic household based on district and disaster type
# ─────────────────────────────────────────────────────────────────────────────

def generate_household(district, disaster_type):
    profile = DISTRICT_PROFILES[district]

    # Age
    age = random.randint(*profile["age_range"])

    # Income category based on district weights
    income_category = random.choices(
        ["low", "middle", "high"],
        weights=profile["income_weights"]
    )[0]
    income = random.randint(*INCOME_RANGES[income_category])

    # Household size
    size = random.randint(*profile["household_size_range"])

    # Damage level based on disaster type
    damage_level = random.choices(
        [1, 2, 3, 4],
        weights=DAMAGE_LEVEL_WEIGHTS[disaster_type]
    )[0]

    # Damage description
    description = generate_damage_description(damage_level, disaster_type)

    return {
        "age":               age,
        "monthly_income":    income,
        "household_size":    size,
        "damage_level":      damage_level,
        "damage_description": description,
    }


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6: SIMULATE 800 DISASTER EVENTS
# ─────────────────────────────────────────────────────────────────────────────

def simulate_disasters(n=800):
    print(f"Simulating {n} disaster events...")

    records = []

    for i in range(n):
        disaster_type = random.choice(DISASTER_TYPES)
        district      = random.choice(DISTRICTS)
        severity      = random.choice(SEVERITIES)
        season        = random.choice(SEASONS)

        # Number of households based on severity
        num_households = random.randint(*HOUSEHOLD_COUNT_RANGES[severity])

        # Generate households and run through allocation engine
        total_cost = 0
        for _ in range(num_households):
            household  = generate_household(district, disaster_type)
            cost       = process_household(household, disaster_type)
            total_cost += cost

        records.append({
            "disaster_type":    disaster_type,
            "district":         district,
            "severity":         severity,
            "season":           season,
            "num_households":   num_households,
            "total_funding":    total_cost,
        })

        if (i + 1) % 100 == 0:
            print(f"  {i + 1} events simulated...")

    print(f"Simulation complete. {n} events generated.\n")
    return records


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7: TRAIN THE MODEL
# ─────────────────────────────────────────────────────────────────────────────

def train_model(records):
    print("Training the linear regression model...")

    # Encode text columns into numbers
    le_type     = LabelEncoder()
    le_district = LabelEncoder()
    le_severity = LabelEncoder()
    le_season   = LabelEncoder()

    disaster_types = [r["disaster_type"] for r in records]
    districts      = [r["district"]      for r in records]
    severities     = [r["severity"]      for r in records]
    seasons        = [r["season"]        for r in records]
    num_households = [r["num_households"] for r in records]
    total_funding  = [r["total_funding"]  for r in records]

    le_type.fit(DISASTER_TYPES)
    le_district.fit(DISTRICTS)
    le_severity.fit(SEVERITIES)
    le_season.fit(SEASONS)

    # Build feature matrix X
    X = np.column_stack([
        le_type.transform(disaster_types),
        le_district.transform(districts),
        le_severity.transform(severities),
        le_season.transform(seasons),
        num_households,
    ])

    Y = np.array(total_funding)

    # Split into training and testing
    X_train, X_test, Y_train, Y_test = train_test_split(X, Y, test_size=0.2, random_state=42)

    # Train
    model = LinearRegression()
    model.fit(X_train, Y_train)

    # Evaluate
    Y_pred = model.predict(X_test)
    r2     = r2_score(Y_test, Y_pred)
    rmse   = np.sqrt(mean_squared_error(Y_test, Y_pred))

    print(f"  R² Score : {r2:.4f}  (closer to 1.0 is better)")
    print(f"  RMSE     : M{rmse:,.0f}  (average prediction error)\n")

    return model, le_type, le_district, le_severity, le_season


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8: SAVE THE MODEL
# ─────────────────────────────────────────────────────────────────────────────

def save_model(model, le_type, le_district, le_severity, le_season):
    with open("disaster_model.pkl", "wb") as f:
        pickle.dump(model, f)

    with open("disaster_encoders.pkl", "wb") as f:
        pickle.dump({
            "le_type":     le_type,
            "le_district": le_district,
            "le_severity": le_severity,
            "le_season":   le_season,
        }, f)

    print("Model saved:    disaster_model.pkl")
    print("Encoders saved: disaster_encoders.pkl")
    print("\nYou can now use these files in your backend to make predictions.")


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 9: EXAMPLE PREDICTION
# Shows how to use the saved model to make one prediction
# ─────────────────────────────────────────────────────────────────────────────

def example_prediction(model, le_type, le_district, le_severity, le_season):
    print("\n--- Example Prediction ---")

    disaster_type  = "Heavy Rainfall"
    district       = "Maseru"
    severity       = "Critical"
    season         = "Winter"
    num_households = 150

    X_new = np.array([[
        le_type.transform([disaster_type])[0],
        le_district.transform([district])[0],
        le_severity.transform([severity])[0],
        le_season.transform([season])[0],
        num_households,
    ]])

    prediction = model.predict(X_new)[0]

    print(f"  Disaster : {disaster_type}")
    print(f"  District : {district}")
    print(f"  Severity : {severity}")
    print(f"  Season   : {season}")
    print(f"  Households: {num_households}")
    print(f"\n  Estimated funding required: M{prediction:,.0f}")


# ─────────────────────────────────────────────────────────────────────────────
# RUN EVERYTHING
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    records                                        = simulate_disasters(800)
    model, le_type, le_district, le_severity, le_season = train_model(records)
    save_model(model, le_type, le_district, le_severity, le_season)
    example_prediction(model, le_type, le_district, le_severity, le_season)
