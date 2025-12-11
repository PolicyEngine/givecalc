"""Test that axes work correctly."""

from policyengine_us import Simulation

from givecalc import CURRENT_YEAR, create_situation


def test_axes_generate_donation_range():
    """Test that axes parameter actually generates different donation amounts."""
    situation = create_situation(wages_and_salaries=100000)

    print(f"\nSituation axes: {situation['axes']}")

    # Create simulation
    sim = Simulation(situation=situation)

    # Try calculating on person level first
    donations_person = sim.calculate("charitable_cash_donations", CURRENT_YEAR)
    print(f"\nDonations (person level):")
    print(f"  Shape: {donations_person.shape}")
    print(
        f"  Min: ${donations_person.min():,.0f}, Max: ${donations_person.max():,.0f}"
    )

    # Calculate on tax_unit level
    donations = sim.calculate(
        "charitable_cash_donations", CURRENT_YEAR, map_to="tax_unit"
    )
    print(f"\nDonations (tax_unit level):")
    print(f"  Shape: {donations.shape}")
    print(f"  Min: ${donations.min():,.0f}, Max: ${donations.max():,.0f}")
    print(f"  First 5: {donations[:5]}")
    print(f"  Last 5: {donations[-5:]}")

    # Donations should range from 0 to 100000
    assert donations.min() == 0, f"Min should be 0, got {donations.min()}"
    assert (
        donations.max() == 100000
    ), f"Max should be 100000, got {donations.max()}"
    assert (
        len(donations) == 1001
    ), f"Should have 1001 values, got {len(donations)}"
