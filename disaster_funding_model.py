"""
disaster_funding_model.py
=========================
Trains a Decision Tree regression model for disaster funding prediction.
Lesotho Disaster Management Authority.

Dataset: disaster_dataset.csv (2000 simulated events)
         Calibrated against real October 2023 DMA expenditure records:
           - Reconstruction Grant : LSL 130,000
           - Re-roofing Kit       : LSL 35,000

Model: Decision Tree Regressor
       - Appropriate for regression problems with threshold-based rules
       - Optimal tree depth determined automatically via 5-fold cross-validation
       - Pruned to prevent overfitting on training data

Evaluation metrics (as recommended for regression problems):
  - R²   : proportion of variance explained (closer to 1.0 is better)
  - RMSE : root mean squared error in LSL (lower is better)
  - MAE  : mean absolute error in LSL (lower is better)

Output files:
  - disaster_model.pkl     (trained Decision Tree model)
  - disaster_encoders.pkl  (encoders + feature column order for predict.py)
"""

import pickle
import numpy as np
import pandas as pd

from sklearn.tree            import DecisionTreeRegressor, export_text
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
    Model         : Decision Tree Regressor

    Categorical features (label encoded):
      - disaster_type  : Heavy Rainfall, Strong Winds, Drought
      - severity       : Low, Moderate, Critical
      - season         : Summer, Autumn, Winter, Spring

    Numerical features (used as-is):
      - num_households    : strongest predictor — scales total cost directly
      - avg_damage_level  : determines which packages apply at each threshold
      - pct_elderly       : affects blanket/clothing package eligibility
      - pct_children_u5   : affects blanket/clothing package eligibility
      - pct_disabled      : affects medical aid package eligibility
      - avg_household_size: scales per-household costs

    Not used as a feature:
      - district  : reference column only
    """

    print("Preparing features...")

    le_disaster_type = LabelEncoder()
    le_severity      = LabelEncoder()
    le_season        = LabelEncoder()

    # Fit on all known categories — ensures stability at prediction time
    le_disaster_type.fit(["Heavy Rainfall", "Strong Winds", "Drought"])
    le_severity.fit(["Low", "Moderate", "Critical"])
    le_season.fit(["Summer", "Autumn", "Winter", "Spring"])

    df["disaster_type_enc"] = le_disaster_type.transform(df["disaster_type"])
    df["severity_enc"]      = le_severity.transform(df["severity"])
    df["season_enc"]        = le_season.transform(df["season"])

    # Feature order must exactly match predict.py
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
    print(f"  Model        : Decision Tree Regressor")
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
# SECTION 3: FIND OPTIMAL TREE DEPTH VIA CROSS-VALIDATION
# Tests depths 3, 5, 7, 10, 15, 20 and picks the one that generalises best.
# This is the pruning step — preventing the tree from memorising training data.
# ─────────────────────────────────────────────────────────────────────────────

def find_optimal_depth(X, Y):
    """
    Tests multiple max_depth values using 5-fold cross-validation.
    Selects the depth with the highest average R² across all 5 folds.

    Why this matters:
    Without a depth limit, a Decision Tree will keep splitting until it
    has memorised every training record (overfitting). Cross-validation
    finds the depth where the tree generalises best to unseen data.

    Depths tested: 3, 5, 7, 10, 15, 20, None (unlimited)
    """

    print("=" * 62)
    print("STEP 1: FINDING OPTIMAL TREE DEPTH")
    print("Testing multiple depths via 5-fold cross-validation.")
    print("This determines the pruning level to prevent overfitting.")
    print("=" * 62)

    depths     = [3, 5, 7, 10, 15, 20, None]
    kf         = KFold(n_splits=5, shuffle=True, random_state=42)
    cv_results = {}

    print(f"\n  {'Depth':<10}  {'CV R² Mean':>10}  {'CV R² Std':>10}  {'Note'}")
    print(f"  {'-'*10}  {'-'*10}  {'-'*10}  {'-'*20}")

    for depth in depths:
        model  = DecisionTreeRegressor(max_depth=depth, random_state=42)
        scores = cross_val_score(model, X, Y, cv=kf, scoring="r2")
        mean   = scores.mean()
        std    = scores.std()

        depth_label = str(depth) if depth is not None else "Unlimited"
        note        = "← overfitting risk" if depth is None else ""

        cv_results[depth] = {"mean_r2": mean, "std_r2": std}
        print(f"  {depth_label:<10}  {mean:>10.4f}  {std:>10.4f}  {note}")

    # Select depth with highest mean R²
    # If unlimited wins, we still cap at 20 to avoid overfitting
    best_depth = max(cv_results, key=lambda d: cv_results[d]["mean_r2"])
    best_mean  = cv_results[best_depth]["mean_r2"]
    best_std   = cv_results[best_depth]["std_r2"]

    print(f"\n  Optimal depth : {best_depth if best_depth is not None else 'Unlimited (capped at 20 for safety)'}")
    print(f"  CV R² mean    : {best_mean:.4f}")
    print(f"  CV R² std     : {best_std:.4f}\n")

    # Safety cap — if unlimited is selected, use 20 to prevent overfitting
    if best_depth is None:
        best_depth = 20

    return best_depth, cv_results


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4: TRAIN AND EVALUATE ON HOLDOUT SET
# Final evaluation on a separate 20% test set
# ─────────────────────────────────────────────────────────────────────────────

def train_and_evaluate(X, Y, optimal_depth):
    """
    Trains the Decision Tree at the optimal depth on 80% of the data.
    Evaluates on the remaining 20% using R², RMSE, and MAE.
    """

    print("=" * 62)
    print("STEP 2: HOLDOUT EVALUATION (80% train / 20% test)")
    print(f"Training Decision Tree at optimal depth: {optimal_depth}")
    print("=" * 62)

    X_train, X_test, Y_train, Y_test = train_test_split(
        X, Y, test_size=0.2, random_state=42
    )

    print(f"\n  Training samples : {len(X_train)}")
    print(f"  Testing samples  : {len(X_test)}\n")

    model = DecisionTreeRegressor(max_depth=optimal_depth, random_state=42)
    model.fit(X_train, Y_train)

    Y_pred = model.predict(X_test)

    r2   = r2_score(Y_test, Y_pred)
    rmse = np.sqrt(mean_squared_error(Y_test, Y_pred))
    mae  = mean_absolute_error(Y_test, Y_pred)

    print(f"  R²   : {r2:.4f}  — model explains {r2*100:.1f}% of variance in funding")
    print(f"  RMSE : LSL {rmse:,.0f}")
    print(f"  MAE  : LSL {mae:,.0f}  — average prediction error\n")

    # Plain English interpretation
    mean_funding = Y.mean()
    pct_error    = (mae / mean_funding) * 100
    print(f"  Interpretation:")
    print(f"  - On average predictions are within LSL {mae:,.0f} of the true value")
    print(f"  - That is {pct_error:.1f}% of the mean funding (LSL {mean_funding:,.0f})")
    print()

    return model, r2, rmse, mae, X_train, X_test, Y_train, Y_test


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5: FEATURE IMPORTANCE
# Decision Trees provide clear feature importance scores
# This is one of the key advantages over more complex models
# ─────────────────────────────────────────────────────────────────────────────

def print_feature_importance(model, feature_columns):
    print("=" * 62)
    print("FEATURE IMPORTANCE")
    print("What drives the prediction most strongly.")
    print("(Key advantage of Decision Trees — fully transparent)")
    print("=" * 62)

    importances = model.feature_importances_
    pairs       = sorted(
        zip(feature_columns, importances),
        key=lambda x: x[1],
        reverse=True
    )

    for feat, imp in pairs:
        bar = "█" * int(imp * 40)
        print(f"  {feat:<22}  {bar:<40}  {imp:.4f}")

    print()


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6: PRINT TREE STRUCTURE (shallow preview)
# One of the key advantages of Decision Trees — you can read exactly
# how the model makes every decision. Useful for supervisor demonstration.
# ─────────────────────────────────────────────────────────────────────────────

def print_tree_structure(model, feature_columns):
    print("=" * 62)
    print("DECISION TREE STRUCTURE (first 3 levels)")
    print("Shows how the model splits data at each node.")
    print("=" * 62 + "\n")

    # Print only first 3 levels to keep it readable
    tree_text = export_text(model, feature_names=feature_columns, max_depth=3)
    print(tree_text)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7: RETRAIN ON FULL DATASET
# After finding optimal depth and validating performance,
# retrain on all 2000 records for the strongest possible deployment model
# ─────────────────────────────────────────────────────────────────────────────

def retrain_on_full_data(optimal_depth, X, Y):
    """
    Retrains on all 2000 records.
    Cross-validation already confirmed the model generalises well
    at this depth, so using all data makes the final model stronger.
    """

    print("=" * 62)
    print("STEP 3: RETRAIN ON FULL DATASET")
    print("Retraining on all 2000 rows for deployment.")
    print("=" * 62)

    final_model     = DecisionTreeRegressor(max_depth=optimal_depth, random_state=42)
    final_model.fit(X, Y)

    Y_pred_full = final_model.predict(X)
    r2_full     = r2_score(Y, Y_pred_full)

    print(f"\n  Depth used     : {optimal_depth}")
    print(f"  Full dataset R²: {r2_full:.4f}")
    print(f"  Rows used      : {len(X)}\n")

    return final_model


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8: SAVE MODEL AND ENCODERS
# ─────────────────────────────────────────────────────────────────────────────

def save_model(final_model, encoders):
    with open("disaster_model.pkl", "wb") as f:
        pickle.dump(final_model, f)

    with open("disaster_encoders.pkl", "wb") as f:
        pickle.dump(encoders, f)

    print("=" * 62)
    print("FILES SAVED")
    print("=" * 62)
    print("  disaster_model.pkl    — trained Decision Tree model")
    print("  disaster_encoders.pkl — encoders + feature column order")
    print()


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 9: EXAMPLE PREDICTION
# Verifies the saved model works before deploying predict.py
# ─────────────────────────────────────────────────────────────────────────────

def example_prediction(final_model, encoders):
    print("=" * 62)
    print("EXAMPLE PREDICTION (deployment verification)")
    print("=" * 62)

    le_disaster_type = encoders["le_disaster_type"]
    le_severity      = encoders["le_severity"]
    le_season        = encoders["le_season"]

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

    prediction = final_model.predict(X_new)[0]
    prediction = max(0, prediction)

    print(f"\n  Disaster type    : {disaster_type}")
    print(f"  Severity         : {severity}")
    print(f"  Season           : {season}")
    print(f"  Households       : {num_households}")
    print(f"  Avg damage level : {avg_damage_level}")
    print(f"  % Elderly        : {pct_elderly}")
    print(f"  % Children u5    : {pct_children_u5}")
    print(f"  % Disabled       : {pct_disabled}")
    print(f"  Avg HH size      : {avg_hh_size}")
    print(f"\n  Estimated funding: LSL {prediction:,.0f}")
    print("=" * 62)


# ─────────────────────────────────────────────────────────────────────────────
# RUN EVERYTHING
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "=" * 62)
    print("DISASTER FUNDING PREDICTION MODEL — TRAINING")
    print("Model: Decision Tree Regressor")
    print("Lesotho Disaster Management Authority")
    print("=" * 62 + "\n")

    df                   = load_data("disaster_dataset.csv")
    X, Y, encoders       = prepare_features(df)
    feature_columns      = encoders["feature_columns"]

    optimal_depth, cv_results  = find_optimal_depth(X, Y)
    model, r2, rmse, mae, X_train, X_test, Y_train, Y_test = train_and_evaluate(X, Y, optimal_depth)

    print_feature_importance(model, feature_columns)
    print_tree_structure(model, feature_columns)

    final_model = retrain_on_full_data(optimal_depth, X, Y)
    save_model(final_model, encoders)
    example_prediction(final_model, encoders)

    print("\nTraining complete. Ready to deploy predict.py.\n")
