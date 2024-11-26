# app.py

import streamlit as st
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from policyengine_us import Simulation
from situation import create_situation

STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 
    'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 
    'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 
    'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 
    'WI', 'WY', 'DC'
]

st.title("Charity Donation Calculator")

# State selector
state = st.selectbox("Select your state", options=STATES)

# Input for income
income = st.number_input(
    "Annual income ($)",
    min_value=0,
    max_value=1000000,
    value=50000,
    step=1000
)

# Marital status
is_married = st.checkbox("Are you married?")

# Income reduction target
reduction_amount = st.number_input(
    "How much would you like to lower your income by? ($)",
    min_value=0,
    max_value=income,
    value=min(10000, income),
    step=1000
)

if st.button("Calculate"):
    # Calculate for single income point
    situation = create_situation(income, is_married=is_married, state_code=state)
    simulation = Simulation(situation=situation)
    
    net_income_by_donation = simulation.calculate("household_net_income")
    donations = simulation.calculate("charitable_cash_donations")
    
    # Create DataFrame for analysis and round values
    df = pd.DataFrame({
        "charitable_cash_donations": np.round(donations),
        "net_income": np.round(net_income_by_donation),
    })
    
    df["net_income_after_donations"] = np.round(df.net_income - df.charitable_cash_donations)
    baseline_net_income = df.net_income_after_donations.iloc[0]
    
    # Calculate change in net income
    df["net_income_change"] = baseline_net_income - df["net_income_after_donations"]
    
    target_net_income = np.round(baseline_net_income - reduction_amount)
    
    # Find closest match to target net income
    df["distance_to_target"] = np.abs(df.net_income_after_donations - target_net_income)
    required_donation = int(np.round(df.loc[df.distance_to_target.idxmin(), "charitable_cash_donations"]))
    
    # First display the required donation prominently
    st.write(f"Required donation: ${required_donation:,}")
    actual_final_income = int(np.round(df.loc[df.distance_to_target.idxmin(), "net_income_after_donations"]))
    actual_income_change = int(np.round(df.loc[df.distance_to_target.idxmin(), "net_income_change"]))

    # Create graph showing net income change vs donations
    fig = px.line(
        df,
        x="charitable_cash_donations",
        y="net_income_change",
        labels={
            "charitable_cash_donations": "Donation Amount ($)",
            "net_income_change": "Net Income Reduction ($)"
        },
        title=f"Net Income Reduction vs Donations for ${income:,} income in {state}"
    )
    
    # Add point for the required donation
    fig.add_trace(
        go.Scatter(
            x=[required_donation],
            y=[actual_income_change],
            mode="markers",
            name="Required Donation",
            marker=dict(
                size=10,
                color="red",
                symbol="circle"
            ),
        )
    )
    
    # Set axis ranges to start at 0
    fig.update_layout(
        xaxis_tickformat="$,",
        yaxis_tickformat="$,",
        xaxis_range=[0, max(df.charitable_cash_donations)],
        yaxis_range=[0, max(df.net_income_change)],
        xaxis=dict(
            zeroline=True,
            zerolinewidth=2,
            zerolinecolor='black'
        ),
        yaxis=dict(
            zeroline=True,
            zerolinewidth=2,
            zerolinecolor='black'
        )
    )
    
    st.plotly_chart(fig)

    
    # Create table with all other information
    results_df = pd.DataFrame({
        'Metric': [
            'Household net income without donations',
            'Target net income',
            'Actual net income after donation',
            'Net income reduction'
        ],
        'Amount': [
            f"${int(baseline_net_income):,}",
            f"${int(target_net_income):,}",
            f"${int(actual_final_income):,}",
            f"${int(actual_income_change):,}"
        ]
    }).set_index('Metric')
    
    # Display the table
    st.table(results_df)