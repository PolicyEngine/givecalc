"""The fast paths for a wizard household (policyengine-household-wizard).

Invariants:
- Differential: /api/savings equals /api/calculate exactly on the headline
  for every wizard fixture, each endpoint running its own simulations.
- Differential: /api/calculate's curve, whose end comes from the no-gift
  run, is exactly the curve of ``situation_from_household``, which runs a
  separate simulation for the household's gross income.
- Next year: ``household_for_year`` moves every value to the new year and
  ages everyone by the years moved, without touching its input; moving
  back restores the household.
- Bunching for a wizard household runs next year with everyone a year
  older: a 64-year-old's next year is a 65-year-old's.
"""

import copy
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.schemas import CalculateRequest
from api.simulations import clear_caches
from givecalc.calculations.tax import calculate_donation_effects
from givecalc.core.household import (
    household_for_year,
    situation_from_household,
)

client = TestClient(app)

FIXTURES = json.loads(
    (Path(__file__).parent / "fixtures" / "wizard_households.json").read_text()
)
HEADLINE_FIELDS = [
    "baseline_net_tax",
    "net_tax_at_donation",
    "tax_savings",
    "baseline_net_income",
    "net_income_after_donation",
]


def fresh(path, body):
    clear_caches()
    response = client.post(path, json=body)
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.parametrize(
    "fixture", FIXTURES, ids=[fixture["name"] for fixture in FIXTURES]
)
def test_wizard_savings_matches_calculate_exactly(fixture):
    body = fixture["request"]
    light = fresh("/api/savings", body)
    full = fresh("/api/calculate", body)
    for field in HEADLINE_FIELDS:
        assert light[field] == full[field], field


@pytest.mark.parametrize(
    "fixture", FIXTURES[:4], ids=[fixture["name"] for fixture in FIXTURES[:4]]
)
def test_wizard_curve_matches_the_separate_gross_income_run(fixture):
    body = fixture["request"]
    from api.main import us_situation, with_curve_top
    from api.simulations import _run_point

    request = CalculateRequest(**body)
    situation = us_situation(request)
    baseline = _run_point("us", situation, 0)
    ours = with_curve_top(
        request, situation, baseline, request.donation_amount
    )
    reference = situation_from_household(
        body["household"], body["year"], body["donation_amount"]
    )
    assert ours == reference

    curve = fresh("/api/calculate", body)["curve"]
    expected = calculate_donation_effects(reference)
    step = max(1, len(expected) // 100)
    for point, i in zip(curve, range(0, len(expected), step)):
        assert point["donation"] == float(
            expected["charitable_cash_donations"].iloc[i]
        )
        assert point["net_tax"] == float(
            expected["income_tax_after_donations"].iloc[i]
        )


def single_texan(age, year=2026, wages=150_000):
    key = str(year)
    return {
        "people": {
            "adult-1": {
                "age": {key: age},
                "is_tax_unit_dependent": {key: False},
                "employment_income": {key: wages},
            }
        },
        "families": {"family": {"members": ["adult-1"]}},
        "marital_units": {},
        "tax_units": {"tax_unit": {"members": ["adult-1"]}},
        "spm_units": {"spm_unit": {"members": ["adult-1"]}},
        "households": {
            "household": {
                "members": ["adult-1"],
                "state_name": {key: "TX"},
            }
        },
    }


def test_household_for_year_moves_and_ages_without_mutating():
    household = FIXTURES[3]["request"]["household"]  # couple, two children
    before = copy.deepcopy(household)
    moved = household_for_year(household, 2026, 2027)
    assert household == before

    for collection, records in moved.items():
        for record in records.values():
            for name, values in record.items():
                if name == "members":
                    continue
                assert set(values) == {"2027"}, (collection, name)
    for person_id, record in moved["people"].items():
        assert (
            record["age"]["2027"]
            == before["people"][person_id]["age"]["2026"] + 1
        )
    assert household_for_year(moved, 2027, 2026) == before
    assert household_for_year(household, 2026, 2026) == before


def test_wizard_bunching_runs_next_year_a_year_older():
    # Itemizing at 64 but not at 65, whose standard deduction is larger:
    # 2027 savings are $965.56 at 64 and $461.56 at 65 (policyengine-us
    # 2.49.2).
    gift = 20_000
    body = {
        "household": single_texan(64),
        "donation_amount": gift,
        "year": 2026,
        "bunching": True,
    }
    bunching = fresh("/api/savings", body)["bunching"]

    older = fresh(
        "/api/calculate",
        {
            "household": single_texan(65, year=2027),
            "donation_amount": gift,
            "year": 2027,
        },
    )
    assert bunching["next_year_tax_savings"] == older["tax_savings"]
    assert bunching["next_year_baseline_net_tax"] == older["baseline_net_tax"]

    # The birthday matters here: at 64 next year would save a different
    # amount, so a run that kept this year's age would be wrong.
    same_age = fresh(
        "/api/calculate",
        {
            "household": single_texan(64, year=2027),
            "donation_amount": gift,
            "year": 2027,
        },
    )
    assert same_age["tax_savings"] != older["tax_savings"], (
        same_age["tax_savings"],
        older["tax_savings"],
    )
