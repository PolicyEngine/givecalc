import numpy as np
import pandas as pd
from policyengine_us import Simulation


def calculate_target_donation(
    df, baseline_metrics, target_reduction, is_percentage=False
):
    """
    Calculate the donation required to achieve a target reduction in net income.

    Args:
        df (pandas.DataFrame): DataFrame with donation effects
        baseline_metrics (dict): Dictionary containing baseline metrics
        target_reduction (float): Target reduction in net income (or percentage if is_percentage=True)
        is_percentage (bool): Whether target_reduction is a percentage

    Returns:
        tuple: (required_donation, actual_reduction, actual_percentage)
    """
    baseline_net_income = baseline_metrics["baseline_net_income"]
    baseline_tax = baseline_metrics["baseline_income_tax"]

    # Convert percentage to amount if needed
    if is_percentage:
        target_amount = (target_reduction / 100) * baseline_net_income
    else:
        target_amount = target_reduction

    # Calculate net income at each donation point
    df = df.copy()
    df["tax_savings"] = baseline_tax - df["income_tax_after_donations"]
    df["net_income"] = (
        baseline_net_income
        - df["charitable_cash_donations"]
        + df["tax_savings"]
    )
    df["net_income_reduction"] = baseline_net_income - df["net_income"]
    df["reduction_percentage"] = (
        df["net_income_reduction"] / baseline_net_income
    ) * 100

    # Find closest donation amount that achieves target reduction
    idx = (df["net_income_reduction"] - target_amount).abs().idxmin()
    required_donation = df.loc[idx, "charitable_cash_donations"]
    actual_reduction = df.loc[idx, "net_income_reduction"]
    actual_percentage = df.loc[idx, "reduction_percentage"]

    return required_donation, actual_reduction, actual_percentage
