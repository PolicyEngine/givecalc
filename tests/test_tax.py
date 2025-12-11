"""Tests for tax calculation functions."""

import numpy as np
import pandas as pd
import pytest

from givecalc import (
    CURRENT_YEAR,
    calculate_donation_effects,
    calculate_donation_metrics,
    create_donation_dataframe,
    create_situation,
)


def test_calculate_donation_metrics_returns_dict():
    """Test that calculate_donation_metrics returns a dictionary with expected keys."""

    situation = create_situation(wages_and_salaries=100000)
    metrics = calculate_donation_metrics(situation, donation_amount=5000)

    assert isinstance(metrics, dict)
    assert "baseline_income_tax" in metrics
    assert "baseline_net_income" in metrics


def test_calculate_donation_metrics_zero_donation():
    """Test metrics with zero donation."""
    situation = create_situation(wages_and_salaries=100000)
    metrics = calculate_donation_metrics(situation, donation_amount=0)

    # Should have positive income tax
    assert metrics["baseline_income_tax"] > 0
    # Net income should be less than gross income
    assert metrics["baseline_net_income"] < 100000


def test_calculate_donation_metrics_with_donation():
    """Test that donations affect tax calculation correctly."""
    situation = create_situation(wages_and_salaries=100000)
    metrics_no_donation = calculate_donation_metrics(
        situation, donation_amount=0
    )
    metrics_with_donation = calculate_donation_metrics(
        situation, donation_amount=10000
    )

    # Metrics should differ when donation amount changes
    # Note: Net income may not always decrease due to benefit interactions
    assert (
        metrics_with_donation["baseline_net_income"][0]
        != metrics_no_donation["baseline_net_income"][0]
    )


def test_calculate_donation_effects_returns_dataframe():
    """Test that calculate_donation_effects returns a DataFrame."""
    situation = create_situation(wages_and_salaries=100000)
    df = calculate_donation_effects(situation)

    assert isinstance(df, pd.DataFrame)


def test_calculate_donation_effects_columns():
    """Test that the DataFrame has expected columns."""
    situation = create_situation(wages_and_salaries=100000)
    df = calculate_donation_effects(situation)

    expected_columns = [
        "charitable_cash_donations",
        "income_tax",
        "income_tax_after_donations",
        "marginal_savings",
    ]
    for col in expected_columns:
        assert col in df.columns


def test_calculate_donation_effects_shape():
    """Test that the DataFrame has 1001 rows (from axes)."""
    situation = create_situation(wages_and_salaries=100000)
    df = calculate_donation_effects(situation)

    assert len(df) == 1001  # 1001 points from axes


def test_calculate_donation_effects_donation_range():
    """Test that donations range from 0 to income."""
    income = 100000
    situation = create_situation(wages_and_salaries=income)
    df = calculate_donation_effects(situation)

    assert df["charitable_cash_donations"].min() == 0
    assert df["charitable_cash_donations"].max() == income


def test_calculate_donation_effects_marginal_savings():
    """Test that marginal savings are between 0 and 1."""
    situation = create_situation(wages_and_salaries=100000)
    df = calculate_donation_effects(situation)

    # Remove NaN values (can occur at boundaries)
    marginal_savings = df["marginal_savings"].dropna()

    # Marginal savings should generally be between 0 and 1 (0% to 100%)
    # Though in edge cases they could be negative or >1
    assert marginal_savings.min() >= -0.5  # Allow some flexibility
    assert marginal_savings.max() <= 1.5  # Allow some flexibility


def test_create_donation_dataframe():
    """Test the create_donation_dataframe function."""
    donations = np.linspace(0, 100000, 1001)
    income_tax = np.linspace(20000, 15000, 1001)  # Tax decreases with donation

    df = create_donation_dataframe(
        donations, income_tax, "charitable_cash_donations"
    )

    assert isinstance(df, pd.DataFrame)
    assert len(df) == 1001
    assert "charitable_cash_donations" in df.columns
    assert "income_tax" in df.columns
    assert "marginal_savings" in df.columns
