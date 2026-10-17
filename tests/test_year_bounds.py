"""Tax-year bounds are checked against today's date on every request."""

from datetime import date

import pytest
from pydantic import ValidationError

from api.schemas import CalculateRequest, UKCalculateRequest, max_year


def us(year):
    return CalculateRequest(
        income={"wages_and_salaries": 50_000},
        state_code="CA",
        donation_amount=1_000,
        year=year,
    )


def test_accepts_this_year_through_two_years_ahead():
    this_year = date.today().year
    assert max_year() == this_year + 2
    for year in (this_year, this_year + 1, this_year + 2):
        assert us(year).year == year


def test_rejects_years_outside_the_range():
    with pytest.raises(ValidationError):
        us(2023)
    with pytest.raises(ValidationError):
        us(date.today().year + 3)


def test_default_year_is_today():
    request = UKCalculateRequest(
        income={"employment_income": 50_000}, gift_aid=1_000
    )
    assert request.year == date.today().year


def test_bound_follows_the_clock(monkeypatch):
    """A container that started in 2026 accepts 2028 once it is 2027."""
    import api.schemas as schemas

    class NewYear(date):
        @classmethod
        def today(cls):
            return cls(date.today().year + 1, 1, 1)

    monkeypatch.setattr(schemas, "date", NewYear)
    assert us(date.today().year + 3).year == date.today().year + 3
