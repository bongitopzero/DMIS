import pandas as pd
import joblib

model = joblib.load("disaster_cost_model.pkl")

new_disaster = pd.DataFrame({
    "Disaster_Type":       [1],
    "Severity_Level":      [3],
    "Households_Affected": [45],
    "Household_Size":      [6],
    "Income_Level":        [3],
    "Damage_Level":        [3]
})

predicted_cost = model.predict(new_disaster)
print(f"Predicted disaster cost: M {predicted_cost[0]:,.2f}")