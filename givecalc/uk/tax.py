"""UK tax calculations for GiveCalc."""

import copy

import numpy as np
import pandas as pd
from policyengine_uk import Simulation

from givecalc.uk.constants import UK_CURRENT_YEAR


def get_year_from_situation(situation):
    """Extract the tax year from a situation dictionary."""
    axes = situation.get("axes", [[]])
    if axes and axes[0]:
        return axes[0][0].get("period", UK_CURRENT_YEAR)
    return UK_CURRENT_YEAR


def _fix_simulation_dataset(simulation):
    """
    Workaround for policyengine-uk bug where dataset attribute is missing.

    This is fixed in policyengine-uk >= 2.55.0 but that requires Python 3.13+.
    See: https://github.com/PolicyEngine/policyengine-uk/pull/1367
    """
    if not hasattr(simulation, "dataset"):
        simulation.dataset = None
    return simulation


def create_uk_donation_simulation(situation, donation_amount):
    """
    Create a UK simulation with a specific donation amount.

    Args:
        situation (dict): Base situation dictionary
        donation_amount (float): Gift Aid donation amount

    Returns:
        Simulation: PolicyEngine-UK simulation
    """
    year = get_year_from_situation(situation)

    # Deep copy and modify situation
    modified_situation = copy.deepcopy(situation)

    # Remove axes for single-point simulation
    if "axes" in modified_situation:
        del modified_situation["axes"]

    # Set the donation amount
    modified_situation["people"]["you"]["gift_aid"] = {year: donation_amount}

    sim = Simulation(situation=modified_situation)
    return _fix_simulation_dataset(sim)


def calculate_uk_donation_metrics(situation, donation_amount):
    """
    Calculate baseline metrics with specified donation.

    Args:
        situation (dict): Base situation dictionary
        donation_amount (float): Donation amount

    Returns:
        dict: Dictionary containing baseline metrics
    """
    year = get_year_from_situation(situation)
    baseline_simulation = create_uk_donation_simulation(
        situation=situation, donation_amount=donation_amount
    )
    return {
        "baseline_income_tax": baseline_simulation.calculate(
            "household_tax", year, map_to="household"
        )
        - baseline_simulation.calculate(
            "household_benefits", year, map_to="household"
        ),
        "baseline_net_income": baseline_simulation.calculate(
            "household_net_income", year, map_to="household"
        ),
    }


def calculate_uk_donation_effects(situation):
    """
    Calculate the effects of varying Gift Aid donation amounts.

    Args:
        situation (dict): Base situation dictionary

    Returns:
        pandas.DataFrame: DataFrame containing donation effects
    """
    year = get_year_from_situation(situation)
    simulation = _fix_simulation_dataset(Simulation(situation=situation))

    donation_column = "gift_aid"
    # Use benunit for donations (where tax relief is claimed)
    donations = simulation.calculate(
        donation_column, period=year, map_to="benunit"
    )

    income_tax_by_donation = simulation.calculate(
        "household_tax", period=year, map_to="household"
    ) - simulation.calculate(
        "household_benefits", period=year, map_to="household"
    )

    return create_uk_donation_dataframe(
        donations, income_tax_by_donation, donation_column
    )


def create_uk_donation_dataframe(
    donations, income_tax_by_donation, donation_column
):
    """
    Create a DataFrame with UK donation effects analysis.

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
