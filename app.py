
from policyengine_us import Simulation
import streamlit as st

# This is an app which tells people how much money they'd need to donate to lower their net income (after taxes and benefits) by x%.

# First, the title, subtitle and introduction.

st.title("How much should I donate to charity?")
st.subheader("A tool to help you decide how much to donate to charity")

st.write("This tool will tell you how much you should donate to charity to lower your net income by a certain amount. It's based on the [PolicyEngine](https://policyengine.org) project, which is an open-source tool for exploring the effects of tax and benefit policies.")

# Now, we ask the user for their income and the amount they want to lower it by.

income = st.number_input("What is your annual income?", min_value=0, max_value=1000000, value=50000, step=1000)

# Give people the option of inputting a percent or absolute amount to lower their net income by.

lower_by = st.selectbox("Lower my net income by", ["a percentage", "an absolute amount"])

if lower_by == "a percentage":
    lower_by_amount = st.number_input("Lower my net income by what percentage?", min_value=0, max_value=100, value=10, step=1)
    lower_by_amount = income * lower_by_amount / 100
else:
    lower_by_amount = st.number_input("Lower my net income by what amount?", min_value=0, max_value=1000000, value=10000, step=1000)

simulation = Simulation(
    situation=dict(
        people=dict(
            person=dict(
                employment_income={2022: income},
            ),
        ),
        tax_units=dict(
            tax_unit=dict(
                premium_tax_credit={2022: 0},
                members=["person"],
            )
        ),
        axes=[[
            dict(
                name="charitable_cash_donations",
                min=0,
                max=lower_by_amount * 2,
                count=101,
            )
        ]]
    ),
)

net_income_by_donation = simulation.calculate("household_net_income")
donations = simulation.calculate("charitable_cash_donations")

import plotly.express as px

fig = px.line(
    x=donations,
    y=net_income_by_donation - donations,
).update_layout(
    title="Net income after taxes, benefits and donations",
    xaxis_title="Donation amount",
    yaxis_title="Net income",
    yaxis_tickformat="$,.0f",
    xaxis_tickformat="$,.0f",
)

st.write(fig)

# Find the donation amount which gives the desired net income.

from policyengine_us import IndividualSim
import pandas as pd
import plotly.express as px

sim = IndividualSim(year=2022)
sim.add_person(name="head", age=25, employment_income = 100_000)
members = ["head"]
# if adults == 2:
#     sim.add_person(name="spouse")
#     members += ["spouse"]
# for i in range(children):
#     child = "child{}".format(i)
#     sim.add_person(name=child, age=6)
#     members += [child]
sim.add_tax_unit(name="tax_unit", members=members, premium_tax_credit=0)
sim.add_household(name="household", members=members)
sim.vary("charitable_cash_donations", max=100_000, step=10)
df = pd.DataFrame(
    dict(
        charitable_cash_donations=sim.calc("charitable_cash_donations")[0],
        net_income=sim.calc("spm_unit_net_income").round()[0],
        # adults=adults,
        # children=str(children)
    )
)

df['net_income_after_donations'] = df.net_income - df.charitable_cash_donations
df["percent_change_to_net_income"] = df.net_income_after_donations / df.net_income_after_donations[0]

def linear_approx(x1, y1, x2, y2, goal_y=0.9):
    '''
    x1: lower_bound_donation_amount
    y1: lower_bound_percentage
    x2: upper_bound_donation_amount
    y2: upper_buond_income
    goal_y: the desired income percentage, typically 90% (because donate 10%)
    '''
    return (x1 + (x2 - x1) * (goal_y - y1)/(y2 - goal_y)).round()

def get_desired_donation_amount(df, linear_approximation=True, medium=False, desired_income_perccentage=0.9, lower_bound=0.895, upper_bound=0.905):
  #maybe can split into another function
  upper_bound_donation = df[df.percent_change_to_net_income >= 0.9].tail(1).charitable_cash_donations.iloc[0]
  lower_bound_donation = df[df.percent_change_to_net_income < 0.9].head(1).charitable_cash_donations.iloc[0]
  
  if medium:
     return (upper_bound_donation - lower_bound_donation) // 2 + lower_bound_donation
  
  if linear_approximation:
    upper_bound_percentage = df[df.percent_change_to_net_income >= 0.9].tail(1).percent_change_to_net_income.iloc[0]
    lower_bound_percentage = df[df.percent_change_to_net_income < 0.9].head(1).percent_change_to_net_income.iloc[0]
    
    return linear_approx(lower_bound_donation, lower_bound_percentage, upper_bound_donation, upper_bound_percentage, desired_income_perccentage)

donation_amount = get_desired_donation_amount(df)



st.write(f"You should donate {donation_amount} to charity.")