"""Modal app for GiveCalc - serverless PolicyEngine calculations.

Provides remote functions for US and UK tax donation calculations.
Deploy with: modal deploy modal_app.py
"""

import modal

# Create Modal image with PolicyEngine dependencies
image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "policyengine-us>=1.155.0",
        "policyengine-uk>=2.45.4",
        "numpy",
        "pandas",
        "scipy",
    )
    .env({"NUMEXPR_MAX_THREADS": "4"})
)

app = modal.App("givecalc")


@app.function(
    image=image,
    timeout=120,
    keep_warm=1,
    memory=2048,
)
def calculate_us_effects(situation: dict) -> dict:
    """Calculate US donation effects across donation range.

    Args:
        situation: PolicyEngine situation dict with axes for donation sweep

    Returns:
        dict with keys:
            - curve: list of {donation, income_tax, marginal_savings} dicts
            - donation_column: name of donation column
    """
    import numpy as np
    import pandas as pd
    from policyengine_us import Simulation

    from givecalc.constants import CURRENT_YEAR

    # Extract year from axes
    axes = situation.get("axes", [[]])
    year = CURRENT_YEAR
    if axes and axes[0]:
        year = axes[0][0].get("period", CURRENT_YEAR)

    simulation = Simulation(situation=situation)
    donation_column = "charitable_cash_donations"

    donations = simulation.calculate(
        donation_column, period=year, map_to="tax_unit"
    )
    income_tax = simulation.calculate(
        "household_tax", period=year, map_to="household"
    ) - simulation.calculate(
        "household_benefits", period=year, map_to="household"
    )

    df = pd.DataFrame(
        {
            donation_column: donations,
            "income_tax": income_tax,
        }
    )
    df["income_tax_after_donations"] = df.income_tax
    df["marginal_savings"] = -np.gradient(
        df.income_tax_after_donations
    ) / np.gradient(df[donation_column])

    # Convert to list of dicts for JSON serialization
    curve = df.to_dict(orient="records")

    return {
        "curve": curve,
        "donation_column": donation_column,
    }


@app.function(
    image=image,
    timeout=120,
    keep_warm=1,
    memory=2048,
)
def calculate_uk_effects(situation: dict) -> dict:
    """Calculate UK Gift Aid donation effects across donation range.

    Args:
        situation: PolicyEngine-UK situation dict with axes

    Returns:
        dict with keys:
            - curve: list of {gift_aid, income_tax, marginal_savings} dicts
            - donation_column: name of donation column
    """
    import numpy as np
    import pandas as pd
    from policyengine_uk import Simulation

    from givecalc.uk.constants import UK_CURRENT_YEAR

    # Extract year from axes
    axes = situation.get("axes", [[]])
    year = UK_CURRENT_YEAR
    if axes and axes[0]:
        year = axes[0][0].get("period", UK_CURRENT_YEAR)

    simulation = Simulation(situation=situation)
    donation_column = "gift_aid"

    donations = simulation.calculate(
        donation_column, period=year, map_to="benunit"
    )
    income_tax = simulation.calculate(
        "household_tax", period=year, map_to="household"
    ) - simulation.calculate(
        "household_benefits", period=year, map_to="household"
    )

    df = pd.DataFrame(
        {
            donation_column: donations,
            "income_tax": income_tax,
        }
    )
    df["income_tax_after_donations"] = df.income_tax
    df["marginal_savings"] = -np.gradient(
        df.income_tax_after_donations
    ) / np.gradient(df[donation_column])

    curve = df.to_dict(orient="records")

    return {
        "curve": curve,
        "donation_column": donation_column,
    }


@app.function(
    image=image,
    timeout=60,
    memory=2048,
)
def calculate_us_metrics(situation: dict, donation_amount: float) -> dict:
    """Calculate US tax metrics at a specific donation amount.

    Args:
        situation: PolicyEngine situation dict (axes will be removed)
        donation_amount: Specific donation amount

    Returns:
        dict with baseline_income_tax and baseline_net_income
    """
    import copy

    from policyengine_us import Simulation

    from givecalc.constants import CURRENT_YEAR

    # Extract year from axes before removing them
    axes = situation.get("axes", [[]])
    year = CURRENT_YEAR
    if axes and axes[0]:
        year = axes[0][0].get("period", CURRENT_YEAR)

    # Deep copy and modify situation for single-point calc
    modified = copy.deepcopy(situation)
    if "axes" in modified:
        del modified["axes"]

    # Set donation amount
    modified["people"]["you"]["charitable_cash_donations"] = {
        year: donation_amount
    }

    simulation = Simulation(situation=modified)

    income_tax = float(
        simulation.calculate("household_tax", year, map_to="household")[0]
        - simulation.calculate("household_benefits", year, map_to="household")[
            0
        ]
    )
    net_income = float(
        simulation.calculate("household_net_income", year, map_to="household")[
            0
        ]
    )

    return {
        "baseline_income_tax": income_tax,
        "baseline_net_income": net_income,
    }


@app.function(
    image=image,
    timeout=60,
    memory=2048,
)
def calculate_uk_metrics(situation: dict, donation_amount: float) -> dict:
    """Calculate UK tax metrics at a specific donation amount.

    Args:
        situation: PolicyEngine-UK situation dict
        donation_amount: Specific Gift Aid donation amount

    Returns:
        dict with baseline_income_tax and baseline_net_income
    """
    import copy

    from policyengine_uk import Simulation

    from givecalc.uk.constants import UK_CURRENT_YEAR

    axes = situation.get("axes", [[]])
    year = UK_CURRENT_YEAR
    if axes and axes[0]:
        year = axes[0][0].get("period", UK_CURRENT_YEAR)

    modified = copy.deepcopy(situation)
    if "axes" in modified:
        del modified["axes"]

    modified["people"]["you"]["gift_aid"] = {year: donation_amount}

    simulation = Simulation(situation=modified)

    income_tax = float(
        simulation.calculate("household_tax", year, map_to="household")[0]
        - simulation.calculate("household_benefits", year, map_to="household")[
            0
        ]
    )
    net_income = float(
        simulation.calculate("household_net_income", year, map_to="household")[
            0
        ]
    )

    return {
        "baseline_income_tax": income_tax,
        "baseline_net_income": net_income,
    }


@app.function(image=modal.Image.debian_slim())
@modal.web_endpoint(method="GET")
def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "givecalc-modal"}
