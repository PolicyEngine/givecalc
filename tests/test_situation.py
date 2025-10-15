"""Tests for situation creation."""

import pytest
from givecalc import CURRENT_YEAR, DEFAULT_AGE, create_situation


def test_create_situation_single():
    """Test creating a situation for a single person."""

    situation = create_situation(employment_income=100000)

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
    situation = create_situation(
        employment_income=150000, is_married=True
    )

    # Check spouse exists
    assert "your spouse" in situation["people"]
    assert situation["people"]["your spouse"]["age"][CURRENT_YEAR] == DEFAULT_AGE

    # Check spouse in all entities
    members = situation["families"]["your family"]["members"]
    assert "you" in members
    assert "your spouse" in members


def test_create_situation_with_children():
    """Test creating a situation with children."""
    situation = create_situation(employment_income=100000, num_children=2)

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
    situation = create_situation(employment_income=100000, state_code="NY")

    assert (
        situation["households"]["your household"]["state_name"][CURRENT_YEAR]
        == "NY"
    )


def test_create_situation_with_nyc():
    """Test creating a situation with NYC specification."""
    situation = create_situation(
        employment_income=100000, state_code="NY", in_nyc=True
    )

    assert (
        situation["households"]["your household"]["in_nyc"][CURRENT_YEAR]
        is True
    )


def test_create_situation_with_deductions():
    """Test creating a situation with itemized deductions."""
    situation = create_situation(
        employment_income=100000,
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
    situation = create_situation(employment_income=100000)

    assert situation["axes"][0][0]["count"] == 1001
