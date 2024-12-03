import streamlit as st
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from policyengine_us import Simulation
from situation import create_situation
from policyengine_core.charts import format_fig

# This is an app which tells people how much money they'd need to donate to
# lower their net income (after taxes and benefits) by a given percent.

st.title("Charity Donation Calculator")

st.title("GiveCalc")
st.subheader("Make your giving consistent")

st.write(
    "GiveCalc suggests a donation amount that lowers your net income by a given percentage, using [PolicyEngine](https://policyengine.org)'s open source tax and benefit calculator."
)

# Add a visual separator
st.divider()

income_params = dict(min_value=0, max_value=1000000, step=1000)
user_income = st.number_input(
    "How much do you earn?", **income_params, value=50000
)

marital_status = st.selectbox(
    "What's your marital status?", ["single", "married"]
)

if marital_status == "married":
    spouse_income = st.number_input(
        "How much does your spouse earn?", **income_params, value=0
    )

percent = st.number_input(
    "What percent do you want to give?",
    min_value=0,
    max_value=100,
    value=10,
    step=1,
)

people = dict(person=dict(employment_income={2022: user_income}))
people_names = ["person"]
total_income = user_income

if marital_status == "married":
    people["spouse"] = dict(employment_income={2022: spouse_income})
    people_names.append("spouse")
    total_income += spouse_income

INCREMENTS = 1_001

simulation = Simulation(
    situation=dict(
        people=people,
        tax_units=dict(
            tax_unit=dict(
                premium_tax_credit={2022: 0},
                members=people_names,
            )
        ),
        axes=[
            [
                dict(
                    name="charitable_cash_donations",
                    min=0,
                    max=total_income,
                    count=INCREMENTS,
                )
            ]
        ],
    ),
)

net_income_by_donation = simulation.calculate("household_net_income")
donations = np.reshape(
    simulation.calculate("charitable_cash_donations"),
    (len(people_names), INCREMENTS),
)[0]

# Find the donation amount which gives the desired net income.

import pandas as pd

df = pd.DataFrame(
    dict(
        charitable_cash_donations=donations,
        net_income=net_income_by_donation,
    )

    medical_expenses = st.number_input(
        "Annual medical out-of-pocket expenses ($)",
        min_value=0,
        max_value=100000,
        value=0,
        step=500,
    )

    casualty_loss = st.number_input(
        "Casualty and theft losses ($)",
        min_value=0,
        max_value=100000,
        value=0,
        step=500,
    )


# Direct donation input
donation_amount = st.number_input(
    "How much would you like to donate? ($)",
    min_value=0,
    max_value=income,
    value=min(10000, income),
    step=1000,
    help="Enter the amount of cash donations you plan to make to charity",
)

if st.button("Calculate"):
    # Create baseline simulation with zero donations - we only need to do this once
    baseline_situation = create_situation(
        income,
        is_married=is_married,
        state_code=state,
        num_children=num_children,
        mortgage_interest=mortgage_interest,
        real_estate_taxes=real_estate_taxes,
        medical_out_of_pocket_expenses=medical_expenses,
        casualty_loss=casualty_loss,
    )
    baseline_simulation = Simulation(situation=baseline_situation)
    baseline_income_tax = baseline_simulation.calculate("income_tax")[0]
    baseline_net_income = baseline_simulation.calculate("household_net_income", 2024)[0]

    # Define simulation parameters
    num_points = 100  # Number of points to calculate
    max_donation = income  # Maximum donation amount (changed from min(income, 100000))
    donations = np.linspace(0, max_donation, num_points)

def linear_approx(x1, y1, x2, y2, goal_y):
    """
    x1: lower_bound_donation_amount
    y1: lower_bound_percentage
    x2: upper_bound_donation_amount
    y2: upper_buond_income
    goal_y: the desired income percentage
    """
    return int(x1 + (x2 - x1) * (goal_y - y1) / (y2 - goal_y))


def get_desired_donation_amount(
    df,
    giving_percent,
    linear_approximation=True,
    medium=False,
):
    remaining_income = 1 - giving_percent
    # maybe can split into another function
    upper_bound_donation = (
        df[df.percent_change_to_net_income >= remaining_income]
        .tail(1)
        .charitable_cash_donations.iloc[0]
    )
    lower_bound_donation = (
        df[df.percent_change_to_net_income < remaining_income]
        .head(1)
        .charitable_cash_donations.iloc[0]
    )

    if medium:
        return (
            upper_bound_donation - lower_bound_donation
        ) // 2 + lower_bound_donation

    if linear_approximation:
        upper_bound_percentage = (
            df[df.percent_change_to_net_income >= remaining_income]
            .tail(1)
            .percent_change_to_net_income.iloc[0]
        )
        lower_bound_percentage = (
            df[df.percent_change_to_net_income < remaining_income]
            .head(1)
            .percent_change_to_net_income.iloc[0]
        )

        return linear_approx(
            lower_bound_donation,
            lower_bound_percentage,
            upper_bound_donation,
            upper_bound_percentage,
            giving_percent,
        )


donation_amount = get_desired_donation_amount(df, percent / 100)

import plotly.express as px

zero_row = df.loc[df["percent_change_to_net_income"] >= 0].iloc[-1:]
max_x = float(zero_row["charitable_cash_donations"])

fig = px.line(
    df, "charitable_cash_donations", "percent_change_to_net_income"
).update_layout(
    title="Net income after taxes, benefits and donations",
    xaxis_title="Donation amount",
    yaxis_title="Net income",
    yaxis_tickformat=".2f",
    xaxis_tickformat="$,.0f",
    yaxis_range=[0, 1],
    xaxis_range=[0, max_x],
)

fig.add_trace(
    go.Scatter(x=[donation_amount], y=[1 - percent / 100], mode="markers")
)

st.write(f"You should donate ${donation_amount} to charity.")

st.write(fig)
