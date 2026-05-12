"""Tests for API CORS configuration."""

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("USE_MODAL", "false")

from api.main import app

client = TestClient(app)


@pytest.mark.parametrize(
    "origin",
    [
        "https://givecalc.org",
        "https://www.givecalc.org",
        "https://policyengine.org",
        "https://www.policyengine.org",
    ],
)
def test_production_frontend_origins_can_call_api(origin):
    response = client.options(
        "/api/calculate",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
