# GiveCalc Package

Core calculation logic for the GiveCalc application, separated from the UI layer.

## Installation

```bash
pip install -e .
```

## Usage

```python
from givecalc import (
    create_situation,
    calculate_donation_metrics,
    calculate_donation_effects,
    calculate_target_donation,
)

# Create a situation
situation = create_situation(
    employment_income=100000,
    is_married=True,
    state_code="CA",
    num_children=2
)

# Calculate metrics at a specific donation amount
metrics = calculate_donation_metrics(situation, donation_amount=5000)

# Calculate effects across donation range
df = calculate_donation_effects(situation)

# Find donation to achieve target net income reduction
baseline_metrics = calculate_donation_metrics(situation, donation_amount=0)
required_donation, _, _, _ = calculate_target_donation(
    situation, df, baseline_metrics, target_reduction=10000
)
```

## Testing

```bash
uv run pytest tests/
```

## Package Structure

- `constants.py` - Shared constants (CURRENT_YEAR, colors, etc.)
- `config.py` - Configuration file loading
- `core/`
  - `situation.py` - PolicyEngine situation creation
  - `simulation.py` - Single-point donation simulations
- `calculations/`
  - `tax.py` - Tax calculation functions
  - `donations.py` - Target donation calculations
  - `net_income.py` - Net income calculations
