"""The API's wizard household path.

The frontend sends households built by policyengine-household-wizard
(``frontend/src/lib/__fixtures__/forms.ts``; ``bun run fixtures`` writes
their requests to ``tests/fixtures/wizard_households.json``).

Invariants:
- Differential: a household both request shapes describe gets the same
  taxes from each, with and without the gift.
- Accounting and bounds, for every fixture: net income after the gift is
  baseline net income minus the gift plus the savings, and the savings are
  between zero and the gift.
- The payload reaches the model: a mortgage counts, tips count for the tip
  deduction only with a listed occupation, and a county in New York City
  brings in the city's income tax.
- Shape checks reject what the API should not run, without simulating.
"""

import copy
import json
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("USE_MODAL", "false")

from api.main import app  # noqa: E402
from givecalc import create_situation  # noqa: E402
from givecalc.calculations.tax import calculate_donation_metrics  # noqa: E402
from givecalc.core.household import (  # noqa: E402
    DONATION_VARIABLE,
    MAX_PEOPLE,
    household_errors,
    situation_from_household,
)
from givecalc.core.simulation import create_donation_simulation  # noqa: E402

client = TestClient(app)

FIXTURES = json.loads(
    (Path(__file__).parent / "fixtures" / "wizard_households.json").read_text()
)
BY_NAME = {fixture["name"]: fixture for fixture in FIXTURES}
LEGACY = [fixture for fixture in FIXTURES if "legacy" in fixture]

# Float32 simulation outputs carry cents of noise at these magnitudes.
TOLERANCE = 1.0


def household_metrics(request, donation):
    situation = situation_from_household(
        request["household"], request["year"], request["donation_amount"]
    )
    return calculate_donation_metrics(situation, donation)


def legacy_metrics(legacy, donation):
    income = legacy["income"]
    deductions = legacy.get("deductions", {})
    situation = create_situation(
        wages_and_salaries=income.get("wages_and_salaries", 0),
        tips=income.get("tips", 0),
        dividends=income.get("dividends", 0),
        qualified_dividends=income.get("qualified_dividends", 0),
        short_term_capital_gains=income.get("short_term_capital_gains", 0),
        long_term_capital_gains=income.get("long_term_capital_gains", 0),
        interest_income=income.get("interest_income", 0),
        self_employment_income=income.get("self_employment_income", 0),
        is_married=legacy.get("is_married", False),
        state_code=legacy["state_code"],
        num_children=legacy.get("num_children", 0),
        mortgage_interest=deductions.get("mortgage_interest", 0),
        real_estate_taxes=deductions.get("real_estate_taxes", 0),
        in_nyc=legacy.get("in_nyc", False),
        year=legacy["year"],
    )
    return calculate_donation_metrics(situation, donation)


def household_value(request, variable, donation=0, period=None):
    situation = situation_from_household(
        request["household"], request["year"], request["donation_amount"]
    )
    sim = create_donation_simulation(situation, donation)
    return float(sim.calculate(variable, period or request["year"]).sum())


@pytest.mark.parametrize(
    "fixture", LEGACY, ids=[fixture["name"] for fixture in LEGACY]
)
def test_both_request_shapes_give_the_same_taxes(fixture):
    request, legacy = fixture["request"], fixture["legacy"]
    for donation in (0, request["donation_amount"]):
        new = household_metrics(request, donation)
        old = legacy_metrics(legacy, donation)
        for key in ("baseline_income_tax", "baseline_net_income"):
            assert float(new[key][0]) == pytest.approx(
                float(old[key][0]), abs=TOLERANCE
            ), (fixture["name"], donation, key)


@pytest.mark.parametrize(
    "fixture", FIXTURES, ids=[fixture["name"] for fixture in FIXTURES]
)
def test_endpoint_accounting_and_bounds(fixture):
    response = client.post("/api/calculate", json=fixture["request"])
    assert response.status_code == 200, response.text
    body = response.json()
    gift = fixture["request"]["donation_amount"]
    assert body["donation_amount"] == gift
    assert -TOLERANCE <= body["tax_savings"] <= gift + TOLERANCE
    assert body["net_income_after_donation"] == pytest.approx(
        body["baseline_net_income"] - gift + body["tax_savings"],
        abs=TOLERANCE,
    )
    # The curve reaches the gift.
    assert body["curve"][-1]["donation"] >= gift


def test_mortgage_interest_reaches_the_interest_deduction():
    request = BY_NAME[
        "married itemizers in Texas with a mortgage, $10,000 gift"
    ]["request"]
    assert household_value(request, "interest_deduction") == pytest.approx(
        30_000
    )
    without = copy.deepcopy(request)
    del without["household"]["people"]["adult-1"]["home_mortgage_interest"]
    assert household_value(without, "interest_deduction") == 0


def test_tips_are_deducted_only_in_a_listed_occupation():
    listed = BY_NAME["server in Nevada with tips as wait staff"]["request"]
    unlisted = BY_NAME[
        "server in Nevada with tips outside a listed occupation"
    ]["request"]
    assert household_value(listed, "tip_income_deduction") == 12_000
    assert household_value(unlisted, "tip_income_deduction") == 0
    assert household_value(listed, "income_tax") < household_value(
        unlisted, "income_tax"
    )
    # Tips count as wages either way.
    assert household_value(listed, "irs_employment_income") == 42_000


def test_new_york_city_county_brings_in_city_tax():
    city = BY_NAME["single New York City resident, $150,000, 10% pledge"][
        "request"
    ]
    upstate = BY_NAME["single New Yorker, $150,000, 10% pledge"]["request"]
    assert household_value(city, "nyc_income_tax") > 0
    assert household_value(upstate, "nyc_income_tax") == 0


def test_capital_loss_reduces_income():
    request = BY_NAME["single filer with a short-term capital loss"]["request"]
    assert household_value(request, "adjusted_gross_income") == 77_000


def test_curve_runs_to_market_income_or_the_gift():
    request = BY_NAME["single New Yorker, $150,000, 10% pledge"]["request"]
    axis = situation_from_household(request["household"], 2026, 0)["axes"]
    assert axis[0][0]["max"] == pytest.approx(150_000)
    bigger = situation_from_household(request["household"], 2026, 400_000)
    assert bigger["axes"][0][0]["max"] == 400_000


def test_donor_is_the_first_person():
    request = BY_NAME[
        "married itemizers in Texas with a mortgage, $10,000 gift"
    ]["request"]
    situation = situation_from_household(request["household"], 2026, 0)
    sim = create_donation_simulation(situation, 5_000)
    by_person = sim.calculate(DONATION_VARIABLE, 2026)
    assert list(by_person) == [5_000, 0]


def test_bunching_runs_the_household_next_year():
    """The frontend moves the household to next year for the bunching check."""
    request = copy.deepcopy(
        BY_NAME["single New Yorker, $150,000, 10% pledge"]["request"]
    )
    next_year = json.loads(json.dumps(request).replace('"2026"', '"2027"'))
    next_year["year"] = 2027
    response = client.post("/api/calculate", json=next_year)
    assert response.status_code == 200, response.text


# Shape checks: no simulation runs.

SINGLE = BY_NAME["single New Yorker, $150,000, 10% pledge"]["request"]


def mutated(change):
    household = copy.deepcopy(SINGLE["household"])
    change(household)
    return household


@pytest.mark.parametrize(
    "change, message",
    [
        (
            lambda h: h["people"]["adult-1"].update(
                {"not_a_variable": {"2026": 1}}
            ),
            "not a policyengine-us variable",
        ),
        (
            lambda h: h["people"]["adult-1"].update(
                {"state_name": {"2026": "NY"}}
            ),
            "belongs to household",
        ),
        (
            lambda h: h["people"]["adult-1"].update(
                {"employment_income": {"2025": 1}}
            ),
            "expected 2026",
        ),
        (
            lambda h: h["people"]["adult-1"].update(
                {DONATION_VARIABLE: {"2026": 1}}
            ),
            "set from donation_amount",
        ),
        (
            lambda h: h["people"]["adult-1"].update(
                {"employment_income": {"2026": None}}
            ),
            "number, boolean or string",
        ),
        (
            lambda h: h["people"]["adult-1"].update(
                {"employment_income": {"2026": 1e12}}
            ),
            "out of range",
        ),
        (
            lambda h: h["tax_units"].update({"other": {"members": []}}),
            "must hold one group",
        ),
        (
            lambda h: h["households"]["household"].update({"members": []}),
            "must hold every person",
        ),
        (lambda h: h.pop("families"), "families is required"),
        (lambda h: h.update({"axes": []}), "not a PolicyEngine US entity"),
        (
            lambda h: h["people"].update(
                {f"p{n}": {} for n in range(MAX_PEOPLE)}
            ),
            "more than",
        ),
    ],
)
def test_household_errors(change, message):
    errors = household_errors(mutated(change), 2026)
    assert any(message in error for error in errors), errors


def test_fixtures_have_no_errors():
    for fixture in FIXTURES:
        request = fixture["request"]
        assert household_errors(request["household"], request["year"]) == []


@pytest.mark.parametrize(
    "body",
    [
        {"household": SINGLE["household"], "donation_amount": 1, "year": 2027},
        {
            "household": SINGLE["household"],
            "income": {"wages_and_salaries": 1},
            "state_code": "NY",
            "donation_amount": 1,
            "year": 2026,
        },
        {"donation_amount": 1, "year": 2026},
    ],
    ids=["wrong year", "both shapes", "neither shape"],
)
def test_endpoint_rejects_bad_requests(body):
    response = client.post("/api/calculate", json=body)
    assert response.status_code == 422, response.text


def test_target_donation_accepts_a_household():
    response = client.post(
        "/api/target-donation",
        json={
            "household": SINGLE["household"],
            "year": 2026,
            "target_reduction": 5_000,
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["required_donation"] > 0
