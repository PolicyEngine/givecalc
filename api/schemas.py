"""Pydantic schemas for GiveCalc API request/response validation."""

from typing import Optional

from pydantic import BaseModel, Field


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
    medical_expenses: float = Field(
        default=0, ge=0, description="Medical out-of-pocket expenses"
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
    year: int = Field(
        default=2025, ge=2024, le=2026, description="Tax year for calculations"
    )


class DonationDataPoint(BaseModel):
    """Single data point in donation curve."""

    donation: float
    net_tax: float
    marginal_savings: float
    net_income: float


class TaxBreakdown(BaseModel):
    """Federal and state tax breakdown."""

    federal: float
    state: float
    total: float


class CalculateResponse(BaseModel):
    """Response from donation calculation."""

    # Current donation metrics
    donation_amount: float
    baseline_net_tax: float
    net_tax_at_donation: float
    tax_savings: float
    marginal_savings_rate: float

    # Tax breakdown (federal vs state)
    baseline_tax_breakdown: TaxBreakdown
    donation_tax_breakdown: TaxBreakdown

    # Net income metrics
    baseline_net_income: float
    net_income_after_donation: float

    # Full curve data for charts (donation sweep)
    curve: list[DonationDataPoint]


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
    year: int = Field(
        default=2025, ge=2024, le=2026, description="Tax year for calculations"
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
