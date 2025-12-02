"""UK situation builder for PolicyEngine-UK simulations."""

from givecalc.uk.constants import (
    UK_CURRENT_YEAR,
    UK_DEFAULT_AGE,
    UK_DEFAULT_REGION,
)


def create_uk_situation(
    employment_income: float = 0,
    self_employment_income: float = 0,
    is_married: bool = False,
    region: str = UK_DEFAULT_REGION,
    num_children: int = 0,
    year: int = None,
):
    """
    Creates a PolicyEngine-UK situation with Gift Aid donations axis.

    Args:
        employment_income (float): Employment income (wages/salary)
        self_employment_income (float): Self-employment income
        is_married (bool): Whether the person has a partner
        region (str): UK region (ENGLAND, SCOTLAND, WALES, NORTHERN_IRELAND)
        num_children (int): Number of dependent children
        year (int): Tax year for calculations (default: UK_CURRENT_YEAR)

    Returns:
        dict: Complete situation dictionary for PolicyEngine-UK
    """
    # Use provided year or default to UK_CURRENT_YEAR
    tax_year = year if year is not None else UK_CURRENT_YEAR

    # Calculate total income for donation axes max
    total_income = employment_income + self_employment_income

    # Initialize base situation with primary person
    situation = {
        "people": {
            "you": {
                "age": {tax_year: UK_DEFAULT_AGE},
                "employment_income": {tax_year: employment_income},
                "self_employment_income": {tax_year: self_employment_income},
                "gift_aid": {tax_year: 0},  # Initialize for axes
            }
        }
    }

    # Initialize members list
    members = ["you"]

    # Add partner if married
    if is_married:
        situation["people"]["your partner"] = {
            "age": {tax_year: UK_DEFAULT_AGE},
            "employment_income": {tax_year: 0},
        }
        members.append("your partner")

    # Add children if any
    for i in range(num_children):
        child_id = f"child_{i}"
        situation["people"][child_id] = {
            "age": {tax_year: 10},  # Default age for children
            "employment_income": {tax_year: 0},
        }
        members.append(child_id)

    # Update situation with UK entity structure
    situation.update(
        {
            "benunits": {"your benunit": {"members": members.copy()}},
            "households": {
                "your household": {
                    "members": members.copy(),
                    "region": {tax_year: region},
                }
            },
            "axes": [
                [
                    {
                        "name": "gift_aid",
                        "count": 1001,
                        "min": 0,
                        "max": max(
                            total_income, 1
                        ),  # Ensure at least 1 to avoid empty range
                        "period": tax_year,
                    }
                ]
            ],
        }
    )

    return situation
