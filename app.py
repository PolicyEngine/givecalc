from policyengine_us import Simulation
import streamlit as st
import numpy as np

# This is an app which tells people how much money they'd need to donate to lower their net income (after taxes and benefits) by x%.

# First, the title, subtitle and introduction.

st.title("How much should I donate to charity?")
st.subheader("A tool to help you decide how much to donate to charity")

st.write("This tool will tell you how much you should donate to charity to lower your net income by a certain amount. It's based on the [PolicyEngine](https://policyengine.org) project, which is an open-source tool for exploring the effects of tax and benefit policies.")

# Now, we ask the user for their income and the amount they want to lower it by.

income_params = dict(min_value=0, max_value=1000000, step=1000)
user_income = st.number_input("What is your annual income?", **income_params, value=50000)

marital_status = st.selectbox("Marital status", ["single", "married"])

if marital_status == 'married':
    spouse_income = st.number_input("What is your spouse's annual income?", **income_params, value=0)

# Give people the option of inputting a percent or absolute amount to lower their net income by.

lower_by = st.selectbox("Lower my net income by", ["a percentage", "an absolute amount"])

if lower_by == "a percentage":
    lower_by_amount = st.number_input("Lower my net income by what percentage?", min_value=0, max_value=100, value=10, step=1)
    lower_by_amount = user_income * lower_by_amount / 100
else:
    lower_by_amount = st.number_input("Lower my net income by what amount?", min_value=0, max_value=1000000, value=10000, step=1000)


people = dict(
    person=dict(employment_income={2022: user_income})
)
people_names = ["person"]

if marital_status == 'married':
    people['spouse'] = dict(employment_income={2022: spouse_income})
    people_names.append("spouse")

simulation = Simulation(
    situation=dict(
        people=people,
        tax_units=dict(
            tax_unit=dict(
                premium_tax_credit={2022: 0},
                members=people_names,
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
donations = np.reshape(simulation.calculate("charitable_cash_donations"), (len(people_names), 101))[0]

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

for i, net_income in enumerate(net_income_by_donation):
    if net_income - donations[i] - net_income_by_donation[0] <= -lower_by_amount:
        break

st.write(f"You should donate {donations[i]:,.0f} to charity to lower your net income by ${lower_by_amount:,.0f}.")