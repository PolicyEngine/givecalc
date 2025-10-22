"""Tests for donation calculation functions."""

import numpy as np
import pandas as pd
import pytest

from givecalc import (
    CURRENT_YEAR,
    add_net_income_columns,
    calculate_donation_effects,
    calculate_donation_metrics,
    calculate_target_donation,
    create_situation,
)


def test_calculate_target_donation_by_amount():
    """Test calculating target donation by dollar amount."""

    situation = create_situation(employment_income=100000)
    baseline_metrics = calculate_donation_metrics(situation, donation_amount=0)
    df = calculate_donation_effects(situation)

    target_reduction = 5000  # Want to reduce net income by $5,000
    (
        required_donation,
        required_net_income,
        actual_reduction,
        actual_percentage,
    ) = calculate_target_donation(
        situation, df, baseline_metrics, target_reduction, is_percentage=False
    )

    # Required donation should be positive
    assert required_donation > 0
    # Required donation should be more than target reduction (due to tax benefits)
    assert required_donation >= target_reduction
    # Actual reduction should be close to target
    assert abs(actual_reduction - target_reduction) < 100


def test_calculate_target_donation_by_percentage():
    """Test calculating target donation by percentage."""
    situation = create_situation(employment_income=100000)
    baseline_metrics = calculate_donation_metrics(situation, donation_amount=0)
    df = calculate_donation_effects(situation)

    target_percentage = 10  # Want to reduce net income by 10%
    (
        required_donation,
        required_net_income,
        actual_reduction,
        actual_percentage,
    ) = calculate_target_donation(
        situation, df, baseline_metrics, target_percentage, is_percentage=True
    )

    # Required donation should be positive
    assert required_donation > 0
    # Actual percentage should be close to target
    assert abs(actual_percentage - target_percentage) < 1.0


def test_calculate_target_donation_zero_reduction():
    """Test calculating target donation with zero reduction."""
    situation = create_situation(employment_income=100000)
    baseline_metrics = calculate_donation_metrics(situation, donation_amount=0)
    df = calculate_donation_effects(situation)

    target_reduction = 0
    (
        required_donation,
        required_net_income,
        actual_reduction,
        actual_percentage,
    ) = calculate_target_donation(
        situation, df, baseline_metrics, target_reduction, is_percentage=False
    )

    # Required donation should be near zero
    assert required_donation < 100


def test_add_net_income_columns():
    """Test adding net income columns to DataFrame."""
    situation = create_situation(employment_income=100000)
    baseline_metrics = calculate_donation_metrics(situation, donation_amount=0)
    df = calculate_donation_effects(situation)

    df_with_net = add_net_income_columns(df, baseline_metrics)

    # Check new columns exist
    assert "tax_savings" in df_with_net.columns
    assert "net_income" in df_with_net.columns
    assert "net_income_reduction" in df_with_net.columns
    assert "reduction_percentage" in df_with_net.columns

    # Check that net income decreases as donations increase
    assert (
        df_with_net["net_income"].iloc[0] > df_with_net["net_income"].iloc[-1]
    )


def test_add_net_income_columns_does_not_modify_original():
    """Test that add_net_income_columns doesn't modify original DataFrame."""
    situation = create_situation(employment_income=100000)
    baseline_metrics = calculate_donation_metrics(situation, donation_amount=0)
    df = calculate_donation_effects(situation)

    original_columns = df.columns.tolist()
    df_with_net = add_net_income_columns(df, baseline_metrics)

    # Original should not have new columns
    assert "net_income" not in df.columns
    assert "net_income" in df_with_net.columns
