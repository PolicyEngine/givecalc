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

# Add after marital status and before donation type
num_children = st.number_input(
    "Number of children",
    min_value=0,
    max_value=10,  # Setting a reasonable maximum
    value=0,
    step=1,
    help="Enter the number of dependent children",
)

# Create collapsible section for itemized deductions
with st.expander("Sources for other itemized deductions", expanded=False):
    st.markdown("Enter your itemized deductions below:")

    mortgage_interest = st.number_input(
        "Annual mortgage interest ($)",
        min_value=0,
        max_value=100000,
        value=0,
        step=1000,
        help="Enter the amount of mortgage interest paid annually",
    )

    real_estate_taxes = st.number_input(
        "Annual real estate taxes ($)",
        min_value=0,
        max_value=50000,
        value=0,
        step=500,
        help="Enter the amount of property taxes paid annually",
    )

    medical_expenses = st.number_input(
        "Annual medical out-of-pocket expenses ($)",
        min_value=0,
        max_value=100000,
        value=0,
        step=500,
        help="Enter the amount of medical expenses paid out of pocket annually",
    )

    casualty_loss = st.number_input(
        "Casualty and theft losses ($)",
        min_value=0,
        max_value=100000,
        value=0,
        step=500,
        help="Enter the amount of casualty and theft losses from federally declared disasters",
    )


# Direct donation input
donation_amount = st.number_input(
    "How much would you like to donate? ($)",
    min_value=0,
    max_value=income,
    value=min(10000, income),
    step=1000,
)

if st.button("Calculate"):
    # Create baseline simulation with zero donations
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

    # Define simulation parameters
    num_points = 100  # Number of points to calculate
    max_donation = income  # Maximum donation amount (changed from min(income, 100000))
    donations = np.linspace(0, max_donation, num_points)

    # Create simulation for varying donation amounts
    situation = create_situation(
        income,
        is_married=is_married,
        state_code=state,
        num_children=num_children,
        mortgage_interest=mortgage_interest,
        real_estate_taxes=real_estate_taxes,
        medical_out_of_pocket_expenses=medical_expenses,
        casualty_loss=casualty_loss,
    )

    # Add axis for donations
    donation_column = "charitable_cash_donations"

    situation["axes"] = [
        [
            {
                "count": num_points,
                "name": donation_column,
                "min": 0,
                "max": max_donation,
                "period": "2023",
            }
        ]
    ]

    simulation = Simulation(situation=situation)
    income_tax_by_donation = simulation.calculate("federal_state_income_tax").reshape(-1)

    # Create DataFrame with calculations
    df = pd.DataFrame(
        {
            donation_column: donations,
            "income_tax": income_tax_by_donation,
        }
    )

    # Calculate net income changes relative to baseline
    df["income_tax_after_donations"] = df.income_tax
    df["income_tax_change"] = baseline_income_tax - df["income_tax_after_donations"]
    df["income_tax_change_pct"] = (df["income_tax_change"] / income) * 100

    # Find required donation
    target_income_tax = baseline_income_tax - donation_amount
    df["distance_to_target"] = np.abs(df.income_tax_after_donations - target_income_tax)
    closest_match_idx = df.distance_to_target.idxmin()

    # Get values for display
    required_donation = int(np.round(df.loc[closest_match_idx, donation_column]))
    actual_final_income = int(
        np.round(df.loc[closest_match_idx, "income_tax_after_donations"])
    )
    actual_income_change = int(np.round(df.loc[closest_match_idx, "income_tax_change"]))
    actual_income_change_pct = float(
        np.round(df.loc[closest_match_idx, "income_tax_change_pct"], 2)
    )

    # Calculate and display the tax reduction percentage
    tax_at_zero_donation = df.loc[0, "income_tax_after_donations"]  # Tax amount with no donations
    donation_idx = np.abs(df[donation_column] - donation_amount).idxmin()  # Find closest index to donation amount
    tax_at_target = df.loc[donation_idx, "income_tax_after_donations"]  # Tax amount at target donation
    tax_reduction_pct = ((tax_at_zero_donation - tax_at_target) / tax_at_zero_donation) * 100
    st.write(f"Your ${donation_amount:,} donation reduces your taxes by {tax_reduction_pct:.1f}%")

    # Create graph showing taxes after donations
    y_col = "income_tax_after_donations"
    y_label = "Income Tax After Donations ($)"
    y_tickformat = "$,"
    actual_y = actual_final_income
    y_range = [0, baseline_income_tax]  # Changed to start at 0 and end at baseline
    hover_template = (
        "Donation Amount ($)=$%{x:,.0f}<br>"
        + "Income Tax ($)=$%{y:,.0f}<br>"
        + "<extra></extra>"
    )

    fig = px.line(
        df,
        x=donation_column,
        y=y_col,
        labels={donation_column: "Donation Amount ($)", y_col: y_label},
        title=f"Income Tax vs Donations for ${income:,} income in {state}",
    )

    # Update hover template based on reduction type
    fig.update_traces(hovertemplate=hover_template)

    # Find the tax amount corresponding to the input donation amount
    donation_idx = np.abs(df[donation_column] - donation_amount).idxmin()
    tax_at_donation = df.loc[donation_idx, "income_tax_after_donations"]

    # Add marker point for target donation with rounded value
    fig.add_trace(
        go.Scatter(
            x=[donation_amount],
            y=[tax_at_donation],
            mode="markers",
            name="Target Donation",
            marker=dict(color="rgb(99, 110, 250)", size=12, symbol="circle"),
            hovertemplate="Donation Amount ($)=$%{x:,.0f}<br>Income Tax ($)=$%{y:,.0f}<br><extra></extra>",
        )
    )
    fig.update_layout(
        xaxis_tickformat="$,",
        yaxis_tickformat=y_tickformat,
        xaxis_range=[0, income], 
        yaxis_range=[0, max(df[y_col])],
        xaxis=dict(zeroline=True, zerolinewidth=2, zerolinecolor="black"),
        yaxis=dict(zeroline=True, zerolinewidth=2, zerolinecolor="black"),
    )
    fig = format_fig(fig)
    st.plotly_chart(fig)

    # Calculate marginal giving discount (how much $1 of donations reduces net income)
    df["marginal_cost"] = -np.gradient(df.income_tax_after_donations) / np.gradient(
        df[donation_column]
    )

    # Get marginal cost at the donation point by interpolating from the data
    marginal_cost = np.interp(donation_amount, df[donation_column], df["marginal_cost"])

    # Create second graph showing marginal cost vs donations
    fig2 = px.line(
        df,
        x=donation_column,
        y="marginal_cost",
        labels={
            donation_column: "Donation Amount ($)",
            "marginal_cost": "Marginal Giving Discount ($)",
        },
        title=f"Marginal Giving Discount Chart",
    )

    # Add marker point using interpolated marginal cost
    fig2.add_trace(
        go.Scatter(
            x=[donation_amount], 
            y=[marginal_cost],  # Now using interpolated value
            mode="markers",
            name="Target Donation",
            marker=dict(color="rgb(99, 110, 250)", size=12, symbol="circle"),
        )
    )

    # Update hover template for the marginal cost graph
    fig2.update_traces(
        hovertemplate=(
            "Donation Amount ($)=$%{x:,.0f}<br>"  # Round to nearest dollar
            + "Marginal Giving Discount ($)=$%{y:.2f}<br>"  # Show 2 decimal places with $
            + "<extra></extra>"
        )
    )

    fig2.update_layout(
        xaxis_tickformat="$,",
        yaxis_tickformat=".2f",
        xaxis_range=[0, max(df[donation_column])],
        yaxis_range=[0, 1],
        xaxis=dict(zeroline=True, zerolinewidth=2, zerolinecolor="black"),
        yaxis=dict(zeroline=True, zerolinewidth=2, zerolinecolor="black"),
    )
    fig2 = format_fig(fig2)
    
    # Add explanatory text about marginal cost
    st.markdown(f"If you donate an extra \$1, it will lower your taxes by ${marginal_cost:.2f}")
    
    # Display the chart
    st.plotly_chart(fig2)

    # Add explanatory text
    st.markdown(
        "Another way of looking at this is net income after taxes, transfers, and donations. Here's how that changes depending on much you give."
    )

    # Calculate baseline net income (no donations)
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
    baseline_net_income = baseline_simulation.calculate("household_net_income", 2024)[0]

    # Calculate net income with donation
    donation_situation = create_situation(
        income,
        is_married=is_married,
        state_code=state,
        num_children=num_children,
        mortgage_interest=mortgage_interest,
        real_estate_taxes=real_estate_taxes,
        medical_out_of_pocket_expenses=medical_expenses,
        casualty_loss=casualty_loss,
    )
    
    # Set the specific donation amount at person level
    donation_situation["people"]["you"]["charitable_cash_donations"] = {2024: donation_amount}
    
    # Ensure no axes are present
    if "axes" in donation_situation:
        del donation_situation["axes"]
    
    donation_simulation = Simulation(situation=donation_situation)
    
    actual_net_income = donation_simulation.calculate("household_net_income", 2024)[0]

    # Display net income values
    st.write(f"Household net income with no donations: ${int(baseline_net_income):,}")
    st.write(f"Household net income with \${donation_amount:,} donation: ${int(actual_net_income):,}")

    # Update the results table to include marginal cost
    results_df = pd.DataFrame(
        {
            "Metric": [
                "Household net income without donations",
                "Actual net income after donation",
                "Marginal cost of giving at target donation",
            ],
            "Amount": [
                f"${int(baseline_income_tax):,}",
                f"${int(actual_final_income):,}",
                f"${marginal_cost:.2f}",
            ],
        }
    ).set_index("Metric")

# Add collapsible section for tax program explanations
with st.expander("Learn about state and federal tax programs for charitable giving"):
    st.markdown(
        """
        ### Federal Charitable Deduction
        The federal charitable deduction allows you to deduct charitable contributions from your taxable income if you itemize deductions on your tax return. The deduction is limited to 60% of your adjusted gross income for cash donations.

        ### Arizona Charitable Contributions Credit
        Arizona offers a dollar-for-dollar tax credit for contributions to Qualifying Charitable Organizations. Single filers can claim up to \$400 (\$500 if donating to foster care organizations), and married filing jointly can claim up to \$800 ($1,000). These donations help organizations that serve low-income residents, children with chronic illness, or foster care.

        ### Mississippi Foster Care Charitable Tax Credit
        Mississippi provides a tax credit for donations to eligible charitable organizations that provide foster care, adoption, and services to children in foster care. The credit is dollar-for-dollar up to \$500 for single filers and \$1,000 for joint filers.                
        
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

# Add before the final divider
st.markdown(
    """
### Find Eligible Organizations
You can search for IRS-qualified tax-exempt organizations using the [IRS Tax Exempt Organization Search Tool](https://apps.irs.gov/app/eos/).
"""
)

# Add a visual separator
st.divider()
