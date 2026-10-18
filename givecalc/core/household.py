"""Situations built from policyengine-household-wizard's V1 household payload.

The frontend builds the household with the shared wizard
(github.com/PolicyEngine/policyengine-household-wizard) and sends the output
of its ``toV1HouseholdSituation``. That adapter is the one place that maps
answers to policyengine-us variables, and its property tests check the
mapping against policyengine-us's variable graph (for example, that mortgage
interest goes to the ``home_mortgage_interest`` input, never the computed
``mortgage_interest`` total). GiveCalc adds only the donation, on the first
person.

``household_errors`` enforces that boundary without simulating:

- one household, family, tax unit and SPM unit holding everyone, and a
  ``marital_units`` collection (``{}`` gives everyone their own unit) of
  units of one or two people, with no group named after a person;
- a state on the household;
- at most two people who are not dependents, and two only as a couple in one
  marital unit, since GiveCalc models one tax unit (two unmarried adults in
  it would be filed jointly);
- input variables, plus the few computed ones the wizard writes on purpose,
  each on the entity policyengine-us defines it for, read for the request's
  year, and not alongside the input the model moves a reviewed total onto;
- values for the request's year only, of each variable's type: finite
  numbers within ``MAX_ABS_VALUE``, booleans, or one of an enum's names.
"""

import copy
import math
from enum import Enum

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
# Collections a household must have. Without ``marital_units``,
# policyengine-core puts everyone in one marital unit; ``{}`` gives each
# person their own.
REQUIRED_COLLECTIONS = (*SHARED_GROUPS, "marital_units")

# Computed variables the wizard's V1 adapter sends on purpose, as reviewed in
# its tests: policyengine-us's Simulation moves the first three onto inputs;
# reported SSI goes to everyone or no one; dependency comes from each person's
# kind; and the household's state and county are answers.
WIZARD_COMPUTED_INPUTS = frozenset(
    {
        "employment_income",
        "self_employment_income",
        "long_term_capital_gains",
        "ssi",
        "is_tax_unit_dependent",
        "state_name",
        "county",
    }
)

# policyengine-us's Simulation moves an input on each of these totals onto
# the input beside it, overwriting a value sent for that input.
MOVED_TOTALS = {
    "employment_income": "employment_income_before_lsr",
    "self_employment_income": "self_employment_income_before_lsr",
    "long_term_capital_gains": "long_term_capital_gains_before_response",
}


def donor_id(situation: dict) -> str:
    """The person who gives: the first person, as for an axis's index 0."""
    return next(iter(situation["people"]))


def _type_error(variable, value):
    """Why ``value`` cannot be ``variable``'s value, or None if it can."""
    value_type = variable.value_type
    if value_type is bool:
        return None if isinstance(value, bool) else "must be true or false"
    if value_type in (int, float):
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return "must be a number"
        try:
            number = float(value)
        except OverflowError:
            return "is out of range"
        if not math.isfinite(number) or abs(number) > MAX_ABS_VALUE:
            return "is out of range"
        return None
    if isinstance(value_type, type) and issubclass(value_type, Enum):
        names = variable.possible_values._member_names_
        if isinstance(value, str) and value in names:
            return None
        return "must be one of its enum's names"
    if value_type is str:
        return None if isinstance(value, str) else "must be a string"
    return "has a type GiveCalc does not accept"


def _values_errors(where: str, name: str, values, year: str) -> list:
    variable = system.variables[name]
    if not isinstance(values, dict) or not values:
        return [f"{where}.{name} must map the year to a value"]
    errors = []
    for period, value in values.items():
        if period != year:
            errors.append(
                f"{where}.{name} has period {period}; expected {year}"
            )
        problem = _type_error(variable, value)
        if problem:
            errors.append(f"{where}.{name} {problem}")
    return errors


def _record_errors(
    where: str, record: dict, entity: str, year: str, skip=()
) -> list:
    errors = []
    for name, values in record.items():
        if name in skip:
            continue
        variable = system.variables.get(name)
        if variable is None:
            errors.append(f"{where}: {name} is not a policyengine-us variable")
        elif name == DONATION_VARIABLE:
            errors.append(f"{where}: {name} is set from donation_amount")
        elif variable.entity.key != entity:
            errors.append(
                f"{where}: {name} belongs to {variable.entity.key}, "
                f"not {entity}"
            )
        elif not (
            variable.is_input_variable() or name in WIZARD_COMPUTED_INPUTS
        ):
            errors.append(f"{where}: {name} is computed by policyengine-us")
        elif problem := _period_error(variable, year):
            errors.append(f"{where}: {name} {problem}")
        else:
            errors.extend(_values_errors(where, name, values, year))
    for total, component in MOVED_TOTALS.items():
        if total in record and component in record:
            errors.append(
                f"{where}: {component} is set from {total}; send one"
            )
    return errors


def _period_error(variable, year: str):
    """Why the model would not read a yearly value of ``variable``."""
    if variable.is_neutralized:
        return "is switched off in policyengine-us"
    if variable.end is not None and str(variable.end) < f"{year}-01-01":
        return f"ended on {variable.end}"
    if variable.definition_period not in ("year", "eternity") and (
        variable.set_input is None
    ):
        return f"takes {variable.definition_period} values, not a year's"
    return None


def _members(record, people: dict):
    """The group's member ids, or None if they are not people's ids."""
    members = record.get("members") if isinstance(record, dict) else None
    if not isinstance(members, list) or not all(
        isinstance(member, str) and member in people for member in members
    ):
        return None
    return members


def _filer_errors(household: dict) -> list:
    """GiveCalc models one tax unit: one filer, or a married couple.

    The donor, the first person, must be a filer. Runs only on a household
    with no other errors, so every record and group has the shape the checks
    above require.
    """
    filers = sorted(
        person_id
        for person_id, record in household["people"].items()
        if True not in record.get("is_tax_unit_dependent", {}).values()
    )
    if donor_id(household) not in filers:
        return [
            "the first person, the donor, must not be a dependent "
            "(is_tax_unit_dependent true)"
        ]
    if len(filers) > 2:
        return [
            "household has more than two people who are not dependents; "
            "GiveCalc models one tax return"
        ]
    if len(filers) == 2 and not any(
        sorted(unit["members"]) == filers
        for unit in (household.get("marital_units") or {}).values()
    ):
        return [
            "two people who are not dependents must be a married couple "
            "in one marital unit; mark children and other dependents with "
            "is_tax_unit_dependent"
        ]
    return []


def household_errors(household, year: int) -> list:
    """Problems with a V1 household for ``year``; empty when it is usable.

    The first person is the donor. Returns a list of messages for any JSON
    value and never raises.
    """
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
            _record_errors(f"people.{person_id}", record, "person", year_key)
        )

    everyone = sorted(people)
    for collection, entity in GROUP_ENTITIES.items():
        named_after_people = (
            sorted(set(household.get(collection) or {}) & set(people))
            if isinstance(household.get(collection), dict)
            else []
        )
        for group_id in named_after_people:
            errors.append(
                f"{collection}.{group_id} has a person's id; name groups "
                "differently"
            )
        groups = household.get(collection, {})
        if not isinstance(groups, dict):
            errors.append(f"household.{collection} must be an object")
            continue
        if collection in SHARED_GROUPS and len(groups) != 1:
            errors.append(f"household.{collection} must hold one group")
        if len(groups) > len(people):
            errors.append(
                f"household.{collection} has more groups than people"
            )
            continue
        seen = []
        for group_id, record in groups.items():
            where = f"{collection}.{group_id}"
            members = _members(record, people)
            if members is None:
                errors.append(f"{where}.members must list people")
                continue
            seen.extend(members)
            if collection in SHARED_GROUPS and sorted(members) != everyone:
                errors.append(f"{where} must hold every person")
            if collection == "marital_units" and not 1 <= len(members) <= 2:
                errors.append(f"{where} must hold one or two people")
            errors.extend(
                _record_errors(
                    where, record, entity, year_key, skip=("members",)
                )
            )
        if len(seen) != len(set(seen)):
            errors.append(f"household.{collection} repeats a person")
    for collection in REQUIRED_COLLECTIONS:
        if collection not in household:
            errors.append(f"household.{collection} is required")
    households = household.get("households")
    for group_id, record in (
        households.items() if isinstance(households, dict) else ()
    ):
        if isinstance(record, dict) and "state_name" not in record:
            errors.append(f"households.{group_id}.state_name is required")
    if not errors:
        errors.extend(_filer_errors(household))
    return errors


def household_gross_income(household: dict, year: int) -> float:
    """Market income plus benefits, which ends the donation curve.

    Benefits count so that a household living on Social Security or
    unemployment compensation still gets a curve that can reach its gift.
    """
    simulation = Simulation(situation=copy.deepcopy(household))

    def total(variable):
        return float(
            simulation.calculate(variable, year, map_to="household")[0]
        )

    return total("household_market_income") + total("household_benefits")


def situation_from_household(
    household: dict, year: int, donation_amount: float = 0
) -> dict:
    """A copy of ``household`` with GiveCalc's donation axis on the donor.

    The axis runs from no gift to the household's gross income, or to the
    gift if that is larger, so the curve always reaches the gift.
    """
    situation = copy.deepcopy(household)
    top = max(household_gross_income(household, year), donation_amount, 1)
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
