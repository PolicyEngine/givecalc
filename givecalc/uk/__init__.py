"""UK-specific GiveCalc functionality.

This module provides UK tax calculations using PolicyEngine-UK,
supporting Gift Aid and other UK charitable giving mechanisms.
"""

from givecalc.uk.constants import (
    ENGLAND_REGIONS,
    UK_CURRENT_YEAR,
    UK_DEFAULT_REGION,
    UK_REGIONS,
)
from givecalc.uk.situation import create_uk_situation
from givecalc.uk.tax import (
    calculate_uk_donation_effects,
    calculate_uk_donation_metrics,
)

__all__ = [
    # Constants
    "UK_CURRENT_YEAR",
    "UK_REGIONS",
    "UK_DEFAULT_REGION",
    "ENGLAND_REGIONS",
    # Core functions
    "create_uk_situation",
    # Tax calculations
    "calculate_uk_donation_effects",
    "calculate_uk_donation_metrics",
]
