# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GiveCalc is a web application that calculates how charitable giving affects taxes. It uses the PolicyEngine-US Python package to compute accurate federal and state tax impacts from charitable donations. Users input their income, filing status, state, and other deductions, and the app shows how donations reduce net taxes through deductions and credits.

## Architecture

```
givecalc/
├── givecalc/           # Core Python calculation package
├── api/                # FastAPI backend
└── frontend/           # React + Vite + TypeScript frontend
```

## Running the Application

### Development

```bash
# Install everything
make install-all

# Start the API (terminal 1)
make api

# Start the frontend (terminal 2)
make frontend
```

- API: http://localhost:8000 (docs at /docs)
- Frontend: http://localhost:5173

### Installation

```bash
# Install Python package in editable mode
pip install -e .

# Or use uv (recommended)
uv pip install --system -e .

# Install frontend dependencies
cd frontend && npm install
```

### Testing

```bash
# Run Python tests with uv
uv run pytest tests/ -v

# Run frontend tests
cd frontend && npm test
```

Key dependencies:
- `policyengine-us>=1.155.0`: Tax and benefit calculations
- `fastapi`: API framework
- `pandas`, `numpy`: Data manipulation
- `scipy`: Optimization for target donation calculations

## Package Structure

### Backend (givecalc/)

- `givecalc/__init__.py`: Clean package API exposing all key functions
- `givecalc/constants.py`: Shared constants (CURRENT_YEAR, colors, default age)
- `givecalc/core/situation.py`: Creates PolicyEngine situation dictionaries
- `givecalc/core/simulation.py`: Creates single-point simulations (no axes)
- `givecalc/calculations/tax.py`: Tax calculation logic
- `givecalc/calculations/donations.py`: Target donation interpolation
- `givecalc/calculations/net_income.py`: Net income calculations

### API (api/)

- FastAPI endpoints for tax calculations
- `/api/states`: List supported states
- `/api/tax-programs/{state}`: Get tax program info for a state
- `/api/calculate`: Calculate donation tax impact
- `/api/target-donation`: Find donation for target reduction
- `/api/health`: Health check

### Frontend (frontend/)

- React + Vite + TypeScript
- TanStack Query for API state management
- Recharts for visualizations
- Tailwind CSS for styling

## PolicyEngine Integration

### Situation Dictionary Structure

PolicyEngine requires a nested dictionary with these entities:
- `people`: Individuals with income, age, deductions
- `families`: Family groupings
- `marital_units`: Marriage-based groupings
- `tax_units`: Tax filing units
- `spm_units`: Supplemental Poverty Measure units
- `households`: Geographic/state information

All entities must have consistent member lists.

### Using Axes for Donation Sweeps

The `axes` parameter creates multiple simulations varying one or more parameters:

```python
"axes": [[{
    "name": "charitable_cash_donations",
    "count": 1001,
    "min": 0,
    "max": employment_income,
    "period": CURRENT_YEAR,
}]]
```

This creates 1001 simulations with donations from $0 to income. When you call `simulation.calculate()`, you get an array of 1001 values.

### Key Variables

- `household_tax`: Total taxes (federal + state + local)
- `household_benefits`: Total benefits (EITC, CTC, SNAP, etc.)
- `household_net_income`: Income minus taxes plus benefits
- Net taxes = `household_tax - household_benefits`

### State Handling

- State is specified via `state_name` in the household entity (two-letter code)
- NYC residents need `in_nyc: True` for NYC-specific taxes
- State-specific deductions/credits are automatically calculated

## Key Patterns

### Creating a Single-Point Simulation

Use `create_donation_simulation()` for calculating metrics at a specific donation:

```python
from givecalc.core.simulation import create_donation_simulation

simulation = create_donation_simulation(situation, donation_amount=5000)
net_tax = simulation.calculate("household_tax", CURRENT_YEAR) - \
          simulation.calculate("household_benefits", CURRENT_YEAR)
```

### Creating a Donation Sweep

Use the situation with axes directly:

```python
from policyengine_us import Simulation

simulation = Simulation(situation=situation)  # situation has axes
donations = simulation.calculate("charitable_cash_donations", map_to="household")
taxes = simulation.calculate("household_tax", map_to="household")
```

### Marginal Tax Savings Calculation

The marginal savings rate is calculated using numpy's gradient:

```python
df["marginal_savings"] = -np.gradient(df.income_tax_after_donations) / \
                         np.gradient(df[donation_column])
```

This gives the tax reduction per dollar donated (e.g., 0.24 = 24¢ saved per $1 donated).

## State Tax Programs

States with special charitable benefits (hardcoded in frontend/src/lib/taxPrograms.ts):
- **AZ**: Dollar-for-dollar tax credit (up to $400-$800)
- **MS**: Foster care charitable tax credit
- **VT**: 5% credit on first $20k in contributions
- **CO**: Subtraction for contributions over $500 with standard deduction
- **NH**: 85% education tax credit

## Deployment

Deploy to Google Cloud Run:

```bash
# Deploy both API and frontend
make deploy

# Or deploy individually
make deploy-api
make deploy-frontend
```

### Environment Variables

**Frontend (build-time):**
- `VITE_API_URL`: Backend API URL (e.g., `https://givecalc-api-xxx.run.app`)

**Backend:**
- `PORT`: Server port (default: 8080, set by Cloud Run)

## Development Tips

### Debugging PolicyEngine Issues

Add these lines to see calculation details:

```python
print(simulation.calculate("variable_name", CURRENT_YEAR))
simulation.trace = True  # Enables detailed calculation tracing
```

### Common Gotchas

1. **Situation modifications**: Always copy situations before modifying to avoid side effects
2. **Member lists**: All entities (family, marital_unit, tax_unit, etc.) must have same members
3. **Year parameter**: Always use `CURRENT_YEAR` constant for consistency
4. **Axes removal**: Remove axes before creating single-point simulations
5. **Net taxes**: Remember to subtract benefits from taxes: `household_tax - household_benefits`
6. **NYC checkbox**: Only show for NY state residents
