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

from api.main import app
from api.simulations import clear_caches

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

    rules = RULES["uk"]
    # PolicyEngine UK's year 2026 is the 2026/27 tax year, from 6 April;
    # policyengine-core reads the year's parameters at 1 January. Check both.
    for day in ("01-01", "04-06"):
        p = system.parameters(f"{rules['year']}-{day}").gov.hmrc.income_tax
        assert p.rates.uk.rates[0] == rules["basic_rate"]
        # Scottish relief starts at the intermediate band (index 2), the
        # first band policyengine-uk extends for Gift Aid.
        assert p.rates.scotland.rates.rates[2] == (
            rules["scottish_intermediate_rate"]
        )
        assert p.allowances.personal_allowance.maximum_ANI == (
            rules["personal_allowance_taper_start"]
        )
