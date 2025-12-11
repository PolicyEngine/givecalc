"""Tests for UK situation builder."""

import pytest

from givecalc.uk.constants import UK_CURRENT_YEAR
from givecalc.uk.situation import create_uk_situation


class TestCreateUKSituation:
    """Tests for create_uk_situation function."""

    def test_creates_valid_situation_structure(self):
        """Situation should have people, benunits, and households."""
        situation = create_uk_situation(employment_income=50000)

        assert "people" in situation
        assert "benunits" in situation
        assert "households" in situation

    def test_single_person_situation(self):
        """Single person should have correct entity structure."""
        situation = create_uk_situation(employment_income=50000)

        # Check person exists
        assert "you" in situation["people"]

        # Check benunit includes person
        assert "your benunit" in situation["benunits"]
        assert "you" in situation["benunits"]["your benunit"]["members"]

        # Check household includes person
        assert "your household" in situation["households"]
        assert "you" in situation["households"]["your household"]["members"]

    def test_employment_income_set(self):
        """Employment income should be set on person."""
        situation = create_uk_situation(employment_income=50000)
        person = situation["people"]["you"]

        assert "employment_income" in person
        assert person["employment_income"][UK_CURRENT_YEAR] == 50000

    def test_self_employment_income_set(self):
        """Self-employment income should be set on person."""
        situation = create_uk_situation(
            employment_income=0, self_employment_income=30000
        )
        person = situation["people"]["you"]

        assert "self_employment_income" in person
        assert person["self_employment_income"][UK_CURRENT_YEAR] == 30000

    def test_gift_aid_initialized(self):
        """Gift Aid should be initialized on person."""
        situation = create_uk_situation(employment_income=50000)
        person = situation["people"]["you"]

        assert "gift_aid" in person
        assert person["gift_aid"][UK_CURRENT_YEAR] == 0

    def test_married_adds_spouse(self):
        """Married situation should include spouse."""
        situation = create_uk_situation(
            employment_income=50000, is_married=True
        )

        # Check spouse exists
        assert "your partner" in situation["people"]

        # Check spouse in benunit
        members = situation["benunits"]["your benunit"]["members"]
        assert "your partner" in members

        # Check spouse in household
        members = situation["households"]["your household"]["members"]
        assert "your partner" in members

    def test_children_added(self):
        """Children should be added to situation."""
        situation = create_uk_situation(
            employment_income=50000, num_children=2
        )

        # Check children exist
        assert "child_0" in situation["people"]
        assert "child_1" in situation["people"]

        # Check child age is set
        child = situation["people"]["child_0"]
        assert child["age"][UK_CURRENT_YEAR] == 10

        # Check children in benunit
        members = situation["benunits"]["your benunit"]["members"]
        assert "child_0" in members
        assert "child_1" in members

    def test_region_set_default(self):
        """Default region should be London (as default for England)."""
        situation = create_uk_situation(employment_income=50000)
        household = situation["households"]["your household"]

        assert "region" in household
        # London as default region
        assert household["region"][UK_CURRENT_YEAR] == "LONDON"

    def test_region_set_scotland(self):
        """Scotland region should be set correctly."""
        situation = create_uk_situation(
            employment_income=50000, region="SCOTLAND"
        )
        household = situation["households"]["your household"]

        assert household["region"][UK_CURRENT_YEAR] == "SCOTLAND"

    def test_axes_created(self):
        """Axes should be created for donation sweep."""
        situation = create_uk_situation(employment_income=50000)

        assert "axes" in situation
        assert len(situation["axes"]) == 1
        assert len(situation["axes"][0]) == 1

        axis = situation["axes"][0][0]
        assert axis["name"] == "gift_aid"
        assert axis["count"] == 1001
        assert axis["min"] == 0
        assert axis["max"] == 50000
        assert axis["period"] == UK_CURRENT_YEAR

    def test_axes_max_based_on_total_income(self):
        """Axes max should be based on total income."""
        situation = create_uk_situation(
            employment_income=30000, self_employment_income=20000
        )

        axis = situation["axes"][0][0]
        assert axis["max"] == 50000  # 30000 + 20000

    def test_axes_minimum_value(self):
        """Axes max should be at least 1 for zero income."""
        situation = create_uk_situation(employment_income=0)

        axis = situation["axes"][0][0]
        assert axis["max"] >= 1

    def test_custom_year(self):
        """Should allow custom tax year."""
        situation = create_uk_situation(employment_income=50000, year=2024)
        person = situation["people"]["you"]

        assert person["employment_income"][2024] == 50000
        assert situation["axes"][0][0]["period"] == 2024

    def test_default_age_set(self):
        """Default age should be set for adults."""
        situation = create_uk_situation(employment_income=50000)
        person = situation["people"]["you"]

        assert "age" in person
        # Default adult age (30)
        assert person["age"][UK_CURRENT_YEAR] == 30


class TestUKRegions:
    """Tests for UK region handling."""

    @pytest.mark.parametrize(
        "region",
        [
            "LONDON",
            "SCOTLAND",
            "WALES",
            "NORTHERN_IRELAND",
            "NORTH_EAST",
            "SOUTH_WEST",
        ],
    )
    def test_all_regions_supported(self, region):
        """All UK regions should be supported."""
        situation = create_uk_situation(employment_income=50000, region=region)
        household = situation["households"]["your household"]

        assert household["region"][UK_CURRENT_YEAR] == region
