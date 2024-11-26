from policyengine_us import Simulation

YEAR = 2024
DEFAULT_AGE = 30


def create_situation(
    employment_income,
    is_married=False,
    state_code="TX",
    donation_type="cash",
    is_foster_care_org=False,
):
    """
    Creates a PolicyEngine situation with charitable donations axis.

    Args:
        employment_income (float): Primary person's employment income
        is_married (bool): Whether the person is married
        state_code (str): Two-letter state code (default: "TX")
        donation_type (str): Type of donation - "cash" or "non_cash" (default: "cash")

    Returns:
        dict: Complete situation dictionary for PolicyEngine
    """
    # Initialize base situation with primary person
    situation = {
        "people": {
            "you": {
                "age": {YEAR: DEFAULT_AGE},
                "employment_income": {YEAR: employment_income},
            }
        }
    }

    # Initialize members list
    members = ["you"]

    # Add spouse if married
    if is_married:
        situation["people"]["your spouse"] = {
            "age": {YEAR: DEFAULT_AGE},
            "employment_income": {YEAR: 0},
        }
        members.append("your spouse")

    donation_name = (
        "charitable_cash_donations"
        if donation_type == "cash"
        else "charitable_non_cash_donations"
    )

    # Determine which charitable contribution field to use based on state and organization type
    if is_foster_care_org:
        az_donation_field = (
            "az_charitable_contributions_to_qualifying_foster_care_organizations"
        )
        ms_donation_field = (
            "ms_charitable_contributions_to_qualifying_foster_care_organizations"
        )
    else:
        az_donation_field = (
            "az_charitable_contributions_to_qualifying_charitable_organizations"
        )
        ms_donation_field = None

    situation.update(
        {
            "families": {"your family": {"members": members}},
            "marital_units": {"your marital unit": {"members": members}},
            "tax_units": {
                "your tax unit": {
                    "members": members,
                    az_donation_field: {YEAR: 0} if az_donation_field else {},
                    "ms_charitable_contributions_to_qualifying_foster_care_organizations": (
                        {YEAR: 0} if ms_donation_field else {}
                    ),
                }
            },
            "spm_units": {"your spm_unit": {"members": members}},
            "households": {
                "your household": {"members": members, "state_name": {YEAR: state_code}}
            },
            "axes": [
                [
                    {
                        "name": donation_name,
                        "count": 1001,
                        "min": 0,
                        "max": employment_income,
                        "period": YEAR,
                    }
                ]
            ],
        }
    )

    return situation
