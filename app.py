import streamlit as st
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from policyengine_us import Simulation
from situation import create_situation
from policyengine_core.charts import format_fig

STATES = [
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
    "DC",
]

st.title("Charity Donation Calculator")

st.markdown(
    """
This calculator helps you determine how much you need to donate to charity to achieve a desired reduction in your net income. 
Simply enter your income, state, and desired reduction (either as a dollar amount or percentage), and the calculator will:
- Calculate the required charitable donation
- Show how your net income changes with different donation amounts
- Display the tax implications of your charitable giving
"""
)

# Add a visual separator
st.divider()

# State selector
state = st.selectbox("Select your state", options=STATES)

# Input for income
income = st.number_input(
    "Annual income ($)", min_value=0, max_value=1000000, value=50000, step=1000
)

# Marital status
is_married = st.checkbox("Are you married?")

# Add before the reduction type selector
donation_type = st.radio(
    "Type of charitable donation", ["Cash", "Non-cash"], horizontal=True
)

# Reduction type selector
reduction_type = st.radio(
    "How would you like to specify the income reduction?",
    ["Absolute amount ($)", "Percentage (%)"],
)

# Dynamic input based on reduction type
if reduction_type == "Absolute amount ($)":
    reduction_amount = st.number_input(
        "How much would you like to lower your income by? ($)",
        min_value=0,
        max_value=income,
        value=min(10000, income),
        step=1000,
    )
else:
    reduction_percentage = st.number_input(
        "What percentage of your income would you like to reduce? (%)",
        min_value=0,
        max_value=100,
        value=10,
        step=1,
    )
    reduction_amount = (reduction_percentage / 100) * income

if st.button("Calculate"):
    # Calculate for single income point
    situation = create_situation(
        income,
        is_married=is_married,
        state_code=state,
        donation_type=donation_type.lower().replace("-", "_"),
    )
    simulation = Simulation(situation=situation)

    net_income_by_donation = simulation.calculate("household_net_income")
    donation_column = (
        "charitable_cash_donations"
        if donation_type == "Cash"
        else "charitable_non_cash_donations"
    )
    donations = simulation.calculate(donation_column)

    # Create DataFrame for analysis and round values
    df = pd.DataFrame(
        {
            donation_column: np.round(donations),
            "net_income": np.round(net_income_by_donation),
        }
    )

    df["net_income_after_donations"] = np.round(df.net_income - df[donation_column])
    baseline_net_income = df.net_income_after_donations.iloc[0]

    # Calculate change in net income (both absolute and percentage)
    df["net_income_change"] = baseline_net_income - df["net_income_after_donations"]
    df["net_income_change_pct"] = (df["net_income_change"] / baseline_net_income) * 100

    target_net_income = np.round(baseline_net_income - reduction_amount)

    # Find closest match to target net income
    df["distance_to_target"] = np.abs(df.net_income_after_donations - target_net_income)
    required_donation = int(
        np.round(df.loc[df.distance_to_target.idxmin(), donation_column])
    )

    # Display the reduction type and target
    reduction_percentage_calc = (reduction_amount / income) * 100
    if reduction_type == "Absolute amount ($)":
        st.write(
            f"Target reduction: ${int(reduction_amount):,} ({reduction_percentage_calc:.1f}%)"
        )
    else:
        st.write(
            f"Target reduction: {reduction_percentage}% (${int(reduction_amount):,})"
        )

    # Display the required donation
    st.write(f"Required donation: ${required_donation:,}")

    actual_final_income = int(
        np.round(df.loc[df.distance_to_target.idxmin(), "net_income_after_donations"])
    )
    actual_income_change = int(
        np.round(df.loc[df.distance_to_target.idxmin(), "net_income_change"])
    )
    actual_income_change_pct = float(
        np.round(df.loc[df.distance_to_target.idxmin(), "net_income_change_pct"], 2)
    )

    # Create graph showing net income change vs donations
    if reduction_type == "Absolute amount ($)":
        y_col = "net_income_change"
        y_label = "Net Income Reduction ($)"
        y_tickformat = "$,"
        actual_y = actual_income_change
        y_range = [0, max(df[y_col])]
    else:
        y_col = "net_income_change_pct"
        y_label = "Net Income Reduction (%)"
        y_tickformat = ".1f"
        actual_y = actual_income_change_pct
        y_range = [0, min(100, max(df[y_col]))]

    fig = px.line(
        df,
        x=donation_column,
        y=y_col,
        labels={donation_column: "Donation Amount ($)", y_col: y_label},
        title=f"Net Income Reduction vs Donations for ${income:,} income in {state}",
    )

    # Add marker point for target donation
    fig.add_trace(
        go.Scatter(
            x=[required_donation],
            y=[actual_y],
            mode="markers",
            name="Target Donation",
            marker=dict(color="rgb(99, 110, 250)", size=12, symbol="circle"),
        )
    )

    fig.update_layout(
        xaxis_tickformat="$,",
        yaxis_tickformat=y_tickformat,
        xaxis_range=[0, max(df[donation_column])],
        yaxis_range=y_range,
        xaxis=dict(zeroline=True, zerolinewidth=2, zerolinecolor="black"),
        yaxis=dict(zeroline=True, zerolinewidth=2, zerolinecolor="black"),
    )
    fig = format_fig(fig)
    st.plotly_chart(fig)

    # Create table with all other information
    results_df = pd.DataFrame(
        {
            "Metric": [
                "Household net income without donations",
                "Actual net income after donation",
            ],
            "Amount": [
                f"${int(baseline_net_income):,}",
                f"${int(actual_final_income):,}",
            ],
        }
    ).set_index("Metric")

    # Display the table
    st.table(results_df)

# Add collapsible section for tax program explanations
with st.expander("Learn about state and federal tax programs for charitable giving"):
    st.markdown(
        """
        ### Federal Charitable Deduction
        The federal charitable deduction allows you to deduct charitable contributions from your taxable income if you itemize deductions on your tax return. The deduction is limited to 60% of your adjusted gross income for cash donations.

        ### Arizona Charitable Contributions Credit
        Arizona offers a dollar-for-dollar tax credit for contributions to Qualifying Charitable Organizations (QCOs). Single filers can claim up to \$400, and married filing jointly can claim up to $800. These donations help organizations that serve low-income residents, children with chronic illness, or foster care.
                
        ### Vermont Charitable Contributions Credit
        Vermont offers a tax credit of 5% of the first $20,000 in eligible charitable contributions when claiming the federal charitable contribution deduction.
        
        ### Colorado Charitable Contribution Subtraction
        Colorado allows taxpayers to subtract charitable contributions over $500 from their state taxable income when they claim the federal standard deduction, effectively extending the benefit of charitable giving to non-itemizers.
        
        ### New Hampshire Education Tax Credit
        New Hampshire provides a tax credit of up to 85% of contributions made to approved scholarship organizations. This credit can be used against business profits tax, business enterprise tax, or interest and dividends tax.
    """
    )

# Add a visual separator
st.divider()
