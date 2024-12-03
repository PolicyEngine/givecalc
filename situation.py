from policyengine_us import Simulation
from constants import CURRENT_YEAR, DEFAULT_AGE


def create_situation(
    employment_income,
    is_married=False,
    state_code="CA",
    num_children: int = 0,
    mortgage_interest: float = 0,
    real_estate_taxes: float = 0,
    medical_out_of_pocket_expenses: float = 0,
    casualty_loss: float = 0,
    in_nyc: bool = False,
):
    """
    Creates a PolicyEngine situation with charitable donations axis.

    Args:
        employment_income (float): Primary person's employment income
        is_married (bool): Whether the person is married
        state_code (str): Two-letter state code (default: "TX")
        num_children (int): Number of dependent children (default: 0)
        mortgage_interest (float): Annual mortgage interest paid
        real_estate_taxes (float): Annual real estate taxes paid
        medical_out_of_pocket_expenses (float): Annual medical expenses paid out of pocket
        casualty_loss (float): Casualty and theft losses from federally declared disasters
        in_nyc (bool): Whether the person lives in NYC
    Returns:
        dict: Complete situation dictionary for PolicyEngine
    """
    # Initialize base situation with primary person
    situation = {
        "people": {
            "you": {
                "age": {CURRENT_YEAR: DEFAULT_AGE},
                "employment_income": {CURRENT_YEAR: employment_income},
                "mortgage_interest": {CURRENT_YEAR: mortgage_interest},
                "real_estate_taxes": {CURRENT_YEAR: real_estate_taxes},
                "medical_out_of_pocket_expenses": {
                    CURRENT_YEAR: medical_out_of_pocket_expenses
                },
                "casualty_loss": {CURRENT_YEAR: casualty_loss},
            }
        }
    }

    # Initialize members list and keep it accessible
    members = ["you"]

    # Add spouse if married
    if is_married:
        situation["people"]["your spouse"] = {
            "age": {CURRENT_YEAR: DEFAULT_AGE},
            "employment_income": {CURRENT_YEAR: 0},
        }
        members.append("your spouse")

    # Add children first if any
    for i in range(num_children):
        child_id = f"child_{i}"
        situation["people"][child_id] = {
            "age": {CURRENT_YEAR: 10},  # Default age for children
            "employment_income": {CURRENT_YEAR: 0},
        }
        members.append(child_id)



    # Now update the situation with all members included
    situation.update(
        {
            "families": {"your family": {"members": members.copy()}},
            "marital_units": {"your marital unit": {"members": members.copy()}},
            "tax_units": {
                "tax unit": {
                    "members": members.copy(),
                }
            },
            "spm_units": {"your spm_unit": {"members": members.copy()}},
            "households": {
                "your household": {
                    "members": members.copy(),
                    "state_name": {CURRENT_YEAR: state_code},
                    "in_nyc": {CURRENT_YEAR: in_nyc},
                }
            },
            "axes": [
                [
                    {
                        "name": "charitable_cash_donations",
                        "count": 1001,
                        "min": 0,
                        "max": employment_income,
                        "period": CURRENT_YEAR,
                    }
                ]
            ],
        }
    )

    return situation
