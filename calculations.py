import numpy as np
import pandas as pd
from policyengine_us import Simulation


def calculate_baseline_metrics(situation):
    baseline_simulation = Simulation(situation=situation)
    baseline_income_tax = baseline_simulation.calculate("income_tax")[0]
    baseline_net_income = baseline_simulation.calculate(
        "household_net_income", 2024
    )[0]
    return baseline_income_tax, baseline_net_income


def calculate_donation_effects(situation, income, num_points=100):
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
