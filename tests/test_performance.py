"""Performance tests for calculation speed."""

import time

from givecalc import calculate_donation_effects, create_situation


def test_calculation_speed():
    """Test that calculations complete in reasonable time."""
    situation = create_situation(
        wages_and_salaries=500000,
        is_married=True,
        state_code="NY",
        in_nyc=True,
    )

    start = time.time()
    df = calculate_donation_effects(situation)
    elapsed = time.time() - start

    print(
        f"\n⏱️  Calculated {len(df)} donation points in {elapsed:.2f} seconds"
    )
    print(f"   ({len(df)/elapsed:.0f} points/second)")

    # Should complete in under 10 seconds for 1001 points
    assert elapsed < 10, f"Too slow: {elapsed:.2f}s for {len(df)} points"

    # Check data is valid
    assert len(df) == 1001
    assert "income_tax_after_donations" in df.columns
