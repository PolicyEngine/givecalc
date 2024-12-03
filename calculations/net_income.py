def add_net_income_columns(df, baseline_metrics):
    """Add net income-related columns to the DataFrame."""
    df = df.copy()
    baseline_net_income = baseline_metrics["baseline_net_income"]
    baseline_tax = baseline_metrics["baseline_income_tax"]

    # Calculate net income and related metrics
    df["tax_savings"] = baseline_tax - df["income_tax_after_donations"]
    df["net_income"] = (
        baseline_net_income - df["charitable_cash_donations"] + df["tax_savings"]
    )
    df["net_income_reduction"] = baseline_net_income - df["net_income"]
    df["reduction_percentage"] = (
        df["net_income_reduction"] / baseline_net_income
    ) * 100

    return df
