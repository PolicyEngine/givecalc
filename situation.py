from policyengine_us import Simulation

YEAR = 2024
DEFAULT_AGE = 30


def create_situation(
    employment_income,
    is_married=False,
    state_code="TX",
    donation_type="cash",
    num_children: int = 0,
    mortgage_interest: float = 0,
    real_estate_taxes: float = 0,
    medical_out_of_pocket_expenses: float = 0,
    casualty_loss: float = 0,
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
                "mortgage_interest": {YEAR: mortgage_interest},
                "real_estate_taxes": {YEAR: real_estate_taxes},
                "medical_out_of_pocket_expenses": {
                    YEAR: medical_out_of_pocket_expenses
                },
                "casualty_loss": {YEAR: casualty_loss},
            }
        }
    }

    # Initialize members list and keep it accessible
    members = ["you"]

    # Add spouse if married
    if is_married:
        situation["people"]["your spouse"] = {
            "age": {YEAR: DEFAULT_AGE},
            "employment_income": {YEAR: 0},
        }
        members.append("your spouse")

    # Add children first if any
    for i in range(num_children):
        child_id = f"child_{i}"
        situation["people"][child_id] = {
            "age": {YEAR: 10},  # Default age for children
            "employment_income": {YEAR: 0},
        }
        members.append(child_id)

    donation_name = (
        "charitable_cash_donations"
        if donation_type == "cash"
        else "charitable_non_cash_donations"
    )

    # Determine which charitable contribution field to use based on state and organization type
    az_donation_field = (
        "az_charitable_contributions_to_qualifying_charitable_organizations"
    )

    # Now update the situation with all members included
    situation.update(
        {
            "families": {"your family": {"members": members.copy()}},
            "marital_units": {"your marital unit": {"members": members.copy()}},
            "tax_units": {
                "tax unit": {
                    "members": members.copy(),
                    az_donation_field: {YEAR: 0} if az_donation_field else {},
                }
            },
            "spm_units": {"your spm_unit": {"members": members.copy()}},
            "households": {
                "your household": {
                    "members": members.copy(),
                    "state_name": {YEAR: state_code},
                }
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
