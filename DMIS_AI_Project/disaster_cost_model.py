"""
DMIS Disaster Cost Forecasting Model
Predicts costs for Strong Winds, Heavy Rainfall, and Drought in Lesotho
"""

import pandas as pd
import numpy as np
from enum import Enum
from dataclasses import dataclass
from typing import List, Tuple


# Severity Levels
class SeverityLevel(Enum):
    LOW = "Low"
    MODERATE = "Moderate"
    SEVERE = "Severe"


# Cost ranges for different disaster types (in Maloti - M)
@dataclass
class StrongWindsCosts:
    """Strong Winds Cost Parameters"""
    repair_cost_per_house_low = (15000, 25000)
    repair_cost_per_house_moderate = (25000, 50000)
    repair_cost_per_house_severe = (50000, 120000)
    relief_cost_per_household = (1500, 5000)


@dataclass
class HeavyRainfallCosts:
    """Heavy Rainfall Cost Parameters"""
    repair_cost_per_house_low = (20000, 50000)
    repair_cost_per_house_moderate = (50000, 80000)
    relief_cost_per_person = (300, 800)
    infrastructure_low = (200000, 500000)
    infrastructure_moderate = (500000, 2000000)
    infrastructure_severe = (2000000, 10000000)


@dataclass
class DroughtCosts:
    """Drought Cost Parameters"""
    food_support_per_person = (1000, 2500)
    water_support_per_household = (500, 1500)
    agriculture_recovery_low = 500000
    agriculture_recovery_moderate = 2000000
    agriculture_recovery_severe_low = 5000000
    agriculture_recovery_severe_high = 15000000


class SeverityDeterminer:
    """Determines severity level based on disaster metrics"""
    
    @staticmethod
    def determine_severity(houses_damaged: int = 0, 
                          affected_population: int = 0,
                          rainfall_intensity: float = 0.0) -> SeverityLevel:
        """
        Determine severity based on multiple factors
        
        Args:
            houses_damaged: Number of damaged houses
            affected_population: Total affected population
            rainfall_intensity: Rainfall intensity factor (0-1)
        
        Returns:
            SeverityLevel: Low, Moderate, or Severe
        """
        severity_score = 0
        
        # House damage scoring
        if houses_damaged > 200:
            severity_score += 3
        elif houses_damaged > 50:
            severity_score += 2
        else:
            severity_score += 1
        
        # Population scoring
        if affected_population > 10000:
            severity_score += 3
        elif affected_population > 5000:
            severity_score += 2
        else:
            severity_score += 1
        
        # Rainfall intensity scoring
        if rainfall_intensity > 0.7:
            severity_score += 3
        elif rainfall_intensity > 0.4:
            severity_score += 2
        else:
            severity_score += 1
        
        # Average score to determine severity
        avg_score = severity_score / 3
        
        if avg_score >= 2.5:
            return SeverityLevel.SEVERE
        elif avg_score >= 1.8:
            return SeverityLevel.MODERATE
        else:
            return SeverityLevel.LOW


class DisasterCostCalculator:
    """Calculates disaster costs based on disaster type and metrics"""
    
    @staticmethod
    def calculate_strong_winds_cost(
        houses_damaged: int,
        affected_households: int,
        affected_population: int,
        immediate_needs: str
    ) -> Tuple[float, SeverityLevel]:
        """
        Calculate cost for strong winds disaster
        
        Total Cost = (Houses Damaged × Repair Cost Per House) 
                   + (Affected Households × Relief Cost Per Household)
        """
        severity = SeverityDeterminer.determine_severity(
            houses_damaged=houses_damaged,
            affected_population=affected_population
        )
        
        # Determine repair cost based on severity
        if severity == SeverityLevel.SEVERE:
            repair_cost_range = StrongWindsCosts.repair_cost_per_house_severe
        elif severity == SeverityLevel.MODERATE:
            repair_cost_range = StrongWindsCosts.repair_cost_per_house_moderate
        else:
            repair_cost_range = StrongWindsCosts.repair_cost_per_house_low
        
        repair_cost_per_house = np.random.uniform(*repair_cost_range)
        relief_cost_per_household = np.random.uniform(*StrongWindsCosts.relief_cost_per_household)
        
        # Calculate total cost
        structural_repair_cost = houses_damaged * repair_cost_per_house
        relief_supplies_cost = affected_households * relief_cost_per_household
        
        total_cost = structural_repair_cost + relief_supplies_cost
        
        return total_cost, severity
    
    
    @staticmethod
    def calculate_heavy_rainfall_cost(
        houses_damaged: int,
        affected_households: int,
        affected_population: int,
        rainfall_intensity: float = 0.5
    ) -> Tuple[float, SeverityLevel]:
        """
        Calculate cost for heavy rainfall disaster
        
        Total Cost = (Houses Damaged × Repair Cost Per House)
                   + (Infrastructure Cost)
                   + (Affected Population × Relief Cost Per Person)
        """
        severity = SeverityDeterminer.determine_severity(
            houses_damaged=houses_damaged,
            affected_population=affected_population,
            rainfall_intensity=rainfall_intensity
        )
        
        # Determine house repair cost based on severity
        if severity == SeverityLevel.SEVERE:
            house_repair_range = HeavyRainfallCosts.repair_cost_per_house_moderate
        elif severity == SeverityLevel.MODERATE:
            house_repair_range = HeavyRainfallCosts.repair_cost_per_house_moderate
        else:
            house_repair_range = HeavyRainfallCosts.repair_cost_per_house_low
        
        # Determine infrastructure cost based on severity
        if severity == SeverityLevel.SEVERE:
            infrastructure_range = HeavyRainfallCosts.infrastructure_severe
        elif severity == SeverityLevel.MODERATE:
            infrastructure_range = HeavyRainfallCosts.infrastructure_moderate
        else:
            infrastructure_range = HeavyRainfallCosts.infrastructure_low
        
        house_repair_cost = houses_damaged * np.random.uniform(*house_repair_range)
        infrastructure_cost = np.random.uniform(*infrastructure_range)
        relief_cost = affected_population * np.random.uniform(*HeavyRainfallCosts.relief_cost_per_person)
        
        total_cost = house_repair_cost + infrastructure_cost + relief_cost
        
        return total_cost, severity
    
    
    @staticmethod
    def calculate_drought_cost(
        affected_households: int,
        affected_population: int,
        duration_months: int = 6
    ) -> Tuple[float, SeverityLevel]:
        """
        Calculate cost for drought disaster
        
        Total Cost = (Affected Population × Food Support Cost Per Person)
                   + (Affected Households × Water Support Cost)
                   + (Agriculture Recovery Fund)
        """
        severity = SeverityDeterminer.determine_severity(
            affected_population=affected_population
        )
        
        # Food support (adjusted for duration)
        food_support_base = np.random.uniform(*DroughtCosts.food_support_per_person)
        food_support_cost = affected_population * food_support_base * (duration_months / 6)
        
        # Water support
        water_support_cost = affected_households * np.random.uniform(*DroughtCosts.water_support_per_household)
        
        # Agriculture recovery based on severity
        if severity == SeverityLevel.SEVERE:
            agriculture_recovery = np.random.uniform(
                DroughtCosts.agriculture_recovery_severe_low,
                DroughtCosts.agriculture_recovery_severe_high
            )
        elif severity == SeverityLevel.MODERATE:
            agriculture_recovery = DroughtCosts.agriculture_recovery_moderate
        else:
            agriculture_recovery = DroughtCosts.agriculture_recovery_low
        
        total_cost = food_support_cost + water_support_cost + agriculture_recovery
        
        return total_cost, severity


class SyntheticDataGenerator:
    """Generates synthetic disaster data for model training"""
    
    DISTRICTS = [
        "Berea", "Butha-Buthe", "Leribe", "Mafeteng", 
        "Maseru", "Mohale's Hoek", "Mokhotlong", "Qacha's Nek", "Quthing", "Thaba-Tseka"
    ]
    
    DISASTER_TYPES = ["Strong Winds", "Heavy Rainfall", "Drought"]
    
    @staticmethod
    def generate_dataset(n_samples: int = 500, seed: int = 42) -> pd.DataFrame:
        """
        Generate synthetic disaster dataset
        
        Args:
            n_samples: Number of samples to generate
            seed: Random seed for reproducibility
        
        Returns:
            DataFrame with disaster data and calculated costs
        """
        np.random.seed(seed)
        data = []
        
        for _ in range(n_samples):
            # Random disaster type
            disaster_type = np.random.choice(SyntheticDataGenerator.DISASTER_TYPES)
            district = np.random.choice(SyntheticDataGenerator.DISTRICTS)
            
            # Random base metrics
            affected_population = np.random.randint(500, 50000)
            affected_households = np.random.randint(100, 10000)
            
            # Disaster-specific metrics
            if disaster_type == "Strong Winds":
                houses_damaged = np.random.randint(0, max(1, affected_households // 10))
                rainfall_intensity = 0
                duration_months = 0
                immediate_needs = np.random.choice(["Shelter", "Relief Supplies", "Medical Aid"])
                
                cost, severity = DisasterCostCalculator.calculate_strong_winds_cost(
                    houses_damaged, affected_households, affected_population, immediate_needs
                )
            
            elif disaster_type == "Heavy Rainfall":
                houses_damaged = np.random.randint(0, max(1, affected_households // 8))
                rainfall_intensity = np.random.uniform(0.3, 1.0)
                duration_months = 0
                immediate_needs = "Infrastructure & Relief"
                
                cost, severity = DisasterCostCalculator.calculate_heavy_rainfall_cost(
                    houses_damaged, affected_households, affected_population, rainfall_intensity
                )
            
            else:  # Drought
                houses_damaged = 0
                rainfall_intensity = 0
                duration_months = np.random.randint(3, 12)
                immediate_needs = "Food & Water Relief"
                
                cost, severity = DisasterCostCalculator.calculate_drought_cost(
                    affected_households, affected_population, duration_months
                )
            
            data.append({
                'Disaster_Type': disaster_type,
                'District': district,
                'Severity': severity.value,
                'Affected_Population': affected_population,
                'Affected_Households': affected_households,
                'Houses_Damaged': houses_damaged,
                'Immediate_Needs': immediate_needs,
                'Duration_Days': np.random.randint(1, 180) if disaster_type != "Drought" else duration_months * 30,
                'Estimated_Cost_Maloti': cost
            })
        
        return pd.DataFrame(data)


if __name__ == "__main__":
    print("🔹 DMIS Disaster Cost Forecasting Model")
    print("=" * 60)
    
    # Generate synthetic dataset
    print("\n📊 Generating synthetic dataset...")
    df = SyntheticDataGenerator.generate_dataset(n_samples=500)
    
    # Display dataset info
    print(f"\n✓ Generated {len(df)} disaster records")
    print(f"\n📈 Dataset Summary:\n")
    print(df.head(10))
    print(f"\n📊 Statistics by Disaster Type:\n")
    print(df.groupby('Disaster_Type')['Estimated_Cost_Maloti'].describe().round(2))
    print(f"\n📊 Statistics by Severity:\n")
    print(df.groupby('Severity')['Estimated_Cost_Maloti'].describe().round(2))
    
    # Save dataset
    output_path = "data/disaster_costs_synthetic.csv"
    df.to_csv(output_path, index=False)
    print(f"\n✓ Dataset saved to {output_path}")
