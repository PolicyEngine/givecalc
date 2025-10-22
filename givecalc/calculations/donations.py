from scipy.interpolate import interp1d

from givecalc.calculations.tax import calculate_donation_metrics


def calculate_target_donation(
    situation, df, baseline_metrics, target_reduction, is_percentage=False
):
    """
    Calculate the donation required to achieve a target reduction in net income.

    Args:
        df (pandas.DataFrame): DataFrame with donation effects
        baseline_metrics (dict): Dictionary containing baseline metrics (with $0 donations)
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

    # Create interpolation functions
    f_donation = interp1d(
        df["net_income_reduction"],
        df["charitable_cash_donations"],
        kind="linear",
        bounds_error=False,
        fill_value=(
            df["charitable_cash_donations"].min(),
            df["charitable_cash_donations"].max(),
        ),
    )

    f_percentage = interp1d(
        df["net_income_reduction"],
        df["reduction_percentage"],
        kind="linear",
        bounds_error=False,
        fill_value=(
            df["reduction_percentage"].min(),
            df["reduction_percentage"].max(),
        ),
    )

    # Calculate interpolated values (use .item() to avoid numpy deprecation warning)
    required_donation = float(
        f_donation(target_amount).item()
        if hasattr(f_donation(target_amount), "item")
        else f_donation(target_amount)
    )
    required_donation_metrics = calculate_donation_metrics(
        situation, required_donation
    )
    required_donation_net_income = (
        required_donation_metrics["baseline_net_income"][0] - required_donation
    )

    actual_reduction = target_amount  # Since we're interpolating, we can achieve the exact target
    actual_percentage = float(
        f_percentage(target_amount).item()
        if hasattr(f_percentage(target_amount), "item")
        else f_percentage(target_amount)
    )

    return (
        required_donation,
        required_donation_net_income,
        actual_reduction,
        actual_percentage,
    )
