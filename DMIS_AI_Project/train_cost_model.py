"""
Machine Learning Model for Disaster Cost Prediction
Trains multiple models to predict disaster costs based on disaster metrics
"""

import pandas as pd
import numpy as np
import pickle
import os
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import matplotlib.pyplot as plt


class DisasterCostMLModel:
    """Machine Learning model for disaster cost prediction"""
    
    def __init__(self, data_path: str = "data/disaster_costs_synthetic.csv"):
        """Initialize the ML model"""
        self.data_path = data_path
        self.df = None
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.models = {}
        self.results = {}
        
    def load_data(self):
        """Load the synthetic dataset"""
        if not os.path.exists(self.data_path):
            print(f"❌ Data file not found: {self.data_path}")
            return False
        
        self.df = pd.read_csv(self.data_path)
        print(f"✓ Loaded {len(self.df)} records from {self.data_path}")
        return True
    
    def preprocess_data(self):
        """Preprocess data for ML model"""
        print("\n🔧 Preprocessing data...")
        
        # Create a copy for processing
        df_processed = self.df.copy()
        
        # Encode categorical variables
        categorical_cols = ['Disaster_Type', 'District', 'Severity', 'Immediate_Needs']
        for col in categorical_cols:
            le = LabelEncoder()
            df_processed[col + '_encoded'] = le.fit_transform(df_processed[col])
            self.label_encoders[col] = le
        
        # Select features for model
        feature_cols = [
            'Affected_Population', 'Affected_Households', 'Houses_Damaged',
            'Duration_Days', 'Disaster_Type_encoded', 'District_encoded',
            'Severity_encoded', 'Immediate_Needs_encoded'
        ]
        
        X = df_processed[feature_cols]
        y = df_processed['Estimated_Cost_Maloti']
        
        # Split data
        self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        self.X_train = self.scaler.fit_transform(self.X_train)
        self.X_test = self.scaler.transform(self.X_test)
        
        print(f"✓ Training set: {len(self.X_train)} samples")
        print(f"✓ Test set: {len(self.X_test)} samples")
        print(f"✓ Features: {len(feature_cols)}")
        
        return feature_cols
    
    def train_models(self):
        """Train multiple regression models"""
        print("\n🤖 Training models...")
        
        models_config = {
            'Linear Regression': LinearRegression(),
            'Random Forest': RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
            'Gradient Boosting': GradientBoostingRegressor(n_estimators=100, random_state=42)
        }
        
        for model_name, model in models_config.items():
            print(f"\n  Training {model_name}...")
            
            # Train model
            model.fit(self.X_train, self.y_train)
            self.models[model_name] = model
            
            # Make predictions
            y_train_pred = model.predict(self.X_train)
            y_test_pred = model.predict(self.X_test)
            
            # Calculate metrics
            train_mae = mean_absolute_error(self.y_train, y_train_pred)
            test_mae = mean_absolute_error(self.y_test, y_test_pred)
            train_rmse = np.sqrt(mean_squared_error(self.y_train, y_train_pred))
            test_rmse = np.sqrt(mean_squared_error(self.y_test, y_test_pred))
            train_r2 = r2_score(self.y_train, y_train_pred)
            test_r2 = r2_score(self.y_test, y_test_pred)
            
            # Cross-validation
            cv_scores = cross_val_score(model, self.X_train, self.y_train, cv=5, scoring='r2')
            
            self.results[model_name] = {
                'train_mae': train_mae,
                'test_mae': test_mae,
                'train_rmse': train_rmse,
                'test_rmse': test_rmse,
                'train_r2': train_r2,
                'test_r2': test_r2,
                'cv_scores': cv_scores,
                'cv_mean': cv_scores.mean(),
                'cv_std': cv_scores.std()
            }
            
            print(f"    Train MAE: M{train_mae:,.0f}")
            print(f"    Test MAE: M{test_mae:,.0f}")
            print(f"    Test R²: {test_r2:.4f}")
            print(f"    CV R² (mean ± std): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    
    def print_results(self):
        """Print model comparison results"""
        print("\n" + "="*80)
        print("📊 MODEL COMPARISON RESULTS")
        print("="*80)
        
        results_df = pd.DataFrame({
            'Model': list(self.results.keys()),
            'Test MAE (M)': [f"{self.results[m]['test_mae']:,.0f}" for m in self.results.keys()],
            'Test RMSE (M)': [f"{self.results[m]['test_rmse']:,.0f}" for m in self.results.keys()],
            'Test R²': [f"{self.results[m]['test_r2']:.4f}" for m in self.results.keys()],
            'CV R² Mean': [f"{self.results[m]['cv_mean']:.4f}" for m in self.results.keys()],
        })
        
        print(results_df.to_string(index=False))
        
        # Find best model
        best_model = max(self.results.keys(), key=lambda x: self.results[x]['test_r2'])
        print(f"\n🏆 Best Model: {best_model}")
        print(f"   Test R² Score: {self.results[best_model]['test_r2']:.4f}")
    
    def save_models(self):
        """Save trained models to disk"""
        os.makedirs("models", exist_ok=True)
        
        for model_name, model in self.models.items():
            filepath = f"models/{model_name.lower().replace(' ', '_')}.pkl"
            with open(filepath, 'wb') as f:
                pickle.dump(model, f)
            print(f"✓ Saved {model_name} to {filepath}")
        
        # Save scaler
        with open("models/scaler.pkl", 'wb') as f:
            pickle.dump(self.scaler, f)
        print(f"✓ Saved scaler to models/scaler.pkl")
        
        # Save label encoders
        with open("models/label_encoders.pkl", 'wb') as f:
            pickle.dump(self.label_encoders, f)
        print(f"✓ Saved label encoders to models/label_encoders.pkl")
    
    def predict(self, model_name: str, features: np.ndarray) -> float:
        """
        Make prediction using a trained model
        
        Args:
            model_name: Name of the model to use
            features: Feature array (should be preprocessed and scaled)
        
        Returns:
            Predicted cost
        """
        if model_name not in self.models:
            raise ValueError(f"Model {model_name} not found. Available: {list(self.models.keys())}")
        
        model = self.models[model_name]
        return model.predict([features])[0]
    
    def run_pipeline(self):
        """Run complete ML pipeline"""
        print("🚀 Starting Disaster Cost ML Pipeline")
        print("="*80)
        
        if not self.load_data():
            return False
        
        self.preprocess_data()
        self.train_models()
        self.print_results()
        self.save_models()
        
        print("\n✅ Pipeline completed successfully!")
        return True


if __name__ == "__main__":
    ml_model = DisasterCostMLModel()
    ml_model.run_pipeline()
