"""Giving-season warm container (Max's call on d1650, 2026-10-18).

Invariants:
- Exactly one container is warm on every day from 15 November to
  31 December, and none on any other day, in every year.
- That is 47 warm days a year, which is what the about-$180 estimate
  assumes (47 days x 24 h x $0.158/h for 2 cores and 8 GiB).
"""

from datetime import date, timedelta

from hypothesis import given
from hypothesis import strategies as st

from modal_app import warm_containers


def test_season_edges():
    assert warm_containers(date(2026, 11, 14)) == 0
    assert warm_containers(date(2026, 11, 15)) == 1
    assert warm_containers(date(2026, 12, 1)) == 1  # Giving Tuesday 2026
    assert warm_containers(date(2026, 12, 31)) == 1
    assert warm_containers(date(2027, 1, 1)) == 0


@given(st.dates(min_value=date(2024, 1, 1), max_value=date(2100, 12, 31)))
def test_warm_exactly_in_season(day):
    season = date(day.year, 11, 15) <= day <= date(day.year, 12, 31)
    assert warm_containers(day) == (1 if season else 0)


def test_forty_seven_warm_days_every_year():
    for year in range(2024, 2101):
        days = (date(year + 1, 1, 1) - date(year, 1, 1)).days
        warm = sum(
            warm_containers(date(year, 1, 1) + timedelta(d))
            for d in range(days)
        )
        assert warm == 47, year
