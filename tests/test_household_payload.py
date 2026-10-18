"""The API's wizard household path.

``tests/fixtures/wizard_households.json`` holds requests built by
policyengine-household-wizard. The frontend PR (#88) adds their source
(``frontend/src/lib/__fixtures__/forms.ts``) and ``bun run fixtures``, which
rewrites the file.

Invariants:
- Differential: a household both request shapes describe gets the same
  taxes from each, at the endpoint, with and without the gift.
- Accounting and bounds, for every fixture: net income after the gift is
  baseline net income minus the gift plus the savings, and the savings are
  between zero and the gift.
- The axis varies the donor: the curve at the gift equals the point run.
- Person order does not change the result, given the donor.
- Target donation: the reduction reported is the one the gift reaches, and
  an unreachable target is a 400, not a clamped answer.
- The payload reaches the model: a mortgage counts, tips count for the tip
  deduction only with a listed occupation, and a county in New York City
  brings in the city's income tax.
- ``household_errors`` returns a list for any JSON and never raises; shape,
  type, group and filer checks reject what the API should not run, without
  simulating.
"""

import copy
import json
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

os.environ.setdefault("USE_MODAL", "false")

from policyengine_us import Simulation  # noqa: E402

from api.main import _printable, app  # noqa: E402
from api.simulations import clear_caches  # noqa: E402
from givecalc import create_situation  # noqa: E402
from givecalc.calculations.tax import calculate_donation_metrics  # noqa: E402
from givecalc.core.household import (  # noqa: E402
    DONATION_VARIABLE,
    MAX_PEOPLE,
    MOVED_TOTALS,
    _period_error,
    household_errors,
    household_gross_income,
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


def legacy_body(fixture):
    legacy = dict(fixture["legacy"])
    legacy["donation_amount"] = fixture["request"]["donation_amount"]
    return legacy


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
    "fixture", LEGACY, ids=[fixture["name"] for fixture in LEGACY]
)
def test_both_request_shapes_agree_at_the_endpoint(fixture):
    new = client.post("/api/calculate", json=fixture["request"])
    old = client.post("/api/calculate", json=legacy_body(fixture))
    assert new.status_code == old.status_code == 200, (new.text, old.text)
    for key in (
        "baseline_net_tax",
        "net_tax_at_donation",
        "tax_savings",
        "baseline_net_income",
        "net_income_after_donation",
    ):
        assert new.json()[key] == pytest.approx(
            old.json()[key], abs=TOLERANCE
        ), key
    # The curves' grids differ when benefits raise the top, so the rate is
    # compared loosely: the same bracket, not the same grid point.
    assert new.json()["marginal_savings_rate"] == pytest.approx(
        old.json()["marginal_savings_rate"], abs=0.02
    )


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


def test_curve_runs_to_gross_income_or_the_gift():
    request = BY_NAME["single New Yorker, $150,000, 10% pledge"]["request"]
    gross = household_gross_income(request["household"], 2026)
    assert gross >= 150_000
    axis = situation_from_household(request["household"], 2026, 0)["axes"]
    assert axis[0][0]["max"] == pytest.approx(gross)
    bigger = situation_from_household(request["household"], 2026, 400_000)
    assert bigger["axes"][0][0]["max"] == 400_000


def test_curve_reaches_benefit_income():
    """Social Security is not market income but can fund a gift."""
    retiree = copy.deepcopy(SINGLE["household"])
    person = retiree["people"]["adult-1"]
    person["age"] = {"2026": 70}
    del person["employment_income"]
    person["social_security_retirement"] = {"2026": 60_000}
    assert household_gross_income(retiree, 2026) >= 60_000
    response = client.post(
        "/api/target-donation",
        json={"household": retiree, "year": 2026, "target_reduction": 5_000},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["required_donation"] >= 5_000 - TOLERANCE
    assert body["actual_reduction"] == pytest.approx(5_000, abs=50)


def test_curve_at_the_gift_equals_the_point_run():
    """A gift above income ends the axis, so the last point is the gift."""
    request = copy.deepcopy(
        BY_NAME["married itemizers in Texas with a mortgage, $10,000 gift"][
            "request"
        ]
    )
    request["donation_amount"] = 300_000
    body = client.post("/api/calculate", json=request).json()
    assert body["curve"][-1]["donation"] == pytest.approx(300_000)
    assert body["curve"][-1]["net_tax"] == pytest.approx(
        body["net_tax_at_donation"], abs=TOLERANCE
    )


def test_person_order_after_the_donor_does_not_matter():
    fixture = BY_NAME[
        "married Californians with two children and investment income"
    ]
    request = fixture["request"]
    people = request["household"]["people"]
    donor, *others = list(people)
    reordered = copy.deepcopy(request)
    reordered["household"]["people"] = {
        person: people[person] for person in [donor, *reversed(others)]
    }
    # Each request runs its own simulations, not the other's cached ones.
    clear_caches()
    new = client.post("/api/calculate", json=reordered).json()
    clear_caches()
    old = client.post("/api/calculate", json=request).json()
    for key in ("baseline_net_tax", "tax_savings"):
        assert new[key] == pytest.approx(old[key], abs=TOLERANCE)


def test_target_reduction_is_reached_or_refused():
    single = {"household": SINGLE["household"], "year": 2026}
    reached = client.post(
        "/api/target-donation", json={**single, "target_reduction": 8_000}
    )
    assert reached.status_code == 200, reached.text
    body = reached.json()
    point = client.post(
        "/api/calculate",
        json={**single, "donation_amount": body["required_donation"]},
    ).json()
    reduction = (
        point["baseline_net_income"] - point["net_income_after_donation"]
    )
    assert reduction == pytest.approx(body["actual_reduction"], abs=1)
    assert reduction == pytest.approx(8_000, abs=50)
    refused = client.post(
        "/api/target-donation", json={**single, "target_reduction": 10**7}
    )
    assert refused.status_code == 400, refused.text


def test_target_share_of_no_income_is_refused():
    """A percentage of zero net income was a division by zero (500)."""
    response = client.post(
        "/api/target-donation",
        json={
            "income": {"wages_and_salaries": 0},
            "state_code": "TX",
            "year": 2026,
            "target_reduction": 10,
            "is_percentage": True,
        },
    )
    assert response.status_code == 400, response.text


def test_donor_is_the_first_person():
    request = BY_NAME[
        "married itemizers in Texas with a mortgage, $10,000 gift"
    ]["request"]
    situation = situation_from_household(request["household"], 2026, 0)
    sim = create_donation_simulation(situation, 5_000)
    by_person = sim.calculate(DONATION_VARIABLE, 2026)
    assert list(by_person) == [5_000, 0]


def test_accepts_a_household_keyed_by_next_year():
    """A household sent for next year passes the checks and runs. The
    bunching check's own move to next year, with birthdays, is tested in
    test_savings_wizard.py."""
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
            "must be a number",
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
        (lambda h: h.pop("marital_units"), "marital_units is required"),
        (
            lambda h: h["marital_units"].update(
                {"adult-1": {"members": ["adult-1"]}}
            ),
            "has a person's id",
        ),
        (
            lambda h: h["households"]["household"].pop("state_name"),
            "state_name is required",
        ),
        (
            lambda h: h["people"]["adult-1"].update(
                {"employment_income_before_lsr": {"2026": 1}}
            ),
            "is set from employment_income",
        ),
        (
            lambda h: h["people"]["adult-1"].update(
                {"employment_income": {"2026": "1e12"}}
            ),
            "must be a number",
        ),
        (
            lambda h: h["people"]["adult-1"].update(
                {"employment_income": {"2026": 10**400}}
            ),
            "out of range",
        ),
        (
            lambda h: h["people"]["adult-1"].update(
                {"is_disabled": {"2026": 1}}
            ),
            "must be true or false",
        ),
        (
            lambda h: h["households"]["household"].update(
                {"state_name": {"2026": "XX"}}
            ),
            "enum's names",
        ),
        (
            lambda h: h["households"]["household"].update(
                {"state_name": {"2026": True}}
            ),
            "enum's names",
        ),
        (
            lambda h: h["households"]["household"].update(
                {"household_tax": {"2026": 0}}
            ),
            "computed by policyengine-us",
        ),
        (
            lambda h: h["families"]["family"].update(
                {"members": [["adult-1"]]}
            ),
            "members must list people",
        ),
        (
            lambda h: h["marital_units"].update({"m": {"members": []}}),
            "one or two people",
        ),
        (
            lambda h: h["marital_units"].update(
                {f"m{n}": {"members": ["adult-1"]} for n in range(3)}
            ),
            "more groups than people",
        ),
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


def with_adult(household, person_id, age, dependent=False, married=False):
    household = copy.deepcopy(household)
    household["people"][person_id] = {
        "age": {"2026": age},
        "is_tax_unit_dependent": {"2026": dependent},
        "employment_income": {"2026": 80_000},
    }
    for collection in ("families", "tax_units", "spm_units", "households"):
        group = next(iter(household[collection].values()))
        group["members"].append(person_id)
    if married:
        household["marital_units"] = {
            "marital_unit": {"members": ["adult-1", person_id]}
        }
    return household


def test_one_tax_return_one_filer_or_a_couple():
    roommate = with_adult(SINGLE["household"], "roommate", 30)
    assert any("married couple" in e for e in household_errors(roommate, 2026))
    couple = with_adult(SINGLE["household"], "spouse", 30, married=True)
    assert household_errors(couple, 2026) == []
    adult_child = with_adult(couple, "adult-child", 22)
    assert any(
        "more than two" in e for e in household_errors(adult_child, 2026)
    )
    claimed = with_adult(couple, "student", 20, dependent=True)
    assert household_errors(claimed, 2026) == []
    dependent_donor = copy.deepcopy(SINGLE["household"])
    dependent_donor["people"]["adult-1"]["is_tax_unit_dependent"] = {
        "2026": True
    }
    assert any(
        "the donor, must not be a dependent" in e
        for e in household_errors(dependent_donor, 2026)
    )


JSON = st.recursive(
    st.none()
    | st.booleans()
    | st.integers(min_value=-(10**500), max_value=10**500)
    | st.floats()
    | st.text(max_size=8),
    lambda children: st.lists(children, max_size=4)
    | st.dictionaries(st.text(max_size=8), children, max_size=4),
    max_leaves=30,
)


@settings(
    max_examples=300,
    derandomize=True,
    suppress_health_check=[HealthCheck.too_slow],
)
@given(JSON)
def test_household_errors_never_raises_on_any_json(value):
    errors = household_errors(value, 2026)
    assert isinstance(errors, list)
    assert all(isinstance(error, str) for error in errors)


LEAVES = st.none() | st.booleans() | st.integers() | st.text(max_size=6)


@settings(
    max_examples=300,
    derandomize=True,
    suppress_health_check=[HealthCheck.too_slow],
)
@given(st.data())
def test_household_errors_never_raises_on_a_damaged_fixture(data):
    """Swap one value deep inside a real household for arbitrary JSON."""
    household = copy.deepcopy(
        data.draw(st.sampled_from(FIXTURES))["request"]["household"]
    )
    node = household
    while isinstance(node, dict) and node:
        key = data.draw(st.sampled_from(sorted(node)))
        if not isinstance(node[key], dict) or data.draw(st.booleans()):
            node[key] = data.draw(JSON | LEAVES)
            break
        node = node[key]
    assert isinstance(household_errors(household, 2026), list)


class _Variable:
    def __init__(self, **attributes):
        self.is_neutralized = False
        self.end = None
        self.definition_period = "year"
        self.set_input = None
        self.__dict__.update(attributes)


def test_period_error_rejects_values_the_model_would_not_read():
    assert _period_error(_Variable(), "2026") is None
    assert (
        _period_error(_Variable(definition_period="eternity"), "2026") is None
    )
    assert "month values" in _period_error(
        _Variable(definition_period="month"), "2026"
    )
    assert (
        _period_error(
            _Variable(definition_period="month", set_input=print), "2026"
        )
        is None
    )
    assert "ended" in _period_error(_Variable(end="2025-12-31"), "2026")
    assert "switched off" in _period_error(
        _Variable(is_neutralized=True), "2026"
    )


@pytest.mark.parametrize(
    "amount", [1e12, float("inf")], ids=["too large", "infinite"]
)
def test_endpoint_rejects_an_unbounded_gift(amount):
    response = client.post(
        "/api/calculate",
        content=json.dumps(
            {
                "household": SINGLE["household"],
                "donation_amount": amount,
                "year": 2026,
            }
        ),
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 422, response.text


MARRIED = BY_NAME[
    "married Californians with two children and investment income"
]["request"]["household"]


def split_total(total, component):
    """The married household with a total on one adult and its component
    on the other."""
    household = copy.deepcopy(MARRIED)
    first, second = (
        household["people"]["adult-1"],
        household["people"]["adult-2"],
    )
    for record in (first, second):
        record.pop(total, None)
        record.pop(component, None)
    first[total] = {"2026": 150_000}
    second[component] = {"2026": 100_000}
    return household


@pytest.mark.parametrize("total,component", sorted(MOVED_TOTALS.items()))
def test_rejects_a_total_and_its_component_on_different_people(
    total, component
):
    errors = household_errors(split_total(total, component), 2026)
    assert any(f"is set from {total}" in e for e in errors), errors


def test_a_total_overwrites_its_component_on_everyone():
    """Why the check spans people: policyengine-us moves the total onto
    the component for the whole household, so the second adult's wages
    are lost."""
    household = split_total(
        "employment_income", "employment_income_before_lsr"
    )
    sim = Simulation(situation=household)
    wages = sim.calculate("employment_income_before_lsr", 2026)
    assert list(wages[:2]) == [150_000, 0]


@pytest.mark.parametrize(
    "body",
    [
        # An escaped lone surrogate, which UTF-8 can't encode.
        b'{"household": {"people": {"\\ud800": {}}}, '
        b'"donation_amount": 1, "year": 2026}',
        b'{"income": {"wages_and_salaries": 1}, "state_code": "TX", '
        b'"donation_amount": "\\ud800", "year": 2026}',
    ],
    ids=["in a person's id", "as the gift"],
)
def test_422_reports_a_lone_surrogate(body):
    response = client.post(
        "/api/calculate",
        content=body,
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 422, response.text
    assert "\\ud800" in response.text


def test_422_echoes_a_deeply_nested_input_without_failing():
    nested = "[" * 3000 + "]" * 3000
    body = (
        '{"household": {"people": {"a": {"age": {"2026": '
        + nested
        + '}}}}, "donation_amount": 1, "year": 2026}'
    )
    response = client.post(
        "/api/calculate",
        content=body,
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 422, response.text[:200]
    assert '"..."' in response.text


def test_printable_carries_anything_as_json():
    class Unprintable:
        def __str__(self):
            raise RuntimeError

    value = {
        "bytes": b"\xff",
        "complex": complex(1, 2),
        "object": Unprintable(),
        "set": {float("nan")},
        "surrogate": "\ud800",
        1: [float("-inf"), (True, None, 10**400)],
        Unprintable(): 10**5000,
    }
    text = json.dumps(_printable(value), allow_nan=False)
    text.encode("utf-8")
    assert json.loads(text)["1"] == ["-inf", [True, None, 10**400]]
    assert json.loads(text)["object"] == "<Unprintable>"
    assert json.loads(text)["<Unprintable>"] == "<class 'int'>"


def test_axis_varies_only_the_donor():
    """Each cell of the axis simulation gives only its first person a gift."""
    request = BY_NAME[
        "married Californians with two children and investment income"
    ]["request"]
    situation = situation_from_household(request["household"], 2026, 10_000)
    sim = Simulation(situation=situation)
    gifts = sim.calculate(DONATION_VARIABLE, 2026).reshape(-1, 4)
    assert (gifts[:, 1:] == 0).all()
    assert gifts[:, 0].max() > 0


def test_single_parent_matches_the_legacy_request():
    """Head of household, where the two shapes lay out marital units most
    differently: legacy puts everyone in one unit, the wizard one each."""
    household = copy.deepcopy(SINGLE["household"])
    for child in ("dependent-1", "dependent-2"):
        household["people"][child] = {
            "age": {"2026": 10},
            "is_tax_unit_dependent": {"2026": True},
        }
        for collection in ("families", "tax_units", "spm_units", "households"):
            next(iter(household[collection].values()))["members"].append(child)
    new = client.post(
        "/api/calculate",
        json={"household": household, "donation_amount": 15_000, "year": 2026},
    ).json()
    old = client.post(
        "/api/calculate",
        json={
            "income": {"wages_and_salaries": 150_000},
            "state_code": "NY",
            "num_children": 2,
            "donation_amount": 15_000,
            "year": 2026,
        },
    ).json()
    for key in ("baseline_net_tax", "tax_savings", "baseline_net_income"):
        assert new[key] == pytest.approx(old[key], abs=TOLERANCE), key


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
        {
            "household": SINGLE["household"],
            "is_married": False,
            "donation_amount": 1,
            "year": 2026,
        },
    ],
    ids=["wrong year", "both shapes", "neither shape", "legacy field too"],
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
