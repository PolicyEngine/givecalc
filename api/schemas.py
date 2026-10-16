"""Pydantic schemas for GiveCalc API request/response validation."""

from datetime import date
from typing import Annotated, Optional

from pydantic import AfterValidator, BaseModel, Field

# Gifts count in the year they are made, so the useful years run to next
# year. The bound is checked against today's date on each request, so a
# container started in December keeps accepting next year in January, and
# one more year covers browsers already in the next year (ahead of UTC).
MIN_YEAR = 2024
YEARS_AHEAD = 2


def max_year() -> int:
    """The latest tax year a request may ask for."""
    return date.today().year + YEARS_AHEAD


def _check_year(year: int) -> int:
    if not MIN_YEAR <= year <= max_year():
        raise ValueError(f"year must be between {MIN_YEAR} and {max_year()}")
    return year


TaxYear = Annotated[int, AfterValidator(_check_year)]


class IncomeInput(BaseModel):
    """Income sources input."""

    wages_and_salaries: float = Field(
        default=0, ge=0, le=10_000_000, description="Wages and salaries"
    )
    tips: float = Field(default=0, ge=0, description="Tips")
    dividends: float = Field(
        default=0, ge=0, description="Dividends (ordinary)"
    )
    qualified_dividends: float = Field(
        default=0, ge=0, description="Qualified dividends"
    )
    short_term_capital_gains: float = Field(
        default=0, ge=0, description="Short-term capital gains"
    )
    long_term_capital_gains: float = Field(
        default=0, ge=0, description="Long-term capital gains"
    )
    interest_income: float = Field(
        default=0, ge=0, description="Interest income"
    )
    self_employment_income: float = Field(
        default=0, ge=0, description="Self-employment income"
    )


class DeductionsInput(BaseModel):
    """Itemized deductions input."""

    mortgage_interest: float = Field(
        default=0, ge=0, description="Annual mortgage interest paid"
    )
    real_estate_taxes: float = Field(
        default=0, ge=0, description="Annual real estate taxes paid"
    )
    casualty_loss: float = Field(
        default=0, ge=0, description="Casualty and theft losses"
    )


class CalculateRequest(BaseModel):
    """Request body for donation calculation."""

    income: IncomeInput = Field(..., description="Income sources")
    state_code: str = Field(
        ..., min_length=2, max_length=2, description="Two-letter state code"
    )
    is_married: bool = Field(
        default=False, description="Filing as married joint"
    )
    num_children: int = Field(
        default=0, ge=0, le=20, description="Number of dependent children"
    )
    in_nyc: bool = Field(
        default=False, description="Subject to NYC income tax"
    )
    donation_amount: float = Field(
        ..., ge=0, description="Charitable donation amount"
    )
    deductions: Optional[DeductionsInput] = Field(
        default_factory=DeductionsInput,
        description="Itemized deductions",
    )
    year: TaxYear = Field(
        default_factory=lambda: date.today().year,
        description="Tax year for calculations",
    )


class DonationDataPoint(BaseModel):
    """Single data point in donation curve."""

    donation: float
    net_tax: float
    marginal_savings: float
    net_income: float


class CalculateResponse(BaseModel):
    """Response from donation calculation."""

    # Current donation metrics
    donation_amount: float
    baseline_net_tax: float
    net_tax_at_donation: float
    tax_savings: float
    marginal_savings_rate: float

    # Net income metrics
    baseline_net_income: float
    net_income_after_donation: float

    # Full curve data for charts (donation sweep)
    curve: list[DonationDataPoint]


class SavingsRequest(CalculateRequest):
    """Request body for the headline savings, without the donation curve."""

    bunching: bool = Field(
        default=False,
        description=(
            "Also compare giving the donation this year and again next "
            "year with giving twice the donation this year and nothing "
            "next year"
        ),
    )


class BunchingResult(BaseModel):
    """Giving two years' donations in one year, against one in each year.

    Each net tax comes from its own simulation; the savings are differences
    of those, and the totals are sums of the savings.
    """

    next_year: int
    next_year_baseline_net_tax: float
    next_year_net_tax_at_donation: float
    next_year_tax_savings: float
    bunched_donation_amount: float
    bunched_net_tax: float
    bunched_tax_savings: float
    # tax_savings this year plus next_year_tax_savings.
    every_year_tax_savings: float
    # bunched_tax_savings minus every_year_tax_savings.
    bunching_gain: float


class SavingsResponse(BaseModel):
    """The headline: what the donation saves and costs, from two runs."""

    year: int
    donation_amount: float
    baseline_net_tax: float
    net_tax_at_donation: float
    tax_savings: float
    baseline_net_income: float
    net_income_after_donation: float
    bunching: Optional[BunchingResult] = None


class TargetDonationRequest(BaseModel):
    """Request body for target donation calculation."""

    income: IncomeInput = Field(..., description="Income sources")
    state_code: str = Field(
        ..., min_length=2, max_length=2, description="Two-letter state code"
    )
    is_married: bool = Field(
        default=False, description="Filing as married joint"
    )
    num_children: int = Field(
        default=0, ge=0, le=20, description="Number of dependent children"
    )
    in_nyc: bool = Field(
        default=False, description="Subject to NYC income tax"
    )
    deductions: Optional[DeductionsInput] = Field(
        default_factory=DeductionsInput,
        description="Itemized deductions",
    )
    target_reduction: float = Field(
        ..., gt=0, description="Target net income reduction"
    )
    is_percentage: bool = Field(
        default=False,
        description="If true, target_reduction is a percentage",
    )
    year: TaxYear = Field(
        default_factory=lambda: date.today().year,
        description="Tax year for calculations",
    )


class TargetDonationResponse(BaseModel):
    """Response from target donation calculation."""

    required_donation: float
    actual_reduction: float
    actual_percentage: float
    baseline_net_income: float
    net_income_after_donation: float

    # Full curve data for charts
    curve: list[DonationDataPoint]


class StateInfo(BaseModel):
    """Information about a state."""

    code: str
    name: str
    has_special_programs: bool = False


class StatesResponse(BaseModel):
    """List of supported states."""

    states: list[StateInfo]


class TaxProgram(BaseModel):
    """Tax program information."""

    title: str
    description: str


class TaxProgramsResponse(BaseModel):
    """Tax programs for a state."""

    federal: TaxProgram
    state: Optional[TaxProgram] = None


# UK-specific schemas


class UKIncomeInput(BaseModel):
    """UK income sources input."""

    employment_income: float = Field(
        default=0, ge=0, le=10_000_000, description="Employment income"
    )
    self_employment_income: float = Field(
        default=0, ge=0, description="Self-employment income"
    )


class UKRegionInfo(BaseModel):
    """Information about a UK region."""

    code: str
    name: str
    nation: str  # England, Scotland, Wales, Northern Ireland


class UKRegionsResponse(BaseModel):
    """List of UK regions."""

    regions: list[UKRegionInfo]


class UKCalculateRequest(BaseModel):
    """Request body for UK donation calculation."""

    income: UKIncomeInput = Field(..., description="Income sources")
    region: str = Field(default="LONDON", description="UK region code")
    gift_aid: float = Field(
        ..., ge=0, description="Gift Aid donation amount (GBP)"
    )
    is_married: bool = Field(default=False, description="Has partner")
    num_children: int = Field(
        default=0, ge=0, le=20, description="Number of dependent children"
    )
    year: TaxYear = Field(
        default_factory=lambda: date.today().year,
        description="Tax year for calculations",
    )


class UKDonationDataPoint(BaseModel):
    """Single data point in UK donation curve."""

    donation: float
    net_tax: float
    marginal_savings: float
    net_income: float


class UKCalculateResponse(BaseModel):
    """Response from UK donation calculation."""

    # Current donation metrics
    gift_aid: float
    baseline_net_tax: float
    net_tax_at_donation: float
    tax_savings: float
    marginal_savings_rate: float

    # Net income metrics
    baseline_net_income: float
    net_income_after_donation: float

    # Full curve data for charts (donation sweep)
    curve: list[UKDonationDataPoint]


class UKSavingsResponse(BaseModel):
    """The UK headline: what the Gift Aid donation saves, from two runs."""

    year: int
    gift_aid: float
    baseline_net_tax: float
    net_tax_at_donation: float
    tax_savings: float
    baseline_net_income: float
    net_income_after_donation: float


class UKTaxProgramsResponse(BaseModel):
    """UK tax programs information."""

    gift_aid: TaxProgram
