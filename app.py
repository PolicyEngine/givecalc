# app.py

import streamlit as st
import numpy as np
import plotly.express as px
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
    # Calculate donations across income range
    incomes = np.linspace(0, 1000000, 51)  # 51 points for smooth graph
    required_donations = []
    baseline_net_incomes = []
    final_net_incomes = []
    
    for test_income in incomes:
        situation = create_situation(test_income, is_married=is_married, state_code=state)
        simulation = Simulation(situation=situation)
        
        # Get net income for each donation amount
        net_incomes = simulation.calculate("household_net_income")
        baseline_net_income = net_incomes[0]  # net income with zero donations
        baseline_net_incomes.append(baseline_net_income)
        
        # Calculate target net income by subtracting the fixed reduction amount
        target_net_income = baseline_net_income - reduction_amount
        
        # Get donations array
        donations = simulation.calculate("charitable_cash_donations")
        
        # Calculate net income after donations
        net_income_after_donations = net_incomes - donations
        
        # Find donation amount that gets us closest to target
        closest_index = np.abs(net_income_after_donations - target_net_income).argmin()
        required_donation = donations[closest_index]
        required_donations.append(required_donation)
        final_net_incomes.append(net_income_after_donations[closest_index])
        
        # Print details for the selected income level
        if abs(test_income - income) < 0.01:  # Check if this is the user's input income
            st.write(f"For income ${test_income:,.2f}:")
            st.write(f"Household net income without donations: ${baseline_net_income:,.2f}")
            st.write(f"Household net income with donations: ${net_income_after_donations[closest_index]:,.2f}")
            st.write(f"Required donation: ${required_donation:,.2f}")
    
    # Create graph
    fig = px.line(
        x=incomes,
        y=required_donations,
        labels={
            "x": "Annual Income ($)",
            "y": "Required Donation ($)"
        },
        title=f"Required Donations to Reduce Income by ${reduction_amount:,.0f} in {state}"
    )
    
    fig.update_layout(
        xaxis_tickformat="$,",
        yaxis_tickformat="$,",
    )
    
    st.plotly_chart(fig)