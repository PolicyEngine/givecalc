# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GiveCalc is a Streamlit web application that calculates how charitable giving affects taxes. It uses the PolicyEngine-US Python package to compute accurate federal and state tax impacts from charitable donations. Users input their income, filing status, state, and other deductions, and the app shows how donations reduce net taxes through deductions and credits.

## Commands

```bash
# Run the Streamlit app
make run                    # or: streamlit run app.py

# Install
make install                # Install package (uv pip install --system -e .)
make install-dev            # Install with dev dependencies

# Testing
make test                   # Run all tests (uv run pytest tests/ -v)
make test-cov               # Run tests with coverage
make test-one TEST=path     # Run specific test (e.g., make test-one TEST=tests/test_tax.py::test_function)
make perf                   # Run performance tests

# Formatting
make format                 # Format with black (79 chars) and isort

# Maintenance
make clean                  # Remove build artifacts
make update                 # Update policyengine-us and policyengine-core
```

Key dependencies:
- `policyengine-us>=1.155.0`: Tax and benefit calculations
- `streamlit`: Web application framework
- `plotly`: Interactive charts
- `scipy`: Optimization for target donation calculations

## Architecture

### Package Structure

The codebase is organized into two main layers:

1. **`givecalc/` package** - Core calculation logic (installable Python package)
2. **UI layer** (`app.py`, `ui/`) - Streamlit interface

### Application Flow

1. **User Input** (`ui/basic.py`, `ui/donations.py`)
   - State selection with NYC checkbox for NY residents
   - Income, filing status, number of children
   - Itemized deductions (mortgage interest, real estate taxes, medical expenses, casualty losses)
   - Initial donation amount

2. **Situation Creation** (`givecalc/core/situation.py`)
   - Builds a PolicyEngine situation dictionary with all household members
   - Creates entities: people, families, marital units, tax units, SPM units, households
   - Adds an "axes" array that varies charitable donations from $0 to income in 1001 steps
   - All calculations use CURRENT_YEAR (2025) from `givecalc/constants.py`

3. **Tax Calculations** (`givecalc/calculations/tax.py`)
   - `calculate_donation_metrics()`: Calculates metrics at a specific donation amount
   - `calculate_donation_effects()`: Runs simulation across donation range using axes
   - Returns DataFrames with income tax (net of benefits) and marginal savings rate

4. **Visualization** (`ui/visualization.py`)
   - Net taxes vs donation amount line chart
   - Marginal giving discount (tax savings per $1 donated)
   - Net income after taxes and donations
   - All charts use PolicyEngine branding (Inter font, teal accent color)

5. **Target Donation Calculator** (`ui/target_donation.py`, `givecalc/calculations/donations.py`)
   - Users can specify a target net income reduction
   - Uses scipy interpolation to find the required donation amount
   - Shows comparison between current and required donation

### Key Files

**Package (givecalc/):**
- `givecalc/__init__.py`: Clean package API exposing all key functions
- `givecalc/constants.py`: Shared constants (CURRENT_YEAR, colors, default age)
- `givecalc/config.py`: Configuration file loading
- `givecalc/core/situation.py`: Creates PolicyEngine situation dictionaries
- `givecalc/core/simulation.py`: Creates single-point simulations (no axes)
- `givecalc/calculations/tax.py`: Tax calculation logic
- `givecalc/calculations/donations.py`: Target donation interpolation
- `givecalc/calculations/net_income.py`: Net income calculations

**UI Layer:**
- `app.py`: Main Streamlit entry point, renders all UI sections
- `ui/basic.py`: Input widgets for income, state, filing status, deductions
- `ui/donations.py`: Donation input widgets
- `ui/tax_results.py`: Tax results display
- `ui/target_donation.py`: Target donation calculator UI
- `ui/visualization.py`: Plotly chart generation
- `ui/tax_info.py`: Displays federal and state tax program information
- `config.yaml`: State-specific tax program descriptions

### Code Organization

```
givecalc/                       # Repository root
├── app.py                      # Main Streamlit app
├── config.yaml                 # State tax program descriptions
├── pyproject.toml              # Package configuration
├── Makefile                    # Build commands
├── givecalc/                   # Core calculation package
│   ├── __init__.py            # Clean package API
│   ├── constants.py           # Shared constants (CURRENT_YEAR, colors)
│   ├── config.py              # YAML config loader
│   ├── core/                  # Core functionality
│   │   ├── situation.py       # PolicyEngine situation builder
│   │   └── simulation.py      # Single-point simulation helper
│   └── calculations/          # Calculation functions
│       ├── tax.py             # Main tax calculations
│       ├── donations.py       # Target donation interpolation
│       └── net_income.py      # Net income calculations
├── ui/                        # Streamlit UI components
│   ├── basic.py               # Basic input widgets
│   ├── donations.py           # Donation input widgets
│   ├── tax_results.py         # Tax results display
│   ├── target_donation.py     # Target donation calculator
│   ├── visualization.py       # Plotly chart generation
│   └── tax_info.py            # Tax program info display
├── tests/                     # Test suite
│   ├── test_situation.py      # Situation creation tests
│   ├── test_tax.py            # Tax calculation tests
│   ├── test_donations.py      # Donation calculation tests
│   └── test_simulation.py     # Simulation tests
└── .streamlit/
    └── config.toml            # Streamlit theme (teal accent)
```

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
from givecalc import create_donation_simulation, CURRENT_YEAR

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

### Adding New Deductions

1. Add parameter to `create_situation()` in `situation.py`
2. Add to person's dictionary (usually "you")
3. Add input widget in `ui/basic.py` or appropriate UI module
4. Update `render_itemized_deductions()` to return the new value
5. Pass through in `app.py` when creating situation

### Marginal Tax Savings Calculation

The marginal savings rate is calculated using numpy's gradient:

```python
df["marginal_savings"] = -np.gradient(df.income_tax_after_donations) / \
                         np.gradient(df[donation_column])
```

This gives the tax reduction per dollar donated (e.g., 0.24 = 24¢ saved per $1 donated).

## Styling

### Colors (from constants.py)
- `TEAL_PRIMARY = "#319795"`: Primary brand color
- `TEAL_ACCENT = "#39C6C0"`: Legacy accent color
- `BLUE_PRIMARY = "#026AA2"`: Chart color

### Fonts
- UI: Inter (loaded via Google Fonts in app.py)
- Charts: Roboto Serif (set in ui/visualization.py)

### Streamlit Theme
See `.streamlit/config.toml` for theme configuration with teal accent.

### Chart Formatting
All charts use `format_fig()` in `ui/visualization.py` which:
- Applies PolicyEngine branding
- Adds PolicyEngine logo
- Sets Roboto Serif font
- Uses white background
- Formats axes with currency and percentage

## State Tax Programs

The `config.yaml` file contains descriptions of federal and state-specific charitable deduction programs. When adding new state programs:

1. Add entry under `state_programs` with two-letter state code
2. Include `title` and `description` fields
3. Update `ui/tax_info.py` if new display logic is needed

States with special charitable benefits:
- **AZ**: Dollar-for-dollar tax credit (up to $400-$800)
- **MS**: Foster care charitable tax credit
- **VT**: 5% credit on first $20k in contributions
- **CO**: Subtraction for contributions over $500 with standard deduction
- **NH**: 85% education tax credit

## PolicyEngine-US Version

The app requires `policyengine-us>=1.155.0` for accurate calculations. The current version is displayed in the app footer (see `constants.py` for version detection logic).

## Common Gotchas

1. **Situation modifications**: Always copy situations before modifying to avoid side effects
2. **Member lists**: All entities (family, marital_unit, tax_unit, etc.) must have same members
3. **Year parameter**: Always use `CURRENT_YEAR` constant for consistency
4. **Axes removal**: Remove axes before creating single-point simulations
5. **Net taxes**: Remember to subtract benefits from taxes: `household_tax - household_benefits`
6. **NYC checkbox**: Only show for NY state residents (handled in `ui/basic.py`)
7. **Caching**: `app.py` uses `@st.cache_data` for expensive calculations - parameter changes invalidate cache

## Debugging PolicyEngine

```python
from givecalc import CURRENT_YEAR

print(simulation.calculate("variable_name", CURRENT_YEAR))
simulation.trace = True  # Enables detailed calculation tracing
```
