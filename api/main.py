"""GiveCalc API - FastAPI backend powered by PolicyEngine.

This API provides charitable donation tax impact calculations using
PolicyEngine-US for accurate federal and state tax modeling, and
PolicyEngine-UK for UK Gift Aid calculations.
"""

import math
from datetime import date
from pathlib import Path

import numpy as np
import yaml
from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from givecalc import (
    add_net_income_columns,
    calculate_target_donation,
    create_situation,
)
from givecalc.core.household import (
    curve_top,
    donation_axes,
    household_for_year,
)
from givecalc.uk import (
    ENGLAND_REGIONS,
    UK_CURRENT_YEAR,
    UK_REGIONS,
    create_uk_situation,
)

from .schemas import (
    BunchingResult,
    CalculateRequest,
    CalculateResponse,
    DonationDataPoint,
    SavingsRequest,
    SavingsResponse,
    StateInfo,
    StatesResponse,
    TargetDonationRequest,
    TargetDonationResponse,
    TaxProgram,
    TaxProgramsResponse,
    UKCalculateRequest,
    UKCalculateResponse,
    UKDonationDataPoint,
    UKRegionInfo,
    UKRegionsResponse,
    UKSavingsResponse,
    UKTaxProgramsResponse,
    max_year,
)
from .simulations import (
    PointMetrics,
    cache_info,
    curve_result,
    donation_curve,
    point_metrics,
    point_metrics_many,
    start_curve,
    worker_count,
)

# The calculation endpoints are plain functions, so FastAPI runs them in its
# threadpool and a long simulation does not block health checks or other
# requests on the same container.
app = FastAPI(
    title="GiveCalc API",
    description=(
        "Calculate how charitable giving affects your taxes. "
        "Powered by PolicyEngine."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


def _printable(value):
    """``value`` with non-finite floats as strings, which JSON can carry."""
    if isinstance(value, float) and not math.isfinite(value):
        return str(value)
    if isinstance(value, dict):
        return {key: _printable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_printable(item) for item in value]
    return value


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    """A 422 like FastAPI's, which can also report an infinite input.

    FastAPI echoes each invalid input; JSON has no infinity, so an infinite
    gift would otherwise turn the 422 into a 500.
    """
    return JSONResponse(
        status_code=422,
        content={"detail": _printable(jsonable_encoder(exc.errors()))},
    )


# Vercel preview deployments of this repo's frontend.
VERCEL_PREVIEW_ORIGINS = (
    r"https://givecalc-[a-z0-9-]+-policy-engine\.vercel\.app"
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "https://givecalc.org",
        "https://www.givecalc.org",
        "https://policyengine.org",
        "https://www.policyengine.org",
    ],
    allow_origin_regex=VERCEL_PREVIEW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Load config at startup
CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"
with open(CONFIG_PATH) as f:
    CONFIG = yaml.safe_load(f)

# State name mapping
STATE_NAMES = {
    "AL": "Alabama",
    "AK": "Alaska",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming",
    "DC": "District of Columbia",
}

# States with special charitable programs
SPECIAL_PROGRAM_STATES = {"AZ", "MS", "VT", "CO", "NH"}


@app.get("/")
async def root():
    """Health check and API info."""
    return {
        "name": "GiveCalc API",
        "version": "1.0.0",
        "description": "Charitable donation tax calculator powered by PolicyEngine",
        "tax_year": date.today().year,
    }


@app.get("/api/states", response_model=StatesResponse)
async def get_states():
    """Get list of supported states."""
    states = [
        StateInfo(
            code=code,
            name=STATE_NAMES.get(code, code),
            has_special_programs=code in SPECIAL_PROGRAM_STATES,
        )
        for code in CONFIG.get("states", [])
    ]
    return StatesResponse(states=states)


@app.get("/api/tax-programs/{state_code}", response_model=TaxProgramsResponse)
async def get_tax_programs(state_code: str):
    """Get federal and state tax program information."""
    state_code = state_code.upper()
    if state_code not in CONFIG.get("states", []):
        raise HTTPException(status_code=404, detail="State not found")

    federal_info = CONFIG.get("federal_info", {})
    state_programs = CONFIG.get("state_programs", {})

    federal = TaxProgram(
        title=federal_info.get("title", "Federal Charitable Deduction"),
        description=federal_info.get("description", ""),
    )

    state = None
    if state_code in state_programs:
        state_info = state_programs[state_code]
        state = TaxProgram(
            title=state_info.get("title", ""),
            description=state_info.get("description", ""),
        )

    return TaxProgramsResponse(federal=federal, state=state)


def us_situation(
    request: CalculateRequest | TargetDonationRequest,
    year: int = None,
    top: float = None,
) -> dict:
    """The household in a US request, with the donation-sweep axes.

    ``year`` overrides the request's tax year. A wizard household
    (policyengine-household-wizard's V1 payload) goes to policyengine-us as
    the wizard built it, moved to ``year`` with everyone that much older;
    the legacy fields go through ``create_situation``.

    A wizard household's curve ends at its gross income, which only a
    simulation gives, so its axis ends at ``top`` (see ``with_curve_top``).
    Point runs read only the axis's year, so they need no ``top``.
    """
    year = request.year if year is None else year
    if request.household is not None:
        situation = household_for_year(request.household, request.year, year)
        situation["axes"] = donation_axes(year, top if top else 1)
        return situation
    deductions = request.deductions or {}
    income = request.income
    return create_situation(
        wages_and_salaries=income.wages_and_salaries,
        tips=income.tips,
        dividends=income.dividends,
        qualified_dividends=income.qualified_dividends,
        short_term_capital_gains=income.short_term_capital_gains,
        long_term_capital_gains=income.long_term_capital_gains,
        interest_income=income.interest_income,
        self_employment_income=income.self_employment_income,
        is_married=request.is_married,
        state_code=request.state_code,
        in_nyc=request.in_nyc,
        num_children=request.num_children,
        mortgage_interest=getattr(deductions, "mortgage_interest", 0),
        real_estate_taxes=getattr(deductions, "real_estate_taxes", 0),
        casualty_loss=getattr(deductions, "casualty_loss", 0),
        year=year,
    )


def with_curve_top(
    request: CalculateRequest | TargetDonationRequest,
    situation: dict,
    baseline: PointMetrics,
    donation: float,
) -> dict:
    """The situation whose curve the request needs.

    A legacy situation's axis already ends at its total income. A wizard
    household's ends at its gross income from the no-gift run, or at the
    gift if larger (as ``situation_from_household`` sets it, without that
    function's extra simulation).
    """
    if request.household is None:
        return situation
    return us_situation(
        request, top=curve_top(baseline.gross_income, donation)
    )


def uk_situation(request: UKCalculateRequest) -> dict:
    """The household in a UK request, with the donation-sweep axes."""
    if request.region not in UK_REGIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid region. Must be one of: {UK_REGIONS}",
        )
    return create_uk_situation(
        employment_income=request.income.employment_income,
        self_employment_income=request.income.self_employment_income,
        is_married=request.is_married,
        region=request.region,
        num_children=request.num_children,
        year=request.year,
    )


def baseline_metrics_dict(baseline: PointMetrics) -> dict:
    """The $0 run in the form the curve helpers take."""
    return {
        "baseline_income_tax": baseline.net_tax,
        "baseline_net_income": baseline.household_net_income,
    }


def sample_curve(df, donation_column: str, point_type) -> list:
    """About 100 evenly spaced points of the sweep, including both ends."""
    step = max(1, len(df) // 100)
    indices = list(range(0, len(df), step))
    if indices[-1] != len(df) - 1:
        indices.append(len(df) - 1)
    return [
        point_type(
            donation=float(df[donation_column].iloc[i]),
            net_tax=float(df["income_tax_after_donations"].iloc[i]),
            marginal_savings=float(df["marginal_savings"].iloc[i]),
            net_income=float(df["net_income"].iloc[i]),
        )
        for i in indices
    ]


def marginal_rate_at(df, donation_column: str, donation: float) -> float:
    """The sweep's marginal savings rate at the grid point nearest
    ``donation``. It is a central difference over the grid, so at a kink
    it averages the rates on either side."""
    idx = np.abs(df[donation_column].values - donation).argmin()
    return float(df["marginal_savings"].iloc[idx])


@app.post("/api/calculate", response_model=CalculateResponse)
def calculate_donation(request: CalculateRequest):
    """Calculate tax impact of a charitable donation.

    Returns tax savings, marginal rates, and full donation curve data.
    Runs three simulations: $0, the donation, and the donation sweep.
    """
    try:
        gift = request.donation_amount
        situation = us_situation(request)
        # A legacy curve can start with the point runs; a wizard
        # household's needs the no-gift run's gross income first.
        curve = None
        if request.household is None:
            curve = start_curve("us", situation)
        baseline, at_donation = point_metrics_many(
            "us", [(situation, 0), (situation, gift)]
        )
        if curve is None:
            curve = start_curve(
                "us", with_curve_top(request, situation, baseline, gift)
            )
        df = add_net_income_columns(
            curve_result(curve), baseline_metrics_dict(baseline)
        )

        return CalculateResponse(
            donation_amount=request.donation_amount,
            baseline_net_tax=baseline.net_tax,
            net_tax_at_donation=at_donation.net_tax,
            tax_savings=baseline.net_tax - at_donation.net_tax,
            marginal_savings_rate=marginal_rate_at(
                df, "charitable_cash_donations", request.donation_amount
            ),
            baseline_net_income=baseline.household_net_income,
            net_income_after_donation=at_donation.household_net_income
            - request.donation_amount,
            curve=sample_curve(
                df, "charitable_cash_donations", DonationDataPoint
            ),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/savings", response_model=SavingsResponse)
def calculate_savings(request: SavingsRequest):
    """What a donation saves in tax, without the donation curve.

    Runs two simulations: the household at $0 and at the donation. With
    ``bunching``, three more: next year at $0 and at the donation, and
    this year at twice the donation. No figure is read off the curve.
    """
    next_year = request.year + 1
    if request.bunching and next_year > max_year():
        raise HTTPException(
            status_code=422,
            detail=f"bunching needs next year ({next_year}) to be at most "
            f"{max_year()}",
        )
    try:
        gift = request.donation_amount
        situation = us_situation(request)
        runs = [(situation, 0), (situation, gift)]
        if request.bunching:
            next_situation = us_situation(request, year=next_year)
            runs += [(next_situation, 0), (next_situation, gift)]
            runs += [(situation, 2 * gift)]
        # Every run starts at once; with workers they run in parallel.
        results = point_metrics_many("us", runs)
        baseline, at_donation = results[:2]
        tax_savings = baseline.net_tax - at_donation.net_tax

        bunching = None
        if request.bunching:
            next_baseline, next_at_donation, bunched = results[2:]
            next_year_tax_savings = (
                next_baseline.net_tax - next_at_donation.net_tax
            )
            bunched_tax_savings = baseline.net_tax - bunched.net_tax
            every_year_tax_savings = tax_savings + next_year_tax_savings
            bunching = BunchingResult(
                next_year=next_year,
                next_year_baseline_net_tax=next_baseline.net_tax,
                next_year_net_tax_at_donation=next_at_donation.net_tax,
                next_year_tax_savings=next_year_tax_savings,
                bunched_donation_amount=2 * gift,
                bunched_net_tax=bunched.net_tax,
                bunched_tax_savings=bunched_tax_savings,
                every_year_tax_savings=every_year_tax_savings,
                bunching_gain=bunched_tax_savings - every_year_tax_savings,
            )

        return SavingsResponse(
            year=request.year,
            donation_amount=gift,
            baseline_net_tax=baseline.net_tax,
            net_tax_at_donation=at_donation.net_tax,
            tax_savings=tax_savings,
            baseline_net_income=baseline.household_net_income,
            net_income_after_donation=at_donation.household_net_income - gift,
            bunching=bunching,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/target-donation", response_model=TargetDonationResponse)
def calculate_target(request: TargetDonationRequest):
    """Calculate required donation to achieve a target net income reduction."""
    try:
        baseline = point_metrics("us", us_situation(request), 0)
        situation = with_curve_top(request, us_situation(request), baseline, 0)
        baseline_metrics = baseline_metrics_dict(baseline)
        baseline_net_income = baseline_metrics["baseline_net_income"]

        df = donation_curve("us", situation)
        df = add_net_income_columns(df, baseline_metrics)

        # Calculate target donation
        result = calculate_target_donation(
            situation=situation,
            df=df,
            baseline_metrics=baseline_metrics,
            target_reduction=request.target_reduction,
            is_percentage=request.is_percentage,
        )

        if result is None:
            raise HTTPException(
                status_code=400,
                detail="Target reduction cannot be achieved with given income",
            )

        (
            required_donation,
            net_income_after,
            actual_reduction,
            actual_percentage,
        ) = result

        curve = sample_curve(
            df, "charitable_cash_donations", DonationDataPoint
        )

        return TargetDonationResponse(
            required_donation=float(required_donation),
            actual_reduction=float(actual_reduction),
            actual_percentage=float(actual_percentage),
            baseline_net_income=baseline_net_income,
            net_income_after_donation=float(net_income_after),
            curve=curve,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
async def health_check():
    """Health check endpoint for deployment monitoring.

    ``cache`` counts this container's simulation cache hits and misses;
    ``simulation_workers`` is its number of simulation processes (0: runs
    happen in the request's thread).
    """
    return {
        "status": "healthy",
        "tax_year": date.today().year,
        "cache": cache_info(),
        "simulation_workers": worker_count(),
    }


# UK region name mapping
UK_REGION_NAMES = {
    "NORTH_EAST": "North East",
    "NORTH_WEST": "North West",
    "YORKSHIRE": "Yorkshire and the Humber",
    "EAST_MIDLANDS": "East Midlands",
    "WEST_MIDLANDS": "West Midlands",
    "EAST_OF_ENGLAND": "East of England",
    "LONDON": "London",
    "SOUTH_EAST": "South East",
    "SOUTH_WEST": "South West",
    "WALES": "Wales",
    "SCOTLAND": "Scotland",
    "NORTHERN_IRELAND": "Northern Ireland",
}


def get_uk_nation(region: str) -> str:
    """Get the nation for a UK region."""
    if region in ENGLAND_REGIONS:
        return "England"
    elif region == "SCOTLAND":
        return "Scotland"
    elif region == "WALES":
        return "Wales"
    elif region == "NORTHERN_IRELAND":
        return "Northern Ireland"
    return "Unknown"


# UK API Endpoints


@app.get("/api/uk/regions", response_model=UKRegionsResponse)
async def get_uk_regions():
    """Get list of UK regions."""
    regions = [
        UKRegionInfo(
            code=code,
            name=UK_REGION_NAMES.get(code, code),
            nation=get_uk_nation(code),
        )
        for code in UK_REGIONS
    ]
    return UKRegionsResponse(regions=regions)


@app.get("/api/uk/tax-programs", response_model=UKTaxProgramsResponse)
async def get_uk_tax_programs():
    """Get UK Gift Aid program information."""
    gift_aid = TaxProgram(
        title="Gift Aid",
        description=(
            "Gift Aid is a UK tax relief that allows charities to reclaim "
            "the basic rate of tax on donations made by UK taxpayers. "
            "For every £1 you donate, the charity can claim an extra 25p "
            "from HMRC (the basic rate of 20%). Higher rate (40%) and "
            "additional rate (45%) taxpayers can also claim back the "
            "difference between their tax rate and the basic rate on their "
            "Self Assessment tax return."
        ),
    )
    return UKTaxProgramsResponse(gift_aid=gift_aid)


@app.post("/api/uk/calculate", response_model=UKCalculateResponse)
def calculate_uk_donation(request: UKCalculateRequest):
    """Calculate UK tax impact of a Gift Aid donation.

    Returns tax savings, marginal rates, and full donation curve data.
    """
    try:
        situation = uk_situation(request)
        curve = start_curve("uk", situation)
        baseline, at_donation = point_metrics_many(
            "uk", [(situation, 0), (situation, request.gift_aid)]
        )
        df = curve_result(curve)
        df["net_income"] = (
            baseline.household_net_income
            - (df["income_tax_after_donations"] - baseline.net_tax)
            - df["gift_aid"]
        )

        return UKCalculateResponse(
            gift_aid=request.gift_aid,
            baseline_net_tax=baseline.net_tax,
            net_tax_at_donation=at_donation.net_tax,
            tax_savings=baseline.net_tax - at_donation.net_tax,
            marginal_savings_rate=marginal_rate_at(
                df, "gift_aid", request.gift_aid
            ),
            baseline_net_income=baseline.household_net_income,
            net_income_after_donation=at_donation.household_net_income
            - request.gift_aid,
            curve=sample_curve(df, "gift_aid", UKDonationDataPoint),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/uk/savings", response_model=UKSavingsResponse)
def calculate_uk_savings(request: UKCalculateRequest):
    """What a Gift Aid donation saves in tax, without the donation curve.

    Runs two simulations: the household at £0 and at the donation.
    """
    try:
        situation = uk_situation(request)
        baseline, at_donation = point_metrics_many(
            "uk", [(situation, 0), (situation, request.gift_aid)]
        )
        return UKSavingsResponse(
            year=request.year,
            gift_aid=request.gift_aid,
            baseline_net_tax=baseline.net_tax,
            net_tax_at_donation=at_donation.net_tax,
            tax_savings=baseline.net_tax - at_donation.net_tax,
            baseline_net_income=baseline.household_net_income,
            net_income_after_donation=at_donation.household_net_income
            - request.gift_aid,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
