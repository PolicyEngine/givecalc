"""/api/savings must report what /api/calculate reports, to the cent.

The light endpoint runs only the $0 and gift simulations; /api/calculate
also runs the donation sweep. Both must give the same headline for every
household. Each comparison clears the simulation caches before each call,
so each endpoint runs its own simulations rather than reading the other's.

Bunching mode must equal what the frontend computed before it existed:
separate /api/calculate runs for next year at the gift and this year at
twice the gift.

Invariants (property tests at the end):
- Bounds: 0 <= tax savings <= gift.
- Accounting: net income after the gift = baseline net income - gift +
  tax savings.
- Bunching identities: every-year savings = this year's savings + next
  year's; the gain = bunched savings - every-year savings.
"""

from datetime import date

import pytest
from fastapi.testclient import TestClient
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from api.main import app
from api.schemas import max_year
from api.simulations import clear_caches

client = TestClient(app)

HEADLINE_FIELDS = [
    "baseline_net_tax",
    "net_tax_at_donation",
    "tax_savings",
    "baseline_net_income",
    "net_income_after_donation",
]


def us_request(
    state,
    wages,
    gift,
    married=False,
    kids=0,
    nyc=False,
    mortgage=0,
    re_tax=0,
    year=2026,
    **income,
):
    return {
        "income": dict({"wages_and_salaries": wages}, **income),
        "state_code": state,
        "is_married": married,
        "num_children": kids,
        "in_nyc": nyc,
        "donation_amount": gift,
        "deductions": {
            "mortgage_interest": mortgage,
            "real_estate_taxes": re_tax,
            "casualty_loss": 0,
        },
        "year": year,
    }


# The households of the 2026-10-16 GiveCalc review's correctness check.
US_HOUSEHOLDS = {
    "single_ca_75k_give1k": us_request("CA", 75_000, 1_000),
    "single_ca_75k_give5k": us_request("CA", 75_000, 5_000),
    "single_tx_75k_give2.5k": us_request("TX", 75_000, 2_500),
    "joint_tx_120k_give3k": us_request("TX", 120_000, 3_000, married=True),
    "single_parent_tx_45k_2kids_give1k": us_request(
        "TX", 45_000, 1_000, kids=2
    ),
    "joint_ny_200k_itemizer_give10k": us_request(
        "NY", 200_000, 10_000, married=True, mortgage=20_000, re_tax=12_000
    ),
    "joint_nyc_300k_itemizer_give20k": us_request(
        "NY",
        300_000,
        20_000,
        married=True,
        nyc=True,
        mortgage=25_000,
        re_tax=15_000,
    ),
    "joint_ca_800k_topbracket_give50k": us_request(
        "CA", 800_000, 50_000, married=True, mortgage=30_000, re_tax=20_000
    ),
    "single_wa_400k_itemizer_give40k": us_request(
        "WA", 400_000, 40_000, mortgage=24_000, re_tax=9_000
    ),
    "single_az_60k_give1k": us_request("AZ", 60_000, 1_000),
    "joint_co_150k_give5k": us_request("CO", 150_000, 5_000, married=True),
    "single_mn_90k_give3k": us_request("MN", 90_000, 3_000),
    "joint_vt_120k_give5k": us_request("VT", 120_000, 5_000, married=True),
    "single_ms_70k_give2k": us_request("MS", 70_000, 2_000),
    "single_ma_100k_give4k": us_request("MA", 100_000, 4_000),
    "single_nv_tipped_50k_give1k": us_request(
        "NV", 30_000, 1_000, tips=20_000
    ),
    "single_ca_75k_give1k_2025": us_request("CA", 75_000, 1_000, year=2025),
    "joint_ny_200k_itemizer_give10k_2025": us_request(
        "NY",
        200_000,
        10_000,
        married=True,
        mortgage=20_000,
        re_tax=12_000,
        year=2025,
    ),
    "single_ny_investor_give8k": us_request(
        "NY",
        60_000,
        8_000,
        dividends=30_000,
        qualified_dividends=20_000,
        long_term_capital_gains=40_000,
        interest_income=5_000,
    ),
    "single_or_self_employed_give3k": us_request(
        "OR", 0, 3_000, self_employment_income=90_000
    ),
    "no_gift": us_request("CA", 75_000, 0),
}


def fresh(path, body):
    """Post with empty caches, so the endpoint runs its own simulations."""
    clear_caches()
    response = client.post(path, json=body)
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.parametrize("name", list(US_HOUSEHOLDS))
def test_savings_matches_calculate_to_the_cent(name):
    body = US_HOUSEHOLDS[name]
    light = fresh("/api/savings", body)
    full = fresh("/api/calculate", body)
    # The same simulations run in both, so the figures are equal exactly,
    # which is stricter than to the cent.
    for field in HEADLINE_FIELDS:
        assert light[field] == full[field], field
    assert light["donation_amount"] == full["donation_amount"]
    assert light["year"] == body["year"]
    assert light["bunching"] is None


# The review's 10% pledge and bunching numbers, from separate /api/calculate
# runs on policyengine-us 2.49.2 (evidence/pledge_and_bunching.json).
PLEDGES = [
    (
        us_request("CA", 75_000, 7_500),
        dict(savings=353, every_year=692, bunched=1_037, gain=345),
    ),
    (
        us_request("NY", 150_000, 15_000),
        dict(savings=1_589, every_year=3_033, bunched=5_853, gain=2_820),
    ),
    (
        us_request(
            "TX", 200_000, 20_000, married=True, mortgage=20_000, re_tax=8_000
        ),
        dict(savings=3_630, every_year=7_063, bunched=8_030, gain=967),
    ),
    (
        us_request(
            "MA",
            300_000,
            30_000,
            married=True,
            mortgage=25_000,
            re_tax=12_000,
        ),
        dict(savings=8_265, every_year=16_530, bunched=16_531, gain=1),
    ),
]


@pytest.mark.parametrize("body, review", PLEDGES)
def test_bunching_matches_separate_calculate_runs(body, review):
    light = fresh("/api/savings", dict(body, bunching=True))
    bunching = light["bunching"]
    gift = body["donation_amount"]

    this_year = fresh("/api/calculate", body)
    next_year = fresh("/api/calculate", dict(body, year=body["year"] + 1))
    doubled = fresh("/api/calculate", dict(body, donation_amount=2 * gift))

    assert round(light["tax_savings"], 2) == round(this_year["tax_savings"], 2)
    assert bunching["next_year"] == body["year"] + 1
    assert round(bunching["next_year_tax_savings"], 2) == round(
        next_year["tax_savings"], 2
    )
    assert round(bunching["next_year_baseline_net_tax"], 2) == round(
        next_year["baseline_net_tax"], 2
    )
    assert round(bunching["next_year_net_tax_at_donation"], 2) == round(
        next_year["net_tax_at_donation"], 2
    )
    assert bunching["bunched_donation_amount"] == 2 * gift
    assert round(bunching["bunched_tax_savings"], 2) == round(
        doubled["tax_savings"], 2
    )
    assert round(bunching["bunched_net_tax"], 2) == round(
        doubled["net_tax_at_donation"], 2
    )

    # The review's rounded figures.
    assert round(light["tax_savings"]) == review["savings"]
    assert round(bunching["every_year_tax_savings"]) == review["every_year"]
    assert round(bunching["bunched_tax_savings"]) == review["bunched"]
    assert round(bunching["bunching_gain"]) == review["gain"]


def test_bunching_rejects_a_next_year_past_the_api_range():
    body = dict(US_HOUSEHOLDS["single_ca_75k_give1k"], bunching=True)
    body["year"] = max_year()
    response = client.post("/api/savings", json=body)
    assert response.status_code == 422
    assert str(max_year()) in response.json()["detail"]


def test_bunching_with_no_gift_gains_nothing():
    body = dict(US_HOUSEHOLDS["no_gift"], bunching=True)
    bunching = fresh("/api/savings", body)["bunching"]
    assert bunching["bunched_donation_amount"] == 0
    assert bunching["bunched_tax_savings"] == 0
    assert bunching["next_year_tax_savings"] == 0
    assert bunching["bunching_gain"] == 0


UK_HOUSEHOLDS = {
    "basic_rate_35k": dict(income={"employment_income": 35_000}, gift=1_000),
    "higher_rate_70k": dict(income={"employment_income": 70_000}, gift=2_000),
    "taper_110k": dict(income={"employment_income": 110_000}, gift=5_000),
    "scotland_70k": dict(
        income={"employment_income": 70_000}, gift=2_000, region="SCOTLAND"
    ),
    "self_employed_60k": dict(
        income={"self_employment_income": 60_000}, gift=1_500
    ),
}


@pytest.mark.parametrize("name", list(UK_HOUSEHOLDS))
def test_uk_savings_matches_uk_calculate_to_the_penny(name):
    h = UK_HOUSEHOLDS[name]
    body = {
        "income": h["income"],
        "region": h.get("region", "LONDON"),
        "gift_aid": h["gift"],
        "is_married": False,
        "num_children": 0,
        "year": 2026,
    }
    light = fresh("/api/uk/savings", body)
    full = fresh("/api/uk/calculate", body)
    for field in HEADLINE_FIELDS:
        assert light[field] == full[field], field
    assert light["gift_aid"] == full["gift_aid"]


def test_uk_savings_rejects_unknown_region():
    response = client.post(
        "/api/uk/savings",
        json={
            "income": {"employment_income": 50_000},
            "region": "ATLANTIS",
            "gift_aid": 100,
        },
    )
    assert response.status_code == 422


def test_health_reports_cache_counts():
    body = client.get("/api/health").json()
    assert body["status"] == "healthy"
    assert body["tax_year"] == date.today().year
    assert set(body["cache"]) == {"points", "curves"}
    for cache in body["cache"].values():
        assert {"hits", "misses", "size", "maxsize"} <= set(cache)


# Float32 simulation outputs carry cents of noise at these magnitudes.
TOLERANCE = 1.0

households = st.fixed_dictionaries(
    {
        "wages": st.integers(min_value=20_000, max_value=600_000),
        "is_married": st.booleans(),
        "state_code": st.sampled_from(["CA", "NY", "TX", "CO", "MN", "VT"]),
        "mortgage_interest": st.sampled_from([0, 15_000, 35_000]),
        "real_estate_taxes": st.sampled_from([0, 6_000, 18_000]),
        "gift_share": st.floats(min_value=0.0, max_value=0.5),
        "year": st.sampled_from([2025, 2026]),
    }
)


@settings(
    max_examples=6,
    deadline=None,
    derandomize=True,
    suppress_health_check=[HealthCheck.too_slow],
)
@given(households)
def test_savings_invariants(h):
    gift = round(h["wages"] * h["gift_share"])
    body = us_request(
        h["state_code"],
        h["wages"],
        gift,
        married=h["is_married"],
        mortgage=h["mortgage_interest"],
        re_tax=h["real_estate_taxes"],
        year=h["year"],
    )
    r = client.post("/api/savings", json=dict(body, bunching=True)).json()
    b = r["bunching"]

    # Bounds.
    assert -TOLERANCE <= r["tax_savings"] <= gift + TOLERANCE
    assert -TOLERANCE <= b["next_year_tax_savings"] <= gift + TOLERANCE
    assert -TOLERANCE <= b["bunched_tax_savings"] <= 2 * gift + TOLERANCE
    # Accounting.
    assert r["net_income_after_donation"] == pytest.approx(
        r["baseline_net_income"] - gift + r["tax_savings"], abs=TOLERANCE
    )
    # Bunching identities hold exactly: they are sums of simulated figures.
    assert b["next_year_tax_savings"] == pytest.approx(
        b["next_year_baseline_net_tax"] - b["next_year_net_tax_at_donation"]
    )
    assert b["bunched_tax_savings"] == pytest.approx(
        r["baseline_net_tax"] - b["bunched_net_tax"]
    )
    assert b["every_year_tax_savings"] == pytest.approx(
        r["tax_savings"] + b["next_year_tax_savings"]
    )
    assert b["bunching_gain"] == pytest.approx(
        b["bunched_tax_savings"] - b["every_year_tax_savings"]
    )
