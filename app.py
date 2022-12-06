from policyengine_us import Simulation
import streamlit as st
import numpy as np

# This is an app which tells people how much money they'd need to donate to lower their net income (after taxes and benefits) by x%.

# First, the title, subtitle and introduction.

st.title("How much should I donate to charity?")
st.subheader("A tool to help you decide how much to donate to charity")

st.write(
    "This tool will tell you how much you should donate to charity to lower your net income by a certain amount. It's based on the [PolicyEngine](https://policyengine.org) project, which is an open-source tool for exploring the effects of tax and benefit policies."
)

# Now, we ask the user for their income and the amount they want to lower it by.

income_params = dict(min_value=0, max_value=1000000, step=1000)
user_income = st.number_input(
    "What is your annual income?", **income_params, value=50000
)

marital_status = st.selectbox("Marital status", ["single", "married"])

if marital_status == "married":
    spouse_income = st.number_input(
        "What is your spouse's annual income?", **income_params, value=0
    )

# Give people the option of inputting a percent or absolute amount to lower their net income by.

lower_by = st.selectbox(
    "Lower my net income by", ["a percentage", "an absolute amount"]
)

if lower_by == "a percentage":
    lower_by_amount = st.number_input(
        "Lower my net income by what percentage?",
        min_value=0,
        max_value=100,
        value=10,
        step=1,
    )
    lower_by_amount = user_income * lower_by_amount / 100
else:
    lower_by_amount = st.number_input(
        "Lower my net income by what amount?",
        min_value=0,
        max_value=1000000,
        value=10000,
        step=1000,
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
)

df["net_income_after_donations"] = df.net_income - df.charitable_cash_donations
df["percent_change_to_net_income"] = (
    df.net_income_after_donations / df.net_income_after_donations[0]
)


def linear_approx(x1, y1, x2, y2, goal_y=0.9):
    """
    x1: lower_bound_donation_amount
    y1: lower_bound_percentage
    x2: upper_bound_donation_amount
    y2: upper_buond_income
    goal_y: the desired income percentage, typically 90% (because donate 10%)
    """
    return int(x1 + (x2 - x1) * (goal_y - y1) / (y2 - goal_y))


def get_desired_donation_amount(
    df,
    linear_approximation=True,
    medium=False,
    desired_income_perccentage=0.9,
):
    # maybe can split into another function
    upper_bound_donation = (
        df[df.percent_change_to_net_income >= 0.9]
        .tail(1)
        .charitable_cash_donations.iloc[0]
    )
    lower_bound_donation = (
        df[df.percent_change_to_net_income < 0.9]
        .head(1)
        .charitable_cash_donations.iloc[0]
    )

    if medium:
        return (
            upper_bound_donation - lower_bound_donation
        ) // 2 + lower_bound_donation

    if linear_approximation:
        upper_bound_percentage = (
            df[df.percent_change_to_net_income >= 0.9]
            .tail(1)
            .percent_change_to_net_income.iloc[0]
        )
        lower_bound_percentage = (
            df[df.percent_change_to_net_income < 0.9]
            .head(1)
            .percent_change_to_net_income.iloc[0]
        )

        return linear_approx(
            lower_bound_donation,
            lower_bound_percentage,
            upper_bound_donation,
            upper_bound_percentage,
            desired_income_perccentage,
        )


donation_amount = get_desired_donation_amount(df)

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
import plotly.graph_objects as go

fig.add_trace(go.Scatter(x=[donation_amount], y=[0.9], mode="markers"))

# fig.add_vline(
#     x=donation_amount, line_width=3, line_dash="dash", line_color="red"
# )

st.write(fig)


st.write(f"You should donate ${donation_amount} to charity.")
