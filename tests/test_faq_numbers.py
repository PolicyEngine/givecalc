"""The FAQ's numbers against the API code and the models it pins.

``frontend/src/lib/faqNumbers.json`` holds production API answers for the
FAQ's households (``bun run faq-numbers``); ``faqRules.json`` holds the
rules the FAQ states.

Invariants:
- Differential: the API code here, at the versions uv.lock pins, gives the
  answer the production API recorded for every FAQ request.
- The file records the model versions modal_app.py deploys, which are the
  ones installed here.
- Each rule the FAQ states equals its PolicyEngine parameter in the year
  the FAQ names.
- The Florida example's reasons hold in the model: no state or local income
  tax, adjusted gross income equal to wages, each $10,000 step saving at the
  rate of the bracket its taxable income stays in, and a deduction that stops
  at the cash-gift limit.

When a model update moves a number, rerun ``bun run faq-numbers`` from
``frontend/`` (against a local API, ``GIVECALC_API_URL=http://localhost:8000``,
until the update deploys) and reread the FAQ's words.
"""

import json
import re
from importlib.metadata import version
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.main import app, us_situation
from api.schemas import SavingsRequest
from api.simulations import clear_caches
from givecalc.core.simulation import create_donation_simulation

ROOT = Path(__file__).parent.parent
LIB = ROOT / "frontend" / "src" / "lib"
NUMBERS = json.loads((LIB / "faqNumbers.json").read_text())
RULES = json.loads((LIB / "faqRules.json").read_text())

client = TestClient(app)

CASES = [
    ("/api/savings", name, case) for name, case in NUMBERS["us"].items()
] + [("/api/uk/savings", name, case) for name, case in NUMBERS["uk"].items()]


def numeric_fields(record: dict, prefix: str = "") -> dict:
    """Every number in a response, by its path."""
    fields = {}
    for key, value in record.items():
        if isinstance(value, dict):
            fields.update(numeric_fields(value, f"{prefix}{key}."))
        elif isinstance(value, (int, float)) and not isinstance(value, bool):
            fields[f"{prefix}{key}"] = value
    return fields


@pytest.mark.parametrize(
    "path,name,case", CASES, ids=[name for _, name, _ in CASES]
)
def test_api_gives_the_recorded_answer(path, name, case):
    clear_caches()
    response = client.post(path, json=case["request"])
    assert response.status_code == 200, response.text
    got = numeric_fields(response.json())
    recorded = numeric_fields(case["response"])
    assert got.keys() == recorded.keys()
    for field, value in recorded.items():
        assert got[field] == pytest.approx(value, abs=0.01), field


def test_numbers_record_the_deployed_models():
    modal_app = (ROOT / "modal_app.py").read_text()
    for package, recorded in NUMBERS["models"].items():
        pinned = re.search(rf'"{package}==([^"]+)"', modal_app).group(1)
        assert recorded == pinned, (
            f"faqNumbers.json records {package} {recorded}; modal_app.py "
            f"deploys {pinned}. Rerun `bun run faq-numbers`."
        )
        assert version(package) == pinned


def test_us_rules_match_policyengine_us():
    from policyengine_us.system import system

    rules = RULES["us"]
    p = system.parameters(f"{rules['year']}-01-01").gov.irs
    charity = p.deductions.itemized.charity
    assert charity.non_itemizers_amount.SINGLE == (
        rules["non_itemizer_cap"]["single"]
    )
    assert charity.non_itemizers_amount.JOINT == (
        rules["non_itemizer_cap"]["joint"]
    )
    assert charity.floor.applies
    assert charity.floor.amount == rules["itemizer_floor_share_of_agi"]
    # GiveCalc's gifts are cash to public charities, which the 60% limit
    # covers (26 U.S.C. 170(b)(1)(G)).
    assert charity.ceiling.all == rules["cash_gift_limit_share_of_agi"]
    # The year before, neither rule applied.
    before = system.parameters(f"{rules['year'] - 1}-01-01").gov.irs
    assert not before.deductions.itemized.charity.floor.applies
    assert before.deductions.itemized.charity.non_itemizers_amount.SINGLE == 0
    # The 37% bracket and the 2/37 limit on itemized deductions.
    rates = p.income.bracket.rates
    assert rates["7"] == rules["top_bracket_rate"]
    assert max(rates[str(i)] for i in range(1, 8)) == rates["7"]
    limitation = p.deductions.itemized.limitation
    assert limitation.applies and limitation.obbb.applies
    limit = rules["top_bracket_limit"]
    assert limitation.obbb.rate == pytest.approx(
        limit["numerator"] / limit["denominator"], abs=1e-7
    )
    assert not before.deductions.itemized.limitation.obbb.applies


def test_uk_rules_match_policyengine_uk():
    from policyengine_uk.system import system
    from policyengine_uk.utils.income_tax import (
        first_extended_scottish_threshold,
    )

    rules = RULES["uk"]
    # PolicyEngine UK's year 2026 is the 2026/27 tax year, from 6 April;
    # policyengine-core reads the year's parameters at 1 January. Check both.
    for day in ("01-01", "04-06"):
        p = system.parameters(f"{rules['year']}-{day}").gov.hmrc.income_tax
        assert p.rates.uk.rates[0] == rules["basic_rate"]
        # Scottish relief starts at the first band policyengine-uk extends
        # for Gift Aid, which is the intermediate band.
        scotland = p.rates.scotland.rates
        first = first_extended_scottish_threshold(scotland)
        assert scotland.rates[first] == rules["scottish_intermediate_rate"]
        assert p.allowances.personal_allowance.maximum_ANI == (
            rules["personal_allowance_taper_start"]
        )


FLORIDA_VARIABLES = (
    "adjusted_gross_income",
    "taxable_income",
    "state_income_tax",
    "local_income_tax",
    "tax_unit_itemizes",
    "charitable_deduction",
)


def florida_point(name: str) -> dict:
    """The tax unit's variables for an FAQ case at its gift, simulated the
    way the API simulates it."""
    request = SavingsRequest(**NUMBERS["us"][name]["request"])
    simulation = create_donation_simulation(
        us_situation(request), request.donation_amount
    )
    return {
        variable: float(simulation.calculate(variable, request.year)[0])
        for variable in FLORIDA_VARIABLES
    }


def single_bracket_rate(taxable_income: float, year: int) -> float:
    """The federal rate on a single filer's last dollar of taxable income."""
    from policyengine_us.system import system

    bracket = system.parameters(f"{year}-01-01").gov.irs.income.bracket
    above = sum(
        taxable_income >= bracket.thresholds[str(i)].SINGLE
        for i in range(1, 7)
    )
    return bracket.rates[str(1 + above)]


def extra_savings(smaller: str, larger: str) -> float:
    us = NUMBERS["us"]
    return (
        us[larger]["response"]["tax_savings"]
        - us[smaller]["response"]["tax_savings"]
    )


def test_florida_answer_holds_in_the_model():
    """The Florida answer's reasons: Florida has no state income tax; each
    extra dollar saves at a bracket's rate, then at a lower bracket's; and
    past $150,000, 60% of their income, a larger gift saves nothing more."""
    names = [name for name in NUMBERS["us"] if name.startswith("florida")]
    assert len(names) == 6
    points = {name: florida_point(name) for name in names}
    year = NUMBERS["us"]["florida"]["request"]["year"]
    wages = NUMBERS["us"]["florida"]["request"]["household"]["people"][
        "adult-1"
    ]["employment_income"][str(year)]
    for name, point in points.items():
        assert point["state_income_tax"] == 0, name
        assert point["local_income_tax"] == 0, name
        assert point["adjusted_gross_income"] == wages, name
        # Each gift is past the standard deduction, so it saves through
        # the itemized deduction.
        assert point["tax_unit_itemizes"], name

    rates = []
    for smaller, larger in (
        ("florida", "floridaMore"),
        ("floridaLowerBracket", "floridaLowerBracketMore"),
    ):
        rate = single_bracket_rate(points[smaller]["taxable_income"], year)
        assert single_bracket_rate(points[larger]["taxable_income"], year) == (
            rate
        )
        gifts = (
            NUMBERS["us"][larger]["request"]["donation_amount"]
            - NUMBERS["us"][smaller]["request"]["donation_amount"]
        )
        assert extra_savings(smaller, larger) == pytest.approx(
            rate * gifts, abs=0.01
        )
        rates.append(rate)
    assert rates[1] < rates[0]

    limit = RULES["us"]["cash_gift_limit_share_of_agi"]
    floor = RULES["us"]["itemizer_floor_share_of_agi"]
    at_limit = NUMBERS["us"]["floridaAtLimit"]["request"]["donation_amount"]
    assert at_limit == limit * wages
    capped = (limit - floor) * wages
    for name in ("floridaAtLimit", "floridaOverLimit"):
        assert points[name]["charitable_deduction"] == pytest.approx(
            capped, abs=0.01
        )
    assert extra_savings("floridaAtLimit", "floridaOverLimit") == 0
