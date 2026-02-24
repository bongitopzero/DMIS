"""
Data Visualization and Analysis for Disaster Costs
Creates visualizations and statistical analysis of disaster data
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path


class DisasterDataAnalyzer:
    """Analyzes and visualizes disaster cost data"""
    
    def __init__(self, data_path: str = "data/disaster_costs_synthetic.csv"):
        """Initialize analyzer"""
        self.data_path = data_path
        self.df = None
        self.fig_dir = "figures"
        Path(self.fig_dir).mkdir(exist_ok=True)
        
        # Set style
        sns.set_style("whitegrid")
        plt.rcParams['figure.figsize'] = (12, 6)
    
    def load_data(self):
        """Load the dataset"""
        self.df = pd.read_csv(self.data_path)
        print(f"✓ Loaded {len(self.df)} records")
    
    def print_statistics(self):
        """Print comprehensive statistics"""
        print("\n" + "="*80)
        print("📊 DISASTER COST STATISTICS")
        print("="*80)
        
        print(f"\n💰 Overall Cost Statistics:")
        print(f"  Mean Cost: M{self.df['Estimated_Cost_Maloti'].mean():,.2f}")
        print(f"  Median Cost: M{self.df['Estimated_Cost_Maloti'].median():,.2f}")
        print(f"  Std Dev: M{self.df['Estimated_Cost_Maloti'].std():,.2f}")
        print(f"  Min Cost: M{self.df['Estimated_Cost_Maloti'].min():,.2f}")
        print(f"  Max Cost: M{self.df['Estimated_Cost_Maloti'].max():,.2f}")
        
        print(f"\n🌍 By Disaster Type:")
        type_stats = self.df.groupby('Disaster_Type')['Estimated_Cost_Maloti'].agg([
            ('Count', 'count'),
            ('Mean (M)', 'mean'),
            ('Median (M)', 'median'),
            ('Max (M)', 'max')
        ]).round(0)
        print(type_stats)
        
        print(f"\n⚠️  By Severity:")
        severity_stats = self.df.groupby('Severity')['Estimated_Cost_Maloti'].agg([
            ('Count', 'count'),
            ('Mean (M)', 'mean'),
            ('Median (M)', 'median'),
            ('Max (M)', 'max')
        ]).round(0)
        print(severity_stats)
        
        print(f"\n🏘️  Top 5 Districts by Average Cost:")
        district_costs = self.df.groupby('District')['Estimated_Cost_Maloti'].agg([
            ('Count', 'count'),
            ('Avg Cost (M)', 'mean')
        ]).sort_values('Avg Cost (M)', ascending=False).head()
        print(district_costs.round(0))
    
    def plot_cost_distribution(self):
        """Plot cost distribution across disaster types"""
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))
        
        # Box plot
        self.df.boxplot(column='Estimated_Cost_Maloti', by='Disaster_Type', ax=axes[0])
        axes[0].set_title('Cost Distribution by Disaster Type')
        axes[0].set_xlabel('Disaster Type')
        axes[0].set_ylabel('Estimated Cost (Maloti)')
        axes[0].get_figure().suptitle('')
        
        # Violin plot
        sns.violinplot(data=self.df, x='Disaster_Type', y='Estimated_Cost_Maloti', ax=axes[1])
        axes[1].set_title('Cost Distribution (Violin Plot)')
        axes[1].set_xlabel('Disaster Type')
        axes[1].set_ylabel('Estimated Cost (Maloti)')
        
        plt.tight_layout()
        plt.savefig(f"{self.fig_dir}/01_cost_distribution.png", dpi=300, bbox_inches='tight')
        print(f"✓ Saved: {self.fig_dir}/01_cost_distribution.png")
        plt.close()
    
    def plot_severity_analysis(self):
        """Analyze costs by severity and disaster type"""
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))
        
        # Severity distribution
        severity_order = ['Low', 'Moderate', 'Severe']
        sns.boxplot(data=self.df, x='Severity', y='Estimated_Cost_Maloti', 
                   order=severity_order, ax=axes[0])
        axes[0].set_title('Cost by Severity Level')
        axes[0].set_ylabel('Estimated Cost (Maloti)')
        
        # Heatmap of mean costs
        pivot_data = self.df.pivot_table(
            values='Estimated_Cost_Maloti',
            index='Severity',
            columns='Disaster_Type',
            aggfunc='mean'
        )
        pivot_data = pivot_data.reindex(severity_order)
        sns.heatmap(pivot_data, annot=True, fmt='.0f', cmap='YlOrRd', ax=axes[1],
                   cbar_kws={'label': 'Average Cost (Maloti)'})
        axes[1].set_title('Average Cost Heatmap')
        
        plt.tight_layout()
        plt.savefig(f"{self.fig_dir}/02_severity_analysis.png", dpi=300, bbox_inches='tight')
        print(f"✓ Saved: {self.fig_dir}/02_severity_analysis.png")
        plt.close()
    
    def plot_impact_factors(self):
        """Analyze relationship between impact factors and costs"""
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        # Population vs Cost
        axes[0, 0].scatter(self.df['Affected_Population'], self.df['Estimated_Cost_Maloti'], 
                          alpha=0.6, c=self.df['Disaster_Type'].astype('category').cat.codes)
        axes[0, 0].set_xlabel('Affected Population')
        axes[0, 0].set_ylabel('Estimated Cost (Maloti)')
        axes[0, 0].set_title('Population vs Cost')
        axes[0, 0].grid(True, alpha=0.3)
        
        # Houses Damaged vs Cost
        axes[0, 1].scatter(self.df['Houses_Damaged'], self.df['Estimated_Cost_Maloti'],
                          alpha=0.6, c=self.df['Disaster_Type'].astype('category').cat.codes)
        axes[0, 1].set_xlabel('Houses Damaged')
        axes[0, 1].set_ylabel('Estimated Cost (Maloti)')
        axes[0, 1].set_title('Houses Damaged vs Cost')
        axes[0, 1].grid(True, alpha=0.3)
        
        # Households vs Cost
        axes[1, 0].scatter(self.df['Affected_Households'], self.df['Estimated_Cost_Maloti'],
                          alpha=0.6, c=self.df['Disaster_Type'].astype('category').cat.codes)
        axes[1, 0].set_xlabel('Affected Households')
        axes[1, 0].set_ylabel('Estimated Cost (Maloti)')
        axes[1, 0].set_title('Households vs Cost')
        axes[1, 0].grid(True, alpha=0.3)
        
        # Duration vs Cost
        axes[1, 1].scatter(self.df['Duration_Days'], self.df['Estimated_Cost_Maloti'],
                          alpha=0.6, c=self.df['Disaster_Type'].astype('category').cat.codes)
        axes[1, 1].set_xlabel('Duration (Days)')
        axes[1, 1].set_ylabel('Estimated Cost (Maloti)')
        axes[1, 1].set_title('Duration vs Cost')
        axes[1, 1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(f"{self.fig_dir}/03_impact_factors.png", dpi=300, bbox_inches='tight')
        print(f"✓ Saved: {self.fig_dir}/03_impact_factors.png")
        plt.close()
    
    def plot_district_analysis(self):
        """Analyze costs by district"""
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))
        
        # District costs
        district_data = self.df.groupby('District')['Estimated_Cost_Maloti'].mean().sort_values()
        district_data.plot(kind='barh', ax=axes[0], color='steelblue')
        axes[0].set_title('Average Cost by District')
        axes[0].set_xlabel('Average Cost (Maloti)')
        
        # Event count by district
        event_count = self.df.groupby('District').size().sort_values()
        event_count.plot(kind='barh', ax=axes[1], color='coral')
        axes[1].set_title('Number of Disaster Events by District')
        axes[1].set_xlabel('Count')
        
        plt.tight_layout()
        plt.savefig(f"{self.fig_dir}/04_district_analysis.png", dpi=300, bbox_inches='tight')
        print(f"✓ Saved: {self.fig_dir}/04_district_analysis.png")
        plt.close()
    
    def plot_disaster_type_breakdown(self):
        """Detailed breakdown by disaster type"""
        disaster_types = self.df['Disaster_Type'].unique()
        fig, axes = plt.subplots(1, 3, figsize=(15, 4))
        
        for idx, dtype in enumerate(disaster_types):
            data = self.df[self.df['Disaster_Type'] == dtype]['Estimated_Cost_Maloti']
            axes[idx].hist(data, bins=30, color='steelblue', edgecolor='black', alpha=0.7)
            axes[idx].set_title(f'{dtype} Cost Distribution')
            axes[idx].set_xlabel('Estimated Cost (Maloti)')
            axes[idx].set_ylabel('Frequency')
            axes[idx].grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(f"{self.fig_dir}/05_disaster_type_breakdown.png", dpi=300, bbox_inches='tight')
        print(f"✓ Saved: {self.fig_dir}/05_disaster_type_breakdown.png")
        plt.close()
    
    def generate_correlation_matrix(self):
        """Generate correlation matrix"""
        fig, ax = plt.subplots(figsize=(10, 8))
        
        # Select numeric columns
        numeric_cols = ['Affected_Population', 'Affected_Households', 'Houses_Damaged',
                       'Duration_Days', 'Estimated_Cost_Maloti']
        corr_matrix = self.df[numeric_cols].corr()
        
        sns.heatmap(corr_matrix, annot=True, fmt='.2f', cmap='coolwarm', center=0,
                   square=True, ax=ax, cbar_kws={'label': 'Correlation'})
        ax.set_title('Feature Correlation Matrix')
        
        plt.tight_layout()
        plt.savefig(f"{self.fig_dir}/06_correlation_matrix.png", dpi=300, bbox_inches='tight')
        print(f"✓ Saved: {self.fig_dir}/06_correlation_matrix.png")
        plt.close()
    
    def run_analysis(self):
        """Run complete analysis pipeline"""
        print("📊 Starting Data Analysis Pipeline")
        print("="*80)
        
        self.load_data()
        self.print_statistics()
        
        print("\n🎨 Generating visualizations...")
        self.plot_cost_distribution()
        self.plot_severity_analysis()
        self.plot_impact_factors()
        self.plot_district_analysis()
        self.plot_disaster_type_breakdown()
        self.generate_correlation_matrix()
        
        print(f"\n✅ Analysis complete! Figures saved to {self.fig_dir}/")


if __name__ == "__main__":
    analyzer = DisasterDataAnalyzer()
    analyzer.run_analysis()
