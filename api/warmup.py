"""Warm a container before it serves requests.

A process's first simulation runs about 2 seconds longer than later ones
(5 on Modal), and its first for each tax year about 1.5 seconds longer,
while PolicyEngine fills its caches. The simulation workers fork from a
process that has run ``warm_up``, so their first requests skip that cost.
"""

from datetime import date

from givecalc import create_situation
from givecalc.uk import create_uk_situation

from .simulations import clear_caches, donation_curve, point_metrics

# The frontend offers last, this and next tax year; the bunching check
# also runs the year after.
YEARS_BEFORE = 1
YEARS_AFTER = 2


def warm_up_years(today: date = None) -> list[int]:
    year = (today or date.today()).year
    return list(range(year - YEARS_BEFORE, year + YEARS_AFTER + 1))


def warm_up(today: date = None) -> None:
    """Run the simulations a first request would, then drop the results.

    One US point simulation per year fills that year's parameter caches,
    which the curve shares. policyengine-uk builds new rules for every
    simulation, so one UK run per kind is enough to warm its code.
    """
    years = warm_up_years(today)
    this_year = years[YEARS_BEFORE]
    for year in years:
        point_metrics("us", _us(year), 0)
    donation_curve("us", _us(this_year))
    uk = create_uk_situation(employment_income=60_000, year=this_year)
    point_metrics("uk", uk, 0)
    donation_curve("uk", uk)
    clear_caches()


def _us(year: int) -> dict:
    return create_situation(
        wages_and_salaries=60_000, state_code="CA", year=year
    )
