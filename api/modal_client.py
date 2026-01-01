"""Modal client for GiveCalc - wraps Modal function calls with local fallback.

Set USE_MODAL=false to run calculations locally (for development).
Set USE_MODAL=true (default) to use Modal for calculations.
"""

import os
from typing import Literal

import pandas as pd


def use_modal() -> bool:
    """Check if Modal should be used for calculations."""
    return os.getenv("USE_MODAL", "true").lower() == "true"


def get_donation_effects(
    situation: dict, country: Literal["us", "uk"] = "us"
) -> pd.DataFrame:
    """Get donation effects curve.

    Args:
        situation: PolicyEngine situation dict with axes
        country: "us" or "uk"

    Returns:
        DataFrame with donation amounts, taxes, and marginal savings
    """
    if use_modal():
        return _get_effects_modal(situation, country)
    else:
        return _get_effects_local(situation, country)


def get_donation_metrics(
    situation: dict,
    donation_amount: float,
    country: Literal["us", "uk"] = "us",
) -> dict:
    """Get tax metrics at a specific donation amount.

    Args:
        situation: PolicyEngine situation dict
        donation_amount: Specific donation amount
        country: "us" or "uk"

    Returns:
        dict with baseline_income_tax and baseline_net_income
    """
    if use_modal():
        return _get_metrics_modal(situation, donation_amount, country)
    else:
        return _get_metrics_local(situation, donation_amount, country)


def _get_effects_modal(
    situation: dict, country: Literal["us", "uk"]
) -> pd.DataFrame:
    """Call Modal function for donation effects."""
    import modal

    if country == "uk":
        fn = modal.Function.lookup("givecalc", "calculate_uk_effects")
    else:
        fn = modal.Function.lookup("givecalc", "calculate_us_effects")

    result = fn.remote(situation)
    df = pd.DataFrame(result["curve"])

    # Ensure columns exist
    donation_col = result["donation_column"]
    if "income_tax_after_donations" not in df.columns:
        df["income_tax_after_donations"] = df["income_tax"]

    return df


def _get_effects_local(
    situation: dict, country: Literal["us", "uk"]
) -> pd.DataFrame:
    """Run donation effects calculation locally."""
    if country == "uk":
        from givecalc.uk.tax import calculate_uk_donation_effects

        return calculate_uk_donation_effects(situation)
    else:
        from givecalc.calculations.tax import calculate_donation_effects

        return calculate_donation_effects(situation)


def _get_metrics_modal(
    situation: dict,
    donation_amount: float,
    country: Literal["us", "uk"],
) -> dict:
    """Call Modal function for single-point metrics."""
    import modal

    if country == "uk":
        fn = modal.Function.lookup("givecalc", "calculate_uk_metrics")
    else:
        fn = modal.Function.lookup("givecalc", "calculate_us_metrics")

    return fn.remote(situation, donation_amount)


def _get_metrics_local(
    situation: dict,
    donation_amount: float,
    country: Literal["us", "uk"],
) -> dict:
    """Run single-point metrics calculation locally."""
    if country == "uk":
        from givecalc.uk.tax import calculate_uk_donation_metrics

        result = calculate_uk_donation_metrics(situation, donation_amount)
    else:
        from givecalc.calculations.tax import calculate_donation_metrics

        result = calculate_donation_metrics(situation, donation_amount)

    # Convert numpy arrays to floats
    return {
        "baseline_income_tax": float(result["baseline_income_tax"][0]),
        "baseline_net_income": float(result["baseline_net_income"][0]),
    }
