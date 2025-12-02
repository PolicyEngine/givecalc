"""GiveCalc API - FastAPI backend powered by PolicyEngine.

This API provides charitable donation tax impact calculations using
PolicyEngine-US for accurate federal and state tax modeling, and
PolicyEngine-UK for UK Gift Aid calculations.
"""

from pathlib import Path

import numpy as np
import yaml
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from givecalc import (
    CURRENT_YEAR,
    add_net_income_columns,
    calculate_donation_effects,
    calculate_donation_metrics,
    calculate_target_donation,
    create_situation,
)
from givecalc.uk import (
    ENGLAND_REGIONS,
    UK_CURRENT_YEAR,
    UK_REGIONS,
    calculate_uk_donation_effects,
    calculate_uk_donation_metrics,
    create_uk_situation,
)

from .schemas import (
    CalculateRequest,
    CalculateResponse,
    DonationDataPoint,
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
    UKTaxProgramsResponse,
)

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
    ],
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
        "tax_year": CURRENT_YEAR,
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


@app.post("/api/calculate", response_model=CalculateResponse)
async def calculate_donation(request: CalculateRequest):
    """Calculate tax impact of a charitable donation.

    Returns tax savings, marginal rates, and full donation curve data.
    """
    try:
        # Build deductions dict
        deductions = request.deductions or {}
        deductions_dict = {
            "mortgage_interest": getattr(deductions, "mortgage_interest", 0),
            "real_estate_taxes": getattr(deductions, "real_estate_taxes", 0),
            "medical_out_of_pocket_expenses": getattr(
                deductions, "medical_expenses", 0
            ),
            "casualty_loss": getattr(deductions, "casualty_loss", 0),
        }

        # Build income dict
        income = request.income
        income_dict = {
            "wages_and_salaries": income.wages_and_salaries,
            "tips": income.tips,
            "dividends": income.dividends,
            "qualified_dividends": income.qualified_dividends,
            "short_term_capital_gains": income.short_term_capital_gains,
            "long_term_capital_gains": income.long_term_capital_gains,
            "interest_income": income.interest_income,
            "self_employment_income": income.self_employment_income,
        }

        # Create situation with axes for donation sweep
        situation = create_situation(
            is_married=request.is_married,
            state_code=request.state_code,
            in_nyc=request.in_nyc,
            num_children=request.num_children,
            year=request.year,
            **income_dict,
            **deductions_dict,
        )

        # Calculate baseline (no donation) metrics
        baseline_metrics = calculate_donation_metrics(situation, 0)
        baseline_net_tax = float(baseline_metrics["baseline_income_tax"][0])
        baseline_net_income = float(baseline_metrics["baseline_net_income"][0])

        # Calculate metrics at specified donation
        donation_metrics = calculate_donation_metrics(
            situation, request.donation_amount
        )
        net_tax_at_donation = float(donation_metrics["baseline_income_tax"][0])
        net_income_at_donation = float(
            donation_metrics["baseline_net_income"][0]
        )

        # Calculate full donation curve
        df = calculate_donation_effects(situation)

        # Add net income columns
        df = add_net_income_columns(df, baseline_metrics)

        # Get marginal savings at donation amount
        # Find closest index to donation amount
        donations = df["charitable_cash_donations"].values
        idx = np.abs(donations - request.donation_amount).argmin()
        marginal_savings_rate = float(df["marginal_savings"].iloc[idx])

        # Build curve data (sample every 10th point for efficiency)
        curve = []
        step = max(1, len(df) // 100)  # ~100 points
        for i in range(0, len(df), step):
            curve.append(
                DonationDataPoint(
                    donation=float(df["charitable_cash_donations"].iloc[i]),
                    net_tax=float(df["income_tax_after_donations"].iloc[i]),
                    marginal_savings=float(df["marginal_savings"].iloc[i]),
                    net_income=float(df["net_income"].iloc[i]),
                )
            )

        # Ensure last point is included
        if len(curve) == 0 or curve[-1].donation != float(
            df["charitable_cash_donations"].iloc[-1]
        ):
            curve.append(
                DonationDataPoint(
                    donation=float(df["charitable_cash_donations"].iloc[-1]),
                    net_tax=float(df["income_tax_after_donations"].iloc[-1]),
                    marginal_savings=float(df["marginal_savings"].iloc[-1]),
                    net_income=float(df["net_income"].iloc[-1]),
                )
            )

        return CalculateResponse(
            donation_amount=request.donation_amount,
            baseline_net_tax=baseline_net_tax,
            net_tax_at_donation=net_tax_at_donation,
            tax_savings=baseline_net_tax - net_tax_at_donation,
            marginal_savings_rate=marginal_savings_rate,
            baseline_net_income=baseline_net_income,
            net_income_after_donation=net_income_at_donation
            - request.donation_amount,
            curve=curve,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/target-donation", response_model=TargetDonationResponse)
async def calculate_target(request: TargetDonationRequest):
    """Calculate required donation to achieve a target net income reduction."""
    try:
        # Build deductions dict
        deductions = request.deductions or {}
        deductions_dict = {
            "mortgage_interest": getattr(deductions, "mortgage_interest", 0),
            "real_estate_taxes": getattr(deductions, "real_estate_taxes", 0),
            "medical_out_of_pocket_expenses": getattr(
                deductions, "medical_expenses", 0
            ),
            "casualty_loss": getattr(deductions, "casualty_loss", 0),
        }

        # Build income dict
        income = request.income
        income_dict = {
            "wages_and_salaries": income.wages_and_salaries,
            "tips": income.tips,
            "dividends": income.dividends,
            "qualified_dividends": income.qualified_dividends,
            "short_term_capital_gains": income.short_term_capital_gains,
            "long_term_capital_gains": income.long_term_capital_gains,
            "interest_income": income.interest_income,
            "self_employment_income": income.self_employment_income,
        }

        # Create situation
        situation = create_situation(
            is_married=request.is_married,
            state_code=request.state_code,
            in_nyc=request.in_nyc,
            num_children=request.num_children,
            year=request.year,
            **income_dict,
            **deductions_dict,
        )

        # Calculate baseline metrics
        baseline_metrics = calculate_donation_metrics(situation, 0)
        baseline_net_income = float(baseline_metrics["baseline_net_income"][0])

        # Calculate donation effects
        df = calculate_donation_effects(situation)
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

        # Build curve data
        curve = []
        step = max(1, len(df) // 100)
        for i in range(0, len(df), step):
            curve.append(
                DonationDataPoint(
                    donation=float(df["charitable_cash_donations"].iloc[i]),
                    net_tax=float(df["income_tax_after_donations"].iloc[i]),
                    marginal_savings=float(df["marginal_savings"].iloc[i]),
                    net_income=float(df["net_income"].iloc[i]),
                )
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
    """Health check endpoint for deployment monitoring."""
    return {"status": "healthy", "tax_year": CURRENT_YEAR}


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
async def calculate_uk_donation(request: UKCalculateRequest):
    """Calculate UK tax impact of a Gift Aid donation.

    Returns tax savings, marginal rates, and full donation curve data.
    """
    try:
        # Validate region
        if request.region not in UK_REGIONS:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid region. Must be one of: {UK_REGIONS}",
            )

        # Create UK situation with axes for donation sweep
        situation = create_uk_situation(
            employment_income=request.income.employment_income,
            self_employment_income=request.income.self_employment_income,
            is_married=request.is_married,
            region=request.region,
            num_children=request.num_children,
            year=request.year,
        )

        # Calculate baseline (no donation) metrics
        baseline_metrics = calculate_uk_donation_metrics(situation, 0)
        baseline_net_tax = float(baseline_metrics["baseline_income_tax"][0])
        baseline_net_income = float(baseline_metrics["baseline_net_income"][0])

        # Calculate metrics at specified donation
        donation_metrics = calculate_uk_donation_metrics(
            situation, request.gift_aid
        )
        net_tax_at_donation = float(donation_metrics["baseline_income_tax"][0])
        net_income_at_donation = float(
            donation_metrics["baseline_net_income"][0]
        )

        # Calculate full donation curve
        df = calculate_uk_donation_effects(situation)

        # Calculate net income column
        df["net_income"] = (
            baseline_net_income
            - (df["income_tax_after_donations"] - baseline_net_tax)
            - df["gift_aid"]
        )

        # Get marginal savings at donation amount
        # Find closest index to donation amount
        donations = df["gift_aid"].values
        idx = np.abs(donations - request.gift_aid).argmin()
        marginal_savings_rate = float(df["marginal_savings"].iloc[idx])

        # Build curve data (sample every 10th point for efficiency)
        curve = []
        step = max(1, len(df) // 100)  # ~100 points
        for i in range(0, len(df), step):
            curve.append(
                UKDonationDataPoint(
                    donation=float(df["gift_aid"].iloc[i]),
                    net_tax=float(df["income_tax_after_donations"].iloc[i]),
                    marginal_savings=float(df["marginal_savings"].iloc[i]),
                    net_income=float(df["net_income"].iloc[i]),
                )
            )

        # Ensure last point is included
        if len(curve) == 0 or curve[-1].donation != float(
            df["gift_aid"].iloc[-1]
        ):
            curve.append(
                UKDonationDataPoint(
                    donation=float(df["gift_aid"].iloc[-1]),
                    net_tax=float(df["income_tax_after_donations"].iloc[-1]),
                    marginal_savings=float(df["marginal_savings"].iloc[-1]),
                    net_income=float(df["net_income"].iloc[-1]),
                )
            )

        return UKCalculateResponse(
            gift_aid=request.gift_aid,
            baseline_net_tax=baseline_net_tax,
            net_tax_at_donation=net_tax_at_donation,
            tax_savings=baseline_net_tax - net_tax_at_donation,
            marginal_savings_rate=marginal_savings_rate,
            baseline_net_income=baseline_net_income,
            net_income_after_donation=net_income_at_donation
            - request.gift_aid,
            curve=curve,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
