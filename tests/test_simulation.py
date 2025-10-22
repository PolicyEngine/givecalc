"""Tests for donation simulation functions."""

import pytest
from policyengine_us import Simulation

from givecalc import CURRENT_YEAR, create_donation_simulation, create_situation


def test_create_donation_simulation():
    """Test creating a donation simulation."""

    situation = create_situation(employment_income=100000)
    simulation = create_donation_simulation(situation, donation_amount=5000)

    assert isinstance(simulation, Simulation)


def test_create_donation_simulation_removes_axes():
    """Test that create_donation_simulation removes axes."""
    situation = create_situation(employment_income=100000)
    assert "axes" in situation  # Original has axes

    simulation = create_donation_simulation(situation, donation_amount=5000)

    # Simulation should not have axes
    # We can't directly check this, but we can verify it returns single values
    net_income = simulation.calculate(
        "household_net_income", CURRENT_YEAR, map_to="household"
    )
    assert len(net_income) == 1  # Single value, not array


def test_create_donation_simulation_applies_donation():
    """Test that the donation amount is applied."""
    situation = create_situation(employment_income=100000)
    donation_amount = 10000

    simulation = create_donation_simulation(situation, donation_amount)

    # The donation should be reflected in the calculation
    # We can verify by checking that donations affect the calculation
    sim_no_donation = create_donation_simulation(situation, 0)
    sim_with_donation = create_donation_simulation(situation, donation_amount)

    net_income_no_donation = sim_no_donation.calculate(
        "household_net_income", CURRENT_YEAR, map_to="household"
    )[0]
    net_income_with_donation = sim_with_donation.calculate(
        "household_net_income", CURRENT_YEAR, map_to="household"
    )[0]

    # Net income should differ when donation is applied
    # Note: May not always decrease due to benefit interactions
    assert net_income_with_donation != net_income_no_donation


def test_create_donation_simulation_does_not_modify_original():
    """Test that create_donation_simulation doesn't modify original situation."""
    situation = create_situation(employment_income=100000)
    original_axes = situation.get("axes")

    simulation = create_donation_simulation(situation, donation_amount=5000)

    # Original situation should still have axes
    assert situation.get("axes") == original_axes
