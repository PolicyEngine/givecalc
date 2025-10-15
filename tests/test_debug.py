"""Quick debug test to check data generation."""

from givecalc import create_situation, calculate_donation_effects


def test_check_dataframe_values():
    """Debug test to see what values are being generated."""
    situation = create_situation(
        employment_income=500000,
        is_married=True,
        state_code="NY",
        in_nyc=True,
    )

    df = calculate_donation_effects(situation)

    print("\n" + "=" * 60)
    print("DATAFRAME DEBUG OUTPUT")
    print("=" * 60)
    print(f"Shape: {df.shape}")
    print(f"\nColumns: {df.columns.tolist()}")
    print(f"\nDonation range: ${df['charitable_cash_donations'].min():,.0f} - ${df['charitable_cash_donations'].max():,.0f}")
    print(f"\nIncome tax stats:")
    print(f"  Min: ${df['income_tax'].min():,.2f}")
    print(f"  Max: ${df['income_tax'].max():,.2f}")
    print(f"  Range: ${df['income_tax'].max() - df['income_tax'].min():,.2f}")
    print(f"\nIncome tax after donations stats:")
    print(f"  Min: ${df['income_tax_after_donations'].min():,.2f}")
    print(f"  Max: ${df['income_tax_after_donations'].max():,.2f}")
    print(f"  Range: ${df['income_tax_after_donations'].max() - df['income_tax_after_donations'].min():,.2f}")
    print(f"\nMarginal savings stats:")
    print(f"  Min: {df['marginal_savings'].min():.4f}")
    print(f"  Max: {df['marginal_savings'].max():.4f}")
    print(f"  Mean: {df['marginal_savings'].mean():.4f}")

    print("\nFirst 5 rows:")
    print(df.head())

    print("\nRows around $30k donation (rows 60-65):")
    print(df.iloc[60:65])

    print("\nLast 5 rows:")
    print(df.tail())
    print("=" * 60 + "\n")

    # This test always passes - it's just for inspection
    assert True
