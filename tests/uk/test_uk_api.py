"""Tests for UK API endpoints."""

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("USE_MODAL", "false")

from api.main import app

client = TestClient(app)


class TestUKRegionsEndpoint:
    """Tests for /api/uk/regions endpoint."""

    def test_returns_regions_list(self):
        """Should return list of UK regions."""
        response = client.get("/api/uk/regions")
        assert response.status_code == 200
        data = response.json()
        assert "regions" in data
        assert len(data["regions"]) > 0

    def test_includes_scotland(self):
        """Should include Scotland in regions."""
        response = client.get("/api/uk/regions")
        data = response.json()
        region_codes = [r["code"] for r in data["regions"]]
        assert "SCOTLAND" in region_codes

    def test_includes_london(self):
        """Should include London as a region."""
        response = client.get("/api/uk/regions")
        data = response.json()
        region_codes = [r["code"] for r in data["regions"]]
        assert "LONDON" in region_codes

    def test_region_has_name(self):
        """Each region should have a display name."""
        response = client.get("/api/uk/regions")
        data = response.json()
        for region in data["regions"]:
            assert "name" in region
            assert len(region["name"]) > 0


class TestUKCalculateEndpoint:
    """Tests for /api/uk/calculate endpoint."""

    def test_basic_calculation(self):
        """Should calculate tax impact of UK donation."""
        response = client.post(
            "/api/uk/calculate",
            json={
                "income": {"employment_income": 50000},
                "region": "LONDON",
                "gift_aid": 1000,
            },
        )
        assert response.status_code == 200
        data = response.json()

        # Check required fields
        assert "gift_aid" in data
        assert "baseline_net_tax" in data
        assert "net_tax_at_donation" in data
        assert "tax_savings" in data
        assert "marginal_savings_rate" in data
        assert "curve" in data

    def test_returns_positive_tax_savings(self):
        """Higher-rate taxpayers reclaim the gap between 40% and 20%."""
        response = client.post(
            "/api/uk/calculate",
            json={
                "income": {"employment_income": 80000},
                "region": "LONDON",
                "gift_aid": 5000,
            },
        )
        data = response.json()
        # 25% of the net gift: grossed up by 1/0.8, relieved at 40% - 20%.
        assert data["tax_savings"] == pytest.approx(1250, abs=1)

    def test_basic_rate_donor_saves_nothing(self):
        """Basic-rate relief goes to the charity, not the donor.

        £50,000 sits below the higher-rate threshold, so the charity claims
        the 25% top-up and the donor's own tax is unchanged. Production's
        policyengine-uk 2.88.9 returned £1,000 of savings here (2026-10-16).
        """
        response = client.post(
            "/api/uk/calculate",
            json={
                "income": {"employment_income": 50000},
                "region": "LONDON",
                "gift_aid": 5000,
            },
        )
        assert response.json()["tax_savings"] == pytest.approx(0, abs=1)

    def test_higher_income_higher_savings(self):
        """Higher rate taxpayers should have higher marginal savings."""
        # Basic rate taxpayer
        basic_response = client.post(
            "/api/uk/calculate",
            json={
                "income": {"employment_income": 35000},
                "region": "LONDON",
                "gift_aid": 1000,
            },
        )
        basic_data = basic_response.json()

        # Higher rate taxpayer
        higher_response = client.post(
            "/api/uk/calculate",
            json={
                "income": {"employment_income": 80000},
                "region": "LONDON",
                "gift_aid": 1000,
            },
        )
        higher_data = higher_response.json()

        # Higher rate should have higher marginal savings
        assert (
            higher_data["marginal_savings_rate"]
            > basic_data["marginal_savings_rate"]
        )

    def test_curve_has_data_points(self):
        """Response should include curve data for charts."""
        response = client.post(
            "/api/uk/calculate",
            json={
                "income": {"employment_income": 50000},
                "region": "LONDON",
                "gift_aid": 1000,
            },
        )
        data = response.json()
        assert len(data["curve"]) > 10

        # Check curve point structure
        point = data["curve"][0]
        assert "donation" in point
        assert "net_tax" in point
        assert "marginal_savings" in point

    def test_handles_married_couple(self):
        """Should handle married couple scenario."""
        response = client.post(
            "/api/uk/calculate",
            json={
                "income": {"employment_income": 50000},
                "region": "LONDON",
                "gift_aid": 1000,
                "is_married": True,
            },
        )
        assert response.status_code == 200

    def test_handles_scotland_region(self):
        """Should handle Scotland region with different tax rates."""
        response = client.post(
            "/api/uk/calculate",
            json={
                "income": {"employment_income": 50000},
                "region": "SCOTLAND",
                "gift_aid": 1000,
            },
        )
        assert response.status_code == 200

    def test_invalid_region_returns_error(self):
        """Invalid region should return 422 error."""
        response = client.post(
            "/api/uk/calculate",
            json={
                "income": {"employment_income": 50000},
                "region": "INVALID_REGION",
                "gift_aid": 1000,
            },
        )
        assert response.status_code == 422

    def test_zero_income_returns_zero_savings(self):
        """Zero income should have minimal tax savings."""
        response = client.post(
            "/api/uk/calculate",
            json={
                "income": {"employment_income": 0},
                "region": "LONDON",
                "gift_aid": 1000,
            },
        )
        assert response.status_code == 200
        data = response.json()
        # No income means no tax to save from
        assert data["tax_savings"] == 0


class TestUKTaxProgramsEndpoint:
    """Tests for /api/uk/tax-programs endpoint."""

    def test_returns_gift_aid_info(self):
        """Should return UK Gift Aid program information."""
        response = client.get("/api/uk/tax-programs")
        assert response.status_code == 200
        data = response.json()

        assert "gift_aid" in data
        assert "title" in data["gift_aid"]
        assert "description" in data["gift_aid"]
