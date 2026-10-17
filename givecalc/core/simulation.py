import copy

from policyengine_us import Simulation

from givecalc.constants import CURRENT_YEAR
from givecalc.core.household import DONATION_VARIABLE, donor_id


def get_year_from_situation(situation):
    """Extract the tax year from a situation dictionary."""
    # The year is stored in the axes period
    axes = situation.get("axes", [[]])
    if axes and axes[0]:
        return axes[0][0].get("period", CURRENT_YEAR)
    # Fallback: look at any person's age field
    people = situation.get("people", {})
    for person_data in people.values():
        if "age" in person_data:
            years = list(person_data["age"].keys())
            if years:
                return years[0]
    return CURRENT_YEAR


def create_donation_simulation(situation, donation_amount):
    """
    Creates a simulation with the specified donation amount.

    Args:
        situation (dict): Base situation dictionary
        donation_amount (float): Amount of charitable donation

    Returns:
        Simulation: PolicyEngine simulation object with donation
    """
    year = get_year_from_situation(situation)

    # Deep copy: a shallow copy would write the donation into the caller's
    # people dict.
    donation_situation = copy.deepcopy(situation)

    # The donor is the person the donation axis varies.
    donation_situation["people"][donor_id(situation)][DONATION_VARIABLE] = {
        year: donation_amount
    }

    # Remove any axes if they exist
    if "axes" in donation_situation:
        del donation_situation["axes"]

    # Create and return the simulation
    return Simulation(situation=donation_situation)
