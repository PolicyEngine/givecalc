"""Tests for realistic user scenarios."""

import pandas as pd
import pytest

from givecalc import (
    calculate_donation_effects,
    calculate_donation_metrics,
    create_situation,
)


def test_high_income_nyc_scenario():
    """Test with realistic high-income NYC scenario: $500k income, $30k donation."""
    # Create situation matching user's scenario
    situation = create_situation(
        employment_income=500000,
        is_married=True,
        state_code="NY",
        in_nyc=True,
        num_children=0,
    )

    # Calculate effects
    df = calculate_donation_effects(situation)

    # Check DataFrame structure
    assert len(df) == 1001, "Should have 1001 donation points"
    assert df["charitable_cash_donations"].min() == 0
    assert df["charitable_cash_donations"].max() == 500000

    # Check that income tax varies meaningfully across donation range
    tax_min = df["income_tax_after_donations"].min()
    tax_max = df["income_tax_after_donations"].max()
    tax_range = tax_max - tax_min

    print(f"\nDEBUG: Tax range: ${tax_min:,.0f} to ${tax_max:,.0f}")
    print(f"Tax variation: ${tax_range:,.0f}")

    # For $500k income, tax should vary by at least $50k across donation range
    # (rough estimate: 37% federal + 10% state = ~47% marginal rate on deductions)
    # $500k in donations * 47% = ~$235k tax variation
    assert tax_range > 50000, f"Tax range too small: ${tax_range:,.0f}"

    # Check specific donation point
    metrics_30k = calculate_donation_metrics(situation, donation_amount=30000)
    tax_at_30k = metrics_30k["baseline_income_tax"][0]

    print(f"Tax at $30k donation: ${tax_at_30k:,.0f}")

    # Tax at $30k donation should be positive for high earners
    assert tax_at_30k > 0, "High earners should have positive tax burden"


def test_moderate_income_scenario():
    """Test with moderate income scenario that might have negative net taxes."""
    situation = create_situation(
        employment_income=50000,
        is_married=True,
        state_code="CA",
        num_children=2,
    )

    df = calculate_donation_effects(situation)

    # Check that calculations run
    assert len(df) == 1001

    # For moderate income with children, net taxes might be negative (due to credits)
    # This is OK - just check that the data varies
    tax_range = (
        df["income_tax_after_donations"].max()
        - df["income_tax_after_donations"].min()
    )

    print(f"\nModerate income tax range: ${tax_range:,.0f}")

    # Should still have some variation (though small for moderate income with children)
    assert tax_range > 1, "Should have some tax variation from donations"


def test_single_high_earner():
    """Test single high earner in high-tax state."""
    situation = create_situation(
        employment_income=300000,
        is_married=False,
        state_code="CA",
        num_children=0,
    )

    df = calculate_donation_effects(situation)

    # High earner should definitely have positive taxes
    assert df["income_tax_after_donations"].min() > 0

    # And substantial variation
    tax_range = (
        df["income_tax_after_donations"].max()
        - df["income_tax_after_donations"].min()
    )

    print(f"\nSingle high earner tax range: ${tax_range:,.0f}")
    assert (
        tax_range > 30000
    ), f"Expected >$30k variation, got ${tax_range:,.0f}"
