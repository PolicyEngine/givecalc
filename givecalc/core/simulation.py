from policyengine_us import Simulation

from givecalc.constants import CURRENT_YEAR


def get_year_from_situation(situation):
    """Extract the tax year from a situation dictionary."""
    # The year is stored in the axes period
    axes = situation.get("axes", [[]])
    if axes and axes[0]:
        return axes[0][0].get("period", CURRENT_YEAR)
    # Fallback: look at any person's age field
    people = situation.get("people", {})
    for person_data in people.values():
        if "age" in person_data:
            years = list(person_data["age"].keys())
            if years:
                return years[0]
    return CURRENT_YEAR


def create_donation_simulation(situation, donation_amount):
    """
    Creates a simulation with the specified donation amount.

    Args:
        situation (dict): Base situation dictionary
        donation_amount (float): Amount of charitable donation

    Returns:
        Simulation: PolicyEngine simulation object with donation
    """
    year = get_year_from_situation(situation)

    # Create a copy of the situation to avoid modifying the original
    donation_situation = situation.copy()

    # Add the donation amount
    donation_situation["people"]["you"]["charitable_cash_donations"] = {
        year: donation_amount
    }

    # Remove any axes if they exist
    if "axes" in donation_situation:
        del donation_situation["axes"]

    # Create and return the simulation
    return Simulation(situation=donation_situation)


def display_results(
    baseline_net_income, actual_net_income, donation_amount, marginal_savings
):
    """
    Displays the results of the donation simulation.

    Args:
        baseline_net_income (float): Net income without donations
        actual_net_income (float): Net income with donations
        donation_amount (float): Amount donated
        marginal_savings (float): Marginal cost of giving at target donation
    """
    import pandas as pd
    import streamlit as st

    # Display net income values
    st.write(
        f"Household net income with no donations: ${int(baseline_net_income):,}"
    )
    st.write(
        f"Household net income with ${donation_amount:,} donation: "
        f"${int(actual_net_income - donation_amount):,}"
    )

    # Create and display results table
    results_df = pd.DataFrame(
        {
            "Metric": [
                "Household net income without donations",
                "Actual net income after donation",
                "Marginal cost of giving at target donation",
            ],
            "Amount": [
                f"${int(baseline_net_income):,}",
                f"${int(actual_net_income):,}",
                f"${marginal_savings:.2f}",
            ],
        }
    ).set_index("Metric")

    st.dataframe(results_df)
