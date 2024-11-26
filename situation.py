from policyengine_us import Simulation

YEAR = 2024
DEFAULT_AGE = 30

def create_situation(employment_income, is_married=False, state_code="TX"):
    """
    Creates a PolicyEngine situation with charitable donations axis.
    
    Args:
        employment_income (float): Primary person's employment income
        is_married (bool): Whether the person is married
        state_code (str): Two-letter state code (default: "TX")
    
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
    
    situation.update({
        "families": {
            "your family": {"members": members}
        },
        "marital_units": {
            "your marital unit": {"members": members}
        },
        "tax_units": {
            "your tax unit": {"members": members}
        },
        "spm_units": {
            "your spm_unit": {"members": members}
        },
        "households": {
            "your household": {
                "members": members,
                "state_name": {YEAR: state_code}
            }
        },
        "axes": [[
            {
                "name": "charitable_cash_donations",
                "count": 1001,  # More granular steps for better accuracy
                "min": 0,
                "max": employment_income,
                "period": YEAR
            }
        ]]
    })
    
    return situation