"""Tests for situation creation."""

import datetime

import pytest

from givecalc import CURRENT_YEAR, DEFAULT_AGE, create_situation


def test_create_situation_single():
    """Test creating a situation for a single person."""

    situation = create_situation(wages_and_salaries=100000)

    # Check people
    assert "you" in situation["people"]
    assert situation["people"]["you"]["age"][CURRENT_YEAR] == DEFAULT_AGE
    assert (
        situation["people"]["you"]["employment_income"][CURRENT_YEAR] == 100000
    )

    # Check entities
    assert "your family" in situation["families"]
    assert "you" in situation["families"]["your family"]["members"]

    # Check axes
    assert len(situation["axes"]) == 1
    assert situation["axes"][0][0]["name"] == "charitable_cash_donations"
    assert situation["axes"][0][0]["min"] == 0
    assert situation["axes"][0][0]["max"] == 100000


def test_create_situation_married():
    """Test creating a situation for a married couple."""
    situation = create_situation(wages_and_salaries=150000, is_married=True)

    # Check spouse exists
    assert "your spouse" in situation["people"]
    assert (
        situation["people"]["your spouse"]["age"][CURRENT_YEAR] == DEFAULT_AGE
    )

    # Check spouse in all entities
    members = situation["families"]["your family"]["members"]
    assert "you" in members
    assert "your spouse" in members


def test_create_situation_with_children():
    """Test creating a situation with children."""
    situation = create_situation(wages_and_salaries=100000, num_children=2)

    # Check children exist
    assert "child_0" in situation["people"]
    assert "child_1" in situation["people"]
    assert situation["people"]["child_0"]["age"][CURRENT_YEAR] == 10
    assert situation["people"]["child_1"]["age"][CURRENT_YEAR] == 10

    # Check children in family
    members = situation["families"]["your family"]["members"]
    assert "child_0" in members
    assert "child_1" in members


def test_create_situation_with_state():
    """Test creating a situation with state specification."""
    situation = create_situation(wages_and_salaries=100000, state_code="NY")

    assert (
        situation["households"]["your household"]["state_name"][CURRENT_YEAR]
        == "NY"
    )


def test_create_situation_with_nyc():
    """Test creating a situation with NYC specification."""
    situation = create_situation(
        wages_and_salaries=100000, state_code="NY", in_nyc=True
    )

    assert (
        situation["households"]["your household"]["in_nyc"][CURRENT_YEAR]
        is True
    )


def test_create_situation_with_deductions():
    """Test creating a situation with itemized deductions."""
    situation = create_situation(
        wages_and_salaries=100000,
        mortgage_interest=10000,
        real_estate_taxes=5000,
        medical_out_of_pocket_expenses=3000,
        casualty_loss=2000,
    )

    person = situation["people"]["you"]
    assert person["mortgage_interest"][CURRENT_YEAR] == 10000
    assert person["real_estate_taxes"][CURRENT_YEAR] == 5000
    assert person["medical_out_of_pocket_expenses"][CURRENT_YEAR] == 3000
    assert person["casualty_loss"][CURRENT_YEAR] == 2000


def test_create_situation_axes_count():
    """Test that axes have correct count."""
    situation = create_situation(wages_and_salaries=100000)

    assert situation["axes"][0][0]["count"] == 1001


def test_current_year_matches_system_year():
    """Test that CURRENT_YEAR matches the actual system year."""
    assert CURRENT_YEAR == datetime.date.today().year


def test_create_situation_uses_current_year_by_default():
    """Test that situations default to current year, not a hardcoded value."""
    situation = create_situation(wages_and_salaries=100000)
    expected_year = datetime.date.today().year

    # Axes period should use current year
    assert situation["axes"][0][0]["period"] == expected_year

    # Person data should use current year
    assert expected_year in situation["people"]["you"]["age"]


def test_create_situation_accepts_explicit_year():
    """Test that an explicit year parameter overrides the default."""
    situation = create_situation(wages_and_salaries=100000, year=2024)

    assert situation["axes"][0][0]["period"] == 2024
    assert 2024 in situation["people"]["you"]["age"]
