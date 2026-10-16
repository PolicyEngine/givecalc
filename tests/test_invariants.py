"""Properties /api/calculate must satisfy for every household.

Invariants:
- Accounting: net income after the gift equals baseline net income minus
  the gift plus the tax savings.
- Bounds: tax savings are between zero and the gift. GiveCalc models no
  credit that refunds more than a dollar per dollar given.
- Monotonicity: net tax never rises as the gift grows along the curve.
- Differential: the vectorized curve and a single-point simulation agree at
  every grid point, since both evaluate the same household.
"""

import os

import pytest
from fastapi.testclient import TestClient
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

os.environ.setdefault("USE_MODAL", "false")

from api.main import app  # noqa: E402
from givecalc import create_situation  # noqa: E402
from givecalc.calculations.tax import calculate_donation_metrics  # noqa: E402

client = TestClient(app)

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

SETTINGS = settings(
    max_examples=6,
    deadline=None,
    derandomize=True,
    suppress_health_check=[HealthCheck.too_slow],
)


def request_for(h):
    return {
        "income": {"wages_and_salaries": h["wages"]},
        "state_code": h["state_code"],
        "is_married": h["is_married"],
        "num_children": 0,
        "in_nyc": False,
        "donation_amount": round(h["wages"] * h["gift_share"]),
        "deductions": {
            "mortgage_interest": h["mortgage_interest"],
            "real_estate_taxes": h["real_estate_taxes"],
            "casualty_loss": 0,
        },
        "year": h["year"],
    }


@SETTINGS
@given(households)
def test_calculate_invariants(h):
    body = request_for(h)
    response = client.post("/api/calculate", json=body)
    assert response.status_code == 200, response.text
    r = response.json()
    gift = body["donation_amount"]

    # Accounting identity.
    assert r["net_income_after_donation"] == pytest.approx(
        r["baseline_net_income"] - gift + r["tax_savings"], abs=TOLERANCE
    )
    # Bounds.
    assert -TOLERANCE <= r["tax_savings"] <= gift + TOLERANCE
    # Monotonicity along the curve.
    taxes = [point["net_tax"] for point in r["curve"]]
    for before, after in zip(taxes, taxes[1:]):
        assert after <= before + TOLERANCE


@SETTINGS
@given(households, st.integers(min_value=0, max_value=1000))
def test_curve_matches_single_point_simulation(h, grid_index):
    situation = create_situation(
        wages_and_salaries=h["wages"],
        is_married=h["is_married"],
        state_code=h["state_code"],
        mortgage_interest=h["mortgage_interest"],
        real_estate_taxes=h["real_estate_taxes"],
        year=h["year"],
    )
    from givecalc.calculations.tax import calculate_donation_effects

    curve = calculate_donation_effects(situation)
    point = curve.iloc[grid_index]
    single = calculate_donation_metrics(
        situation, float(point["charitable_cash_donations"])
    )
    assert float(single["baseline_income_tax"][0]) == pytest.approx(
        float(point["income_tax_after_donations"]), abs=TOLERANCE
    )
