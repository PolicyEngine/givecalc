"""Test axes work with multi-person households."""

from policyengine_us import Simulation
from givecalc import create_situation, calculate_donation_effects, CURRENT_YEAR


def test_axes_with_married_couple():
    """Test that axes work with married couple."""
    situation = create_situation(
        employment_income=100000,
        is_married=True,
    )

    df = calculate_donation_effects(situation)

    print(f"\nMarried couple:")
    print(f"  Donation range: ${df['charitable_cash_donations'].min():,.0f} - ${df['charitable_cash_donations'].max():,.0f}")
    print(f"  Tax range: ${df['income_tax'].min():,.0f} - ${df['income_tax'].max():,.0f}")

    # Donations should vary
    assert df['charitable_cash_donations'].max() == 100000
    assert df['charitable_cash_donations'].min() == 0

    # Taxes should vary too
    tax_range = df['income_tax'].max() - df['income_tax'].min()
    assert tax_range > 100, f"Tax should vary, got range of ${tax_range:,.0f}"


def test_axes_with_children():
    """Test that axes work with children."""
    situation = create_situation(
        employment_income=100000,
        is_married=True,
        num_children=2,
    )

    df = calculate_donation_effects(situation)

    print(f"\nMarried with 2 children:")
    print(f"  Donation range: ${df['charitable_cash_donations'].min():,.0f} - ${df['charitable_cash_donations'].max():,.0f}")
    print(f"  Tax range: ${df['income_tax'].min():,.0f} - ${df['income_tax'].max():,.0f}")

    # Donations should vary
    assert df['charitable_cash_donations'].max() == 100000
    assert df['charitable_cash_donations'].min() == 0

    # Taxes should vary
    tax_range = df['income_tax'].max() - df['income_tax'].min()
    assert tax_range > 100, f"Tax should vary, got range of ${tax_range:,.0f}"
