"""
DMIS AI Project - Main Entry Point
Disaster Cost Forecasting Model
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

def main():
    print("✓ Welcome to DMIS AI Project")
    print("✓ Environment is working correctly!")
    print(f"✓ pandas version: {pd.__version__}")
    print(f"✓ scikit-learn version: {__import__('sklearn').__version__}")
    print("\nAll dependencies loaded successfully. Ready to build the forecasting model!")

if __name__ == "__main__":
    main()
