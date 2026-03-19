import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
import joblib

df = pd.read_csv("disaster_forecast_data_villages.csv")

disaster_map = {"Heavy Rainfall": 1, "Strong Winds": 2, "Drought": 3}
df["Disaster_Type"] = df["Disaster_Type"].map(disaster_map)

X = df[["Disaster_Type", "Severity_Level", "Households_Affected",
        "Household_Size", "Income_Level", "Damage_Level"]]
y = df["Estimated_Cost"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = LinearRegression()
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print("====== Model Results ======")
print(f"R² Score : {r2:.4f}  (closer to 1.0 = better)")
print(f"MSE      : {mse:,.0f}")
print("Model trained successfully!")

joblib.dump(model, "disaster_cost_model.pkl")
print("Model saved as disaster_cost_model.pkl")