from policyengine_us import Simulation

from givecalc.constants import CURRENT_YEAR, DEFAULT_AGE


def create_situation(
    wages_and_salaries: float = 0,
    tips: float = 0,
    dividends: float = 0,
    qualified_dividends: float = 0,
    short_term_capital_gains: float = 0,
    long_term_capital_gains: float = 0,
    interest_income: float = 0,
    self_employment_income: float = 0,
    is_married: bool = False,
    state_code: str = "CA",
    num_children: int = 0,
    mortgage_interest: float = 0,
    real_estate_taxes: float = 0,
    medical_out_of_pocket_expenses: float = 0,
    casualty_loss: float = 0,
    in_nyc: bool = False,
    year: int = None,
):
    """
    Creates a PolicyEngine situation with charitable donations axis.

    Args:
        wages_and_salaries (float): Wages and salaries income
        tips (float): Tips income
        dividends (float): Ordinary dividends
        qualified_dividends (float): Qualified dividends
        short_term_capital_gains (float): Short-term capital gains
        long_term_capital_gains (float): Long-term capital gains
        interest_income (float): Interest income
        self_employment_income (float): Self-employment income
        is_married (bool): Whether the person is married
        state_code (str): Two-letter state code (default: "CA")
        num_children (int): Number of dependent children (default: 0)
        mortgage_interest (float): Annual mortgage interest paid
        real_estate_taxes (float): Annual real estate taxes paid
        medical_out_of_pocket_expenses (float): Annual medical expenses paid out of pocket
        casualty_loss (float): Casualty and theft losses from federally declared disasters
        in_nyc (bool): Whether the person lives in NYC
        year (int): Tax year for calculations (default: CURRENT_YEAR)
    Returns:
        dict: Complete situation dictionary for PolicyEngine
    """
    # Use provided year or default to CURRENT_YEAR
    tax_year = year if year is not None else CURRENT_YEAR

    # Calculate total income for donation axes max
    total_income = (
        wages_and_salaries
        + tips
        + dividends
        + short_term_capital_gains
        + long_term_capital_gains
        + interest_income
        + self_employment_income
    )

    # Initialize base situation with primary person
    situation = {
        "people": {
            "you": {
                "age": {tax_year: DEFAULT_AGE},
                "employment_income": {tax_year: wages_and_salaries + tips},
                "taxable_interest_income": {tax_year: interest_income},
                "qualified_dividend_income": {tax_year: qualified_dividends},
                "non_qualified_dividend_income": {
                    tax_year: max(0, dividends - qualified_dividends)
                },
                "short_term_capital_gains": {tax_year: short_term_capital_gains},
                "long_term_capital_gains": {tax_year: long_term_capital_gains},
                "self_employment_income": {tax_year: self_employment_income},
                "charitable_cash_donations": {
                    tax_year: 0
                },  # Initialize for axes
                "mortgage_interest": {tax_year: mortgage_interest},
                "real_estate_taxes": {tax_year: real_estate_taxes},
                "medical_out_of_pocket_expenses": {
                    tax_year: medical_out_of_pocket_expenses
                },
                "casualty_loss": {tax_year: casualty_loss},
            }
        }
    }

    # Initialize members list and keep it accessible
    members = ["you"]

    # Add spouse if married
    if is_married:
        situation["people"]["your spouse"] = {
            "age": {tax_year: DEFAULT_AGE},
            "employment_income": {tax_year: 0},
        }
        members.append("your spouse")

    # Add children first if any
    for i in range(num_children):
        child_id = f"child_{i}"
        situation["people"][child_id] = {
            "age": {tax_year: 10},  # Default age for children
            "employment_income": {tax_year: 0},
        }
        members.append(child_id)

    # Now update the situation with all members included
    situation.update(
        {
            "families": {"your family": {"members": members.copy()}},
            "marital_units": {
                "your marital unit": {"members": members.copy()}
            },
            "tax_units": {
                "tax unit": {
                    "members": members.copy(),
                }
            },
            "spm_units": {"your spm_unit": {"members": members.copy()}},
            "households": {
                "your household": {
                    "members": members.copy(),
                    "state_name": {tax_year: state_code},
                    "in_nyc": {tax_year: in_nyc},
                }
            },
            "axes": [
                [
                    {
                        "name": "charitable_cash_donations",
                        "count": 1001,
                        "min": 0,
                        "max": max(total_income, 1),  # Ensure at least 1 to avoid empty range
                        "period": tax_year,
                    }
                ]
            ],
        }
    )

    return situation
