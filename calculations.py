# calculations.py
import numpy as np
import pandas as pd
from policyengine_us import Simulation


def calculate_baseline_metrics(situation):
    """
    Calculate baseline metrics without any donations.

    Args:
        situation (dict): Base situation dictionary

    Returns:
        dict: Dictionary containing baseline metrics
    """
    baseline_simulation = Simulation(situation=situation)
    return {
        "baseline_income_tax": baseline_simulation.calculate(
            "federal_state_income_tax"
        )[0],
        "baseline_net_income": baseline_simulation.calculate(
            "household_net_income", 2024
        )[0],
    }


def calculate_donation_effects(situation, income, num_points=100):
    """
    Calculate the effects of varying donation amounts.

    Args:
        situation (dict): Base situation dictionary
        income (float): Annual income
        num_points (int): Number of points to calculate

    Returns:
        pandas.DataFrame: DataFrame containing donation effects
    """
    max_donation = income
    donations = np.linspace(0, max_donation, num_points)
    donation_column = "charitable_cash_donations"

    situation["axes"] = [
        [
            {
                "count": num_points,
                "name": donation_column,
                "min": 0,
                "max": max_donation,
                "period": "2024",
            }
        ]
    ]

    simulation = Simulation(situation=situation)
    income_tax_by_donation = simulation.calculate(
        "federal_state_income_tax"
    ).reshape(-1)

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
    df["marginal_cost"] = -np.gradient(
        df.income_tax_after_donations
    ) / np.gradient(df[donation_column])

    return df


def calculate_required_donation(
    df, baseline_net_income, reduction, reduction_type="Dollar amount"
):
    """
    Calculate the donation required to achieve a desired reduction in net income.

    Args:
        df (pandas.DataFrame): DataFrame with donation effects
        baseline_net_income (float): Net income without donations
        reduction (float): Desired reduction amount
        reduction_type (str): Type of reduction ('Percentage' or 'Dollar amount')

    Returns:
        float: Required donation amount
    """
    # Print input values for debugging
    print(f"Baseline net income: ${baseline_net_income:,.2f}")
    print(f"Desired reduction: ${reduction:,.2f}")

    # Calculate net income after taxes and donations for each donation amount
    df = df.copy()
    initial_tax = df.loc[0, "income_tax_after_donations"]

    df["net_income"] = (
        baseline_net_income
        - df["charitable_cash_donations"]
        + (initial_tax - df["income_tax_after_donations"])  # Tax savings
    )

    df["net_income_reduction"] = baseline_net_income - df["net_income"]

    # Print first few rows for debugging
    print("\nFirst few rows of calculation:")
    print(
        df[
            [
                "charitable_cash_donations",
                "income_tax_after_donations",
                "net_income",
                "net_income_reduction",
            ]
        ].head()
    )

    # Find where net income reduction meets target
    mask = df["net_income_reduction"] >= reduction
    if mask.any():
        required_donation = df[mask]["charitable_cash_donations"].iloc[0]
    else:
        required_donation = max(df["charitable_cash_donations"])

    # Print result
    print(f"\nRequired donation: ${required_donation:,.2f}")

    return required_donation
