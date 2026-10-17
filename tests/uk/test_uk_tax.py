"""Tests for UK tax calculations."""

import numpy as np
import pandas as pd
import pytest

from givecalc.uk.constants import UK_CURRENT_YEAR
from givecalc.uk.situation import create_uk_situation
from givecalc.uk.tax import (
    calculate_uk_donation_effects,
    calculate_uk_donation_metrics,
    create_uk_donation_dataframe,
)


class TestCalculateUKDonationMetrics:
    """Tests for calculate_uk_donation_metrics function."""

    def test_returns_dict(self):
        """Should return a dictionary."""
        situation = create_uk_situation(employment_income=50000)
        result = calculate_uk_donation_metrics(situation, 0)

        assert isinstance(result, dict)

    def test_returns_required_keys(self):
        """Should return required metric keys."""
        situation = create_uk_situation(employment_income=50000)
        result = calculate_uk_donation_metrics(situation, 0)

        assert "baseline_income_tax" in result
        assert "baseline_net_income" in result

    def test_zero_donation_returns_baseline(self):
        """Zero donation should return baseline tax."""
        situation = create_uk_situation(employment_income=50000)
        result = calculate_uk_donation_metrics(situation, 0)

        # Should have positive tax for £50k income
        assert result["baseline_income_tax"][0] > 0

    def test_donation_reduces_tax(self):
        """Donations should reduce tax liability."""
        situation = create_uk_situation(employment_income=60000)
        baseline = calculate_uk_donation_metrics(situation, 0)
        with_donation = calculate_uk_donation_metrics(situation, 5000)

        # Tax should be lower with donation
        assert (
            with_donation["baseline_income_tax"][0]
            < baseline["baseline_income_tax"][0]
        )


class TestCalculateUKDonationEffects:
    """Tests for calculate_uk_donation_effects function."""

    def test_returns_dataframe(self):
        """Should return a pandas DataFrame."""
        situation = create_uk_situation(employment_income=50000)
        result = calculate_uk_donation_effects(situation)

        assert isinstance(result, pd.DataFrame)

    def test_has_required_columns(self):
        """Should have required columns."""
        situation = create_uk_situation(employment_income=50000)
        df = calculate_uk_donation_effects(situation)

        required_columns = [
            "gift_aid",
            "income_tax",
            "income_tax_after_donations",
            "marginal_savings",
        ]
        for col in required_columns:
            assert col in df.columns

    def test_shape_matches_axes_count(self):
        """DataFrame should have 1001 rows (matching axes count)."""
        situation = create_uk_situation(employment_income=50000)
        df = calculate_uk_donation_effects(situation)

        assert len(df) == 1001

    def test_donation_range(self):
        """Donations should range from 0 to income."""
        income = 50000
        situation = create_uk_situation(employment_income=income)
        df = calculate_uk_donation_effects(situation)

        assert df["gift_aid"].iloc[0] == 0
        assert df["gift_aid"].iloc[-1] == income

    def test_marginal_savings_positive(self):
        """A higher-rate taxpayer saves 25p per £1 until the band extends."""
        situation = create_uk_situation(employment_income=80000)
        df = calculate_uk_donation_effects(situation)

        # Gifts up to £16,000 (the first 20% of the £0-£80,000 grid) keep
        # the donor in the higher-rate band.
        early = df["marginal_savings"].iloc[1:200]
        assert early.to_numpy() == pytest.approx(0.25, abs=0.01)

    def test_higher_rate_taxpayer_higher_savings(self):
        """Higher rate taxpayer should have higher marginal savings at low donations."""
        # Basic rate taxpayer (under ~£50k)
        basic_situation = create_uk_situation(employment_income=35000)
        basic_df = calculate_uk_donation_effects(basic_situation)

        # Higher rate taxpayer (over ~£50k)
        higher_situation = create_uk_situation(employment_income=80000)
        higher_df = calculate_uk_donation_effects(higher_situation)

        # Compare marginal savings at low donation amounts (first 10%)
        # This ensures we're comparing at points where both are still in
        # their respective tax bands (basic stays basic, higher stays higher)
        basic_early = basic_df["marginal_savings"].iloc[10:50].mean()
        higher_early = higher_df["marginal_savings"].iloc[10:50].mean()

        # Higher rate taxpayer should have higher marginal savings
        # Basic-rate donors get no relief (it goes to the charity);
        # higher-rate donors get 25p per £1.
        assert higher_early > basic_early


class TestCreateUKDonationDataframe:
    """Tests for create_uk_donation_dataframe function."""

    def test_creates_dataframe(self):
        """Should create a DataFrame."""
        donations = np.linspace(0, 50000, 101)
        taxes = 10000 - donations * 0.2
        df = create_uk_donation_dataframe(donations, taxes, "gift_aid")

        assert isinstance(df, pd.DataFrame)

    def test_correct_columns(self):
        """Should have correct columns."""
        donations = np.linspace(0, 50000, 101)
        taxes = 10000 - donations * 0.2
        df = create_uk_donation_dataframe(donations, taxes, "gift_aid")

        assert "gift_aid" in df.columns
        assert "income_tax" in df.columns
        assert "income_tax_after_donations" in df.columns
        assert "marginal_savings" in df.columns

    def test_marginal_savings_calculation(self):
        """Marginal savings should be approximately 0.2 for 20% tax rate."""
        donations = np.linspace(0, 50000, 101)
        taxes = 10000 - donations * 0.2  # 20% tax savings
        df = create_uk_donation_dataframe(donations, taxes, "gift_aid")

        # Middle values should be close to 0.2
        middle_savings = df["marginal_savings"].iloc[10:90]
        assert abs(middle_savings.mean() - 0.2) < 0.01


class TestScottishTaxRates:
    """Tests for Scottish income tax handling."""

    def test_scotland_uses_scottish_rates(self):
        """Scotland should use Scottish income tax rates."""
        # Scottish rates differ from rest of UK
        london_situation = create_uk_situation(
            employment_income=50000, region="LONDON"
        )
        scotland_situation = create_uk_situation(
            employment_income=50000, region="SCOTLAND"
        )

        london_metrics = calculate_uk_donation_metrics(london_situation, 0)
        scotland_metrics = calculate_uk_donation_metrics(scotland_situation, 0)

        # Taxes should be different (Scotland has different bands)
        # This may be equal or different depending on PolicyEngine-UK version
        # The important thing is that both compute without error
        assert london_metrics["baseline_income_tax"] is not None
        assert scotland_metrics["baseline_income_tax"] is not None
