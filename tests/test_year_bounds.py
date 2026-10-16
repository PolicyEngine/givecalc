"""The API accepts next year, so the frontend's default keeps working on January 1."""

from api.schemas import MAX_YEAR, CalculateRequest, UKCalculateRequest
from givecalc import CURRENT_YEAR


def test_max_year_is_next_year():
    assert MAX_YEAR == CURRENT_YEAR + 1


def test_requests_accept_next_year():
    us = CalculateRequest(
        income={"wages_and_salaries": 50_000},
        state_code="CA",
        donation_amount=1_000,
        year=CURRENT_YEAR + 1,
    )
    uk = UKCalculateRequest(
        income={"employment_income": 50_000},
        gift_aid=1_000,
        year=CURRENT_YEAR + 1,
    )
    assert us.year == uk.year == CURRENT_YEAR + 1
