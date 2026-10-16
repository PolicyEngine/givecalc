"""Situations built from policyengine-household-wizard's V1 household payload.

The frontend builds the household with the shared wizard
(github.com/PolicyEngine/policyengine-household-wizard) and sends the output
of its ``toV1HouseholdSituation``. That adapter is the one place that maps
answers to policyengine-us variables, and its property tests check the
mapping against policyengine-us's variable graph (for example, that mortgage
interest goes to the ``home_mortgage_interest`` input, never the computed
``mortgage_interest`` total). GiveCalc adds only the donation.

``household_errors`` checks the payload's shape, not its variable choices:
one household, family, tax unit and SPM unit holding everyone; variables
that policyengine-us defines, on the entity it defines them for; and values
for the request's year only.
"""

import copy
import math

from policyengine_us import Simulation
from policyengine_us.system import system

# The gift is GiveCalc's to set, on the donor.
DONATION_VARIABLE = "charitable_cash_donations"
DONATION_POINTS = 1001
MAX_PEOPLE = 12
MAX_ABS_VALUE = 1e9

# Group collections and the policyengine-us entity of their variables.
GROUP_ENTITIES = {
    "families": "family",
    "marital_units": "marital_unit",
    "tax_units": "tax_unit",
    "spm_units": "spm_unit",
    "households": "household",
}
# Every person shares one of each of these.
SHARED_GROUPS = ("families", "tax_units", "spm_units", "households")


def donor_id(situation: dict) -> str:
    """The person who gives: the first person, as for an axis's index 0."""
    return next(iter(situation["people"]))


def _value_errors(where: str, variable: str, values, year: str) -> list:
    if variable not in system.variables:
        return [f"{where}: {variable} is not a policyengine-us variable"]
    if variable == DONATION_VARIABLE:
        return [f"{where}: {variable} is set from donation_amount"]
    if not isinstance(values, dict) or not values:
        return [f"{where}.{variable} must map the year to a value"]
    errors = []
    for period, value in values.items():
        if period != year:
            errors.append(
                f"{where}.{variable} has period {period}; expected {year}"
            )
        if isinstance(value, bool) or isinstance(value, str):
            continue
        if not isinstance(value, (int, float)):
            errors.append(
                f"{where}.{variable} must be a number, boolean or string"
            )
        elif not math.isfinite(value) or abs(value) > MAX_ABS_VALUE:
            errors.append(f"{where}.{variable} is out of range")
    return errors


def _entity_errors(
    where: str, record: dict, entity: str, year: str, skip=()
) -> list:
    errors = []
    for variable, values in record.items():
        if variable in skip:
            continue
        defined = system.variables.get(variable)
        if defined is not None and defined.entity.key != entity:
            errors.append(
                f"{where}: {variable} belongs to {defined.entity.key}, "
                f"not {entity}"
            )
            continue
        errors.extend(_value_errors(where, variable, values, year))
    return errors


def household_errors(household, year: int) -> list:
    """Problems with a V1 household for ``year``; empty when it is usable."""
    if not isinstance(household, dict):
        return ["household must be an object"]
    year_key = str(year)
    allowed = {"people", *GROUP_ENTITIES}
    errors = [
        f"household.{key} is not a PolicyEngine US entity collection"
        for key in household
        if key not in allowed
    ]
    people = household.get("people")
    if not isinstance(people, dict) or not people:
        return errors + ["household.people must list at least one person"]
    if len(people) > MAX_PEOPLE:
        return errors + [f"household.people has more than {MAX_PEOPLE}"]
    for person_id, record in people.items():
        if not isinstance(record, dict):
            errors.append(f"people.{person_id} must be an object")
            continue
        errors.extend(
            _entity_errors(f"people.{person_id}", record, "person", year_key)
        )

    everyone = sorted(people)
    for collection, entity in GROUP_ENTITIES.items():
        groups = household.get(collection, {})
        if not isinstance(groups, dict):
            errors.append(f"household.{collection} must be an object")
            continue
        if collection in SHARED_GROUPS and len(groups) != 1:
            errors.append(f"household.{collection} must hold one group")
        seen = []
        for group_id, record in groups.items():
            where = f"{collection}.{group_id}"
            members = (
                record.get("members") if isinstance(record, dict) else None
            )
            if not isinstance(members, list) or not all(
                member in people for member in members
            ):
                errors.append(f"{where}.members must list people")
                continue
            seen.extend(members)
            if collection in SHARED_GROUPS and sorted(members) != everyone:
                errors.append(f"{where} must hold every person")
            errors.extend(
                _entity_errors(
                    where, record, entity, year_key, skip=("members",)
                )
            )
        if len(seen) != len(set(seen)):
            errors.append(f"household.{collection} repeats a person")
    for collection in SHARED_GROUPS:
        if collection not in household:
            errors.append(f"household.{collection} is required")
    return errors


def household_market_income(household: dict, year: int) -> float:
    """The household's market income, which ends the donation curve."""
    simulation = Simulation(situation=copy.deepcopy(household))
    return float(
        simulation.calculate(
            "household_market_income", year, map_to="household"
        )[0]
    )


def situation_from_household(
    household: dict, year: int, donation_amount: float = 0
) -> dict:
    """A copy of ``household`` with GiveCalc's donation axis on the donor.

    The axis runs from no gift to the household's market income, or to the
    gift if that is larger, so the curve always reaches the gift.
    """
    situation = copy.deepcopy(household)
    top = max(household_market_income(household, year), donation_amount, 1)
    situation["axes"] = [
        [
            {
                "name": DONATION_VARIABLE,
                "count": DONATION_POINTS,
                "min": 0,
                "max": top,
                "period": year,
            }
        ]
    ]
    return situation
