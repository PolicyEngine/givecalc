import numpy as np
import pandas as pd
from policyengine_us import Simulation
from constants import CURRENT_YEAR
from donation_simulation import create_donation_simulation


def calculate_donation_metrics(situation, donation_amount):
    """
    Calculate baseline metrics with specified donation.

    Args:
        situation (dict): Base situation dictionary
        donation_amount (float): Donation amount

    Returns:
        dict: Dictionary containing baseline metrics
    """
    baseline_simulation = create_donation_simulation(
        situation=situation, donation_amount=donation_amount
    )
    return {
        "baseline_income_tax": baseline_simulation.calculate(
            "household_tax", CURRENT_YEAR, map_to="household"
        ),
        "baseline_net_income": baseline_simulation.calculate(
            "household_net_income", CURRENT_YEAR, map_to="household"
        ),
    }


def calculate_donation_effects(situation):
    """
    Calculate the effects of varying donation amounts.

    Args:
        situation (dict): Base situation dictionary

    Returns:
        pandas.DataFrame: DataFrame containing donation effects
    """
    simulation = Simulation(situation=situation)
    # Note: We add this as a column to enable non-cash donations in the future.
    donation_column = "charitable_cash_donations"
    donations = simulation.calculate(donation_column, map_to="household")
    income_tax_by_donation = simulation.calculate(
        "household_tax", map_to="household"
    )

    return create_donation_dataframe(
        donations, income_tax_by_donation, donation_column
    )


def create_donation_dataframe(
    donations, income_tax_by_donation, donation_column
):
    """
    Create a DataFrame with donation effects analysis.

    Args:
        donations (numpy.ndarray): Array of donation amounts
        income_tax_by_donation (numpy.ndarray): Array of income tax amounts
        donation_column (str): Name of donation column

    Returns:
        pandas.DataFrame: DataFrame with analysis results
    """
    df = pd.DataFrame(
        {
            donation_column: donations,
            "income_tax": income_tax_by_donation,
        }
    )

    df["income_tax_after_donations"] = df.income_tax
    df["marginal_savings"] = -np.gradient(
        df.income_tax_after_donations
    ) / np.gradient(df[donation_column])

    return df
