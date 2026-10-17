"""Every GiveCalc input must reach the policyengine-us variable it is meant to move.

policyengine-us turned mortgage_interest into a computed total (deductible
plus non-deductible interest) whose deduction reads home_mortgage_interest.
GiveCalc kept writing mortgage_interest, so the interest deduction silently
ignored every user's mortgage. These tests set each input on its own and check
the downstream variable responds, so a future rename fails loudly.
"""

import pytest

from givecalc import create_situation
from givecalc.core.simulation import create_donation_simulation

YEAR = 2026


def calc(variable, **inputs):
    situation = create_situation(year=YEAR, state_code="TX", **inputs)
    sim = create_donation_simulation(situation, 0)
    return float(sim.calculate(variable, YEAR)[0])


@pytest.mark.parametrize(
    "givecalc_input, amount, variable",
    [
        ("wages_and_salaries", 50_000, "adjusted_gross_income"),
        ("tips", 10_000, "adjusted_gross_income"),
        ("self_employment_income", 50_000, "adjusted_gross_income"),
        ("interest_income", 5_000, "adjusted_gross_income"),
        ("long_term_capital_gains", 20_000, "adjusted_gross_income"),
        ("short_term_capital_gains", 20_000, "adjusted_gross_income"),
        ("mortgage_interest", 20_000, "interest_deduction"),
        ("real_estate_taxes", 8_000, "salt_deduction"),
    ],
)
def test_input_moves_downstream_variable(givecalc_input, amount, variable):
    base = dict(wages_and_salaries=100_000)
    without = calc(variable, **base)
    base[givecalc_input] = base.get(givecalc_input, 0) + amount
    with_input = calc(variable, **base)
    assert with_input > without, (
        f"{givecalc_input}={amount} did not change {variable} "
        f"({without} -> {with_input})"
    )


def test_casualty_loss_deduction_is_inactive():
    """policyengine-us switches the casualty loss deduction off from 2018.

    The frontend therefore no longer asks for casualty losses. If this starts
    failing, policyengine-us models the deduction again and the field can
    return.
    """
    assert calc("casualty_loss_deduction", casualty_loss=30_000) == 0


def test_mortgage_interest_raises_donation_savings_for_itemizer():
    """Regression for the production bug found 2026-10-16.

    A married couple in Texas earning $200,000 with $12,000 of property tax
    gives $10,000. With $30,000 of mortgage interest they itemize, so the gift
    is deductible at their 22% bracket. The live API returned $440 of savings
    with or without the mortgage.
    """
    from givecalc.calculations.tax import calculate_donation_metrics

    def savings(mortgage):
        situation = create_situation(
            wages_and_salaries=200_000,
            is_married=True,
            state_code="TX",
            mortgage_interest=mortgage,
            real_estate_taxes=12_000,
            year=YEAR,
        )
        at_zero = calculate_donation_metrics(situation, 0)
        at_gift = calculate_donation_metrics(situation, 10_000)
        return float(
            at_zero["baseline_income_tax"][0]
            - at_gift["baseline_income_tax"][0]
        )

    without_mortgage = savings(0)
    with_mortgage = savings(30_000)
    assert with_mortgage > without_mortgage + 1_000
