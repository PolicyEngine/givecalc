"""GiveCalc - Calculate how charitable giving affects taxes.

This package provides the core calculation logic for the GiveCalc application,
separated from the Streamlit UI layer.
"""

from givecalc.calculations.donations import calculate_target_donation
from givecalc.calculations.net_income import add_net_income_columns
from givecalc.calculations.tax import (
    calculate_donation_effects,
    calculate_donation_metrics,
    create_donation_dataframe,
)
from givecalc.config import load_config
from givecalc.constants import (
    BLUE_PRIMARY,
    CURRENT_YEAR,
    DEFAULT_AGE,
    MARGIN,
    TEAL_ACCENT,
)
from givecalc.core.simulation import create_donation_simulation
from givecalc.core.situation import create_situation

__version__ = "0.1.0"

__all__ = [
    # Constants
    "CURRENT_YEAR",
    "BLUE_PRIMARY",
    "TEAL_ACCENT",
    "DEFAULT_AGE",
    "MARGIN",
    # Core functions
    "create_situation",
    "create_donation_simulation",
    # Tax calculations
    "calculate_donation_metrics",
    "calculate_donation_effects",
    "create_donation_dataframe",
    # Donation calculations
    "calculate_target_donation",
    # Net income calculations
    "add_net_income_columns",
    # Config
    "load_config",
]
