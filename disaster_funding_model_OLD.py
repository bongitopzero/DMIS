"""
disaster_funding_model.py
=========================
Trains a disaster funding prediction model for Lesotho DMA.

Dataset: disaster_dataset.csv (2000 simulated events)
         Calibrated against real October 2023 DMA expenditure records:
           - Reconstruction Grant : LSL 130,000
           - Re-roofing Kit       : LSL 35,000

Model selection follows proper steps:
  1. Problem identified as regression (continuous target: total_funding)
  2. Three established regression models evaluated as candidates
  3. Each model evaluated using R², RMSE, and MAE
  4. K-fold cross-validation (k=5) used to ensure results are not
     dependent on a single train/test split
  5. Best model selected based on cross-validated R² score

Output files:
  - disaster_model.pkl     (best trained model)
  - disaster_encoders.pkl  (encoders + feature column order for predict.py)
"""

import pickle
import numpy as np
import pandas as pd

from sklearn.linear_model    import LinearRegression
from sklearn.ensemble        import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing   import LabelEncoder
from sklearn.model_selection import train_test_split, KFold, cross_val_score
from sklearn.metrics         import r2_score, mean_squared_error, mean_absolute_error


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1: LOAD DATASET
# ─────────────────────────────────────────────────────────────────────────────

def load_data(filepath="disaster_dataset.csv"):
    print(f"Loading dataset: {filepath}")
    df = pd.read_csv(filepath)
    print(f"  Rows    : {len(df)}")
    print(f"  Columns : {list(df.columns)}\n")
    return df


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2: PREPARE FEATURES
# ─────────────────────────────────────────────────────────────────────────────

def prepare_features(df):
    """
    Encodes categorical columns and builds the feature matrix X.

    Problem type  : Regression (predicting continuous LSL amount)
    Target        : total_funding

    Categorical features (label encoded):
      - disaster_type  : Heavy Rainfall, Strong Winds, Drought
      - severity       : Low, Moderate, Critical
      - season         : Summer, Autumn, Winter, Spring

    Numerical features (used as-is):
      - num_households    : strongest predictor — scales total cost directly
      - avg_damage_level  : second strongest — determines which packages apply
      - pct_elderly       : affects blanket/clothing package eligibility
      - pct_children_u5   : affects blanket/clothing package eligibility
      - pct_disabled      : affects medical aid package eligibility
      - avg_household_size: scales per-household costs

    Not used as a feature:
      - district  : kept in CSV for reference/reporting only
    """

    print("Preparing features...")

    # Fit encoders on all known categories
    # This ensures encoders are stable at prediction time
    le_disaster_type = LabelEncoder()
    le_severity      = LabelEncoder()
    le_season        = LabelEncoder()

    le_disaster_type.fit(["Heavy Rainfall", "Strong Winds", "Drought"])
    le_severity.fit(["Low", "Moderate", "Critical"])
    le_season.fit(["Summer", "Autumn", "Winter", "Spring"])

    df["disaster_type_enc"] = le_disaster_type.transform(df["disaster_type"])
    df["severity_enc"]      = le_severity.transform(df["severity"])
    df["season_enc"]        = le_season.transform(df["season"])

    # Feature order here must exactly match the order in predict.py
    feature_columns = [
        "disaster_type_enc",
        "severity_enc",
        "season_enc",
        "num_households",
        "avg_damage_level",
        "pct_elderly",
        "pct_children_u5",
        "pct_disabled",
        "avg_household_size",
    ]

    X = df[feature_columns].values
    Y = df["total_funding"].values

    print(f"  Problem type : Regression (continuous target)")
    print(f"  Features ({len(feature_columns)}) : {feature_columns}")
    print(f"  Target       : total_funding")
    print(f"  X shape      : {X.shape}")
    print(f"  Y min        : LSL {Y.min():,.0f}")
    print(f"  Y max        : LSL {Y.max():,.0f}")
    print(f"  Y mean       : LSL {Y.mean():,.0f}\n")

    encoders = {
        "le_disaster_type": le_disaster_type,
        "le_severity":      le_severity,
        "le_season":        le_season,
        "feature_columns":  feature_columns,
    }

    return X, Y, encoders


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3: K-FOLD CROSS VALIDATION
# Evaluates each model across 5 different train/test splits
# Prevents results from being dependent on one particular split
# ─────────────────────────────────────────────────────────────────────────────

def cross_validate_models(X, Y):
    """
    Runs 5-fold cross-validation on all three candidate models.
    Each model is trained and tested 5 times on different data splits.
    Final score is the average across all 5 folds.
    """

    print("=" * 62)
    print("STEP 1: K-FOLD CROSS-VALIDATION (k=5)")
    print("Each model trained and tested on 5 different data splits.")
    print("Final score = average across all 5 folds.")
    print("=" * 62)

    kf = KFold(n_splits=5, shuffle=True, random_state=42)

    candidates = {
        "Linear Regression": LinearRegression(),
        "Random Forest":     RandomForestRegressor(n_estimators=100, random_state=42),
        "Gradient Boosting": GradientBoostingRegressor(n_estimators=100, random_state=42),
    }

    cv_results = {}

    print(f"\n  {'Model':<22}  {'CV R² Mean':>10}  {'CV R² Std':>10}")
    print(f"  {'-'*22}  {'-'*10}  {'-'*10}")

    for name, model in candidates.items():
        # cross_val_score returns R² for each of the 5 folds
        scores = cross_val_score(model, X, Y, cv=kf, scoring="r2")
        mean_r2 = scores.mean()
        std_r2  = scores.std()
        cv_results[name] = {
            "model":   model,
            "mean_r2": mean_r2,
            "std_r2":  std_r2,
            "scores":  scores,
        }
        print(f"  {name:<22}  {mean_r2:>10.4f}  {std_r2:>10.4f}")

    print()
    return cv_results, candidates


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4: HOLDOUT EVALUATION
# Final evaluation on a separate 20% test set
# Reports R², RMSE, and MAE — all three regression metrics
# ─────────────────────────────────────────────────────────────────────────────

def holdout_evaluation(X, Y, candidates):
    """
    Splits data 80/20 and evaluates all models on the held-out test set.
    Reports R², RMSE, and MAE as recommended for regression problems.
    """

    print("=" * 62)
    print("STEP 2: HOLDOUT EVALUATION (80% train / 20% test)")
    print("Regression metrics: R², RMSE, MAE")
    print("=" * 62)

    X_train, X_test, Y_train, Y_test = train_test_split(
        X, Y, test_size=0.2, random_state=42
    )

    print(f"\n  Training samples : {len(X_train)}")
    print(f"  Testing samples  : {len(X_test)}\n")

    print(f"  {'Model':<22}  {'R²':>8}  {'RMSE (LSL)':>15}  {'MAE (LSL)':>15}")
    print(f"  {'-'*22}  {'-'*8}  {'-'*15}  {'-'*15}")

    holdout_results = {}

    for name, model in candidates.items():
        model.fit(X_train, Y_train)
        Y_pred = model.predict(X_test)

        r2   = r2_score(Y_test, Y_pred)
        rmse = np.sqrt(mean_squared_error(Y_test, Y_pred))
        mae  = mean_absolute_error(Y_test, Y_pred)

        holdout_results[name] = {
            "model": model,
            "r2":    r2,
            "rmse":  rmse,
            "mae":   mae,
        }

        print(f"  {name:<22}  {r2:>8.4f}  LSL {rmse:>12,.0f}  LSL {mae:>12,.0f}")

    print()
    return holdout_results, X_train, X_test, Y_train, Y_test


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5: SELECT BEST MODEL
# Based on cross-validated R² — not just holdout performance
# ─────────────────────────────────────────────────────────────────────────────

def select_best_model(cv_results, holdout_results):
    """
    Selects the best model based on cross-validated R².
    Using CV score rather than holdout score ensures the choice
    is not influenced by a lucky or unlucky train/test split.
    """

    print("=" * 62)
    print("STEP 3: MODEL SELECTION")
    print("Selecting based on cross-validated R² (most reliable).")
    print("=" * 62)

    best_name  = max(cv_results, key=lambda k: cv_results[k]["mean_r2"])
    best_cv    = cv_results[best_name]
    best_ho    = holdout_results[best_name]
    best_model = best_ho["model"]  # use the version fitted on train set

    print(f"\n  Selected model   : {best_name}")
    print(f"  CV R² (mean)     : {best_cv['mean_r2']:.4f}")
    print(f"  CV R² (std)      : {best_cv['std_r2']:.4f}  (lower = more stable)")
    print(f"  Holdout R²       : {best_ho['r2']:.4f}")
    print(f"  Holdout RMSE     : LSL {best_ho['rmse']:,.0f}")
    print(f"  Holdout MAE      : LSL {best_ho['mae']:,.0f}")
    print()

    # Plain-English interpretation
    print(f"  Interpretation:")
    print(f"  - The model explains {best_ho['r2']*100:.1f}% of variance in funding amounts.")
    print(f"  - On average, predictions are within LSL {best_ho['mae']:,.0f} of the true value.")
    print(f"  - RMSE of LSL {best_ho['rmse']:,.0f} penalises large errors more heavily.")
    print()

    return best_model, best_name


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6: FEATURE IMPORTANCE
# Explains what drives predictions — important for academic defence
# ─────────────────────────────────────────────────────────────────────────────

def print_feature_importance(best_model, best_name, feature_columns):
    print("=" * 62)
    print("FEATURE IMPORTANCE")
    print("What drives the prediction most strongly.")
    print("=" * 62)

    if hasattr(best_model, "feature_importances_"):
        importances = best_model.feature_importances_
        pairs = sorted(
            zip(feature_columns, importances),
            key=lambda x: x[1],
            reverse=True
        )
        for feat, imp in pairs:
            bar = "█" * int(imp * 40)
            print(f"  {feat:<22}  {bar:<40}  {imp:.4f}")

    elif hasattr(best_model, "coef_"):
        coefs = best_model.coef_
        pairs = sorted(
            zip(feature_columns, coefs),
            key=lambda x: abs(x[1]),
            reverse=True
        )
        for feat, coef in pairs:
            print(f"  {feat:<22}  coefficient: {coef:>15,.2f}")

    print()


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7: RETRAIN ON FULL DATASET
# After selecting the best model, retrain on ALL data (not just 80%)
# This gives the model maximum information before deployment
# ─────────────────────────────────────────────────────────────────────────────

def retrain_on_full_data(best_model, X, Y):
    """
    Retrains the selected model on the full dataset.
    We already know from cross-validation that it generalises well,
    so using all 2000 rows makes the final model as strong as possible.
    """
    print("=" * 62)
    print("STEP 4: RETRAIN ON FULL DATASET")
    print("Selected model retrained on all 2000 rows for deployment.")
    print("=" * 62)

    best_model.fit(X, Y)
    Y_pred_full = best_model.predict(X)
    r2_full     = r2_score(Y, Y_pred_full)

    print(f"\n  Full dataset R²  : {r2_full:.4f}")
    print(f"  Rows used        : {len(X)}\n")

    return best_model


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8: SAVE MODEL AND ENCODERS
# ─────────────────────────────────────────────────────────────────────────────

def save_model(best_model, encoders):
    with open("disaster_model.pkl", "wb") as f:
        pickle.dump(best_model, f)

    with open("disaster_encoders.pkl", "wb") as f:
        pickle.dump(encoders, f)

    print("=" * 62)
    print("FILES SAVED")
    print("=" * 62)
    print("  disaster_model.pkl    — trained model")
    print("  disaster_encoders.pkl — encoders + feature column order")
    print()


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 9: EXAMPLE PREDICTION
# Verifies the saved model works before deploying predict.py
# ─────────────────────────────────────────────────────────────────────────────

def example_prediction(best_model, encoders):
    print("=" * 62)
    print("EXAMPLE PREDICTION (deployment verification)")
    print("=" * 62)

    le_disaster_type = encoders["le_disaster_type"]
    le_severity      = encoders["le_severity"]
    le_season        = encoders["le_season"]

    # Critical Strong Winds, Winter, 300 households — Mafeteng profile
    disaster_type    = "Strong Winds"
    severity         = "Critical"
    season           = "Winter"
    num_households   = 300
    avg_damage_level = 2.8
    pct_elderly      = 0.12
    pct_children_u5  = 0.18
    pct_disabled     = 0.07
    avg_hh_size      = 6.0

    X_new = np.array([[
        le_disaster_type.transform([disaster_type])[0],
        le_severity.transform([severity])[0],
        le_season.transform([season])[0],
        num_households,
        avg_damage_level,
        pct_elderly,
        pct_children_u5,
        pct_disabled,
        avg_hh_size,
    ]])

    prediction = best_model.predict(X_new)[0]
    prediction = max(0, prediction)

    print(f"\n  Input:")
    print(f"    Disaster type    : {disaster_type}")
    print(f"    Severity         : {severity}")
    print(f"    Season           : {season}")
    print(f"    Households       : {num_households}")
    print(f"    Avg damage level : {avg_damage_level}")
    print(f"    % Elderly        : {pct_elderly}")
    print(f"    % Children u5    : {pct_children_u5}")
    print(f"    % Disabled       : {pct_disabled}")
    print(f"    Avg HH size      : {avg_hh_size}")
    print(f"\n  Estimated funding  : LSL {prediction:,.0f}")
    print("=" * 62)


# ─────────────────────────────────────────────────────────────────────────────
# RUN EVERYTHING
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "=" * 62)
    print("DISASTER FUNDING PREDICTION MODEL — TRAINING")
    print("Lesotho Disaster Management Authority")
    print("=" * 62 + "\n")

    df                       = load_data("disaster_dataset.csv")
    X, Y, encoders           = prepare_features(df)
    feature_columns          = encoders["feature_columns"]

    cv_results, candidates   = cross_validate_models(X, Y)
    holdout_results, X_train, X_test, Y_train, Y_test = holdout_evaluation(X, Y, candidates)

    best_model, best_name    = select_best_model(cv_results, holdout_results)
    print_feature_importance(best_model, best_name, feature_columns)

    best_model               = retrain_on_full_data(best_model, X, Y)
    save_model(best_model, encoders)
    example_prediction(best_model, encoders)

    print("\nTraining complete. Ready to deploy predict.py.\n")
