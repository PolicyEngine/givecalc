# GiveCalc

Calculate how charitable giving affects your taxes. Powered by [PolicyEngine](https://policyengine.org).

## Overview

GiveCalc helps donors understand the true cost of their charitable contributions by calculating federal and state tax impacts. It uses PolicyEngine-US for accurate microsimulation of the US tax and benefit system.

**Features:**
- Calculate tax savings for any donation amount
- Find the donation needed to achieve a target net income reduction
- Support for all 50 states + DC (including NYC local taxes)
- State-specific charitable tax credit programs (AZ, MS, VT, CO, NH)
- Interactive charts showing tax impact across donation levels

## Architecture

```
givecalc/
├── givecalc/           # Core Python calculation package
├── api/                # FastAPI backend
├── frontend/           # Next.js + TypeScript frontend
└── modal_app.py        # Modal deployment of the API
```

## Development

### Prerequisites

- Python 3.13
- Node.js 22+ and [bun](https://bun.sh)
- [uv](https://github.com/astral-sh/uv) (recommended for Python)

### Quick Start

```bash
# Install everything
make install-all

# Start the API (terminal 1)
make api

# Start the frontend (terminal 2)
make frontend
```

- API: http://localhost:8000 (docs at /docs)
- Frontend: http://localhost:3000

### Testing

```bash
make test           # Run all tests
make test-cov       # Run with coverage
make perf           # Run performance benchmarks
```

### Formatting

```bash
make format         # Format Python and JS/TS code
```

## Deployment

### Frontend (Vercel)

The frontend is auto-deployed to Vercel on push to main.

- Production: https://givecalc.org

### Backend (Modal)

`.github/workflows/deploy-modal.yml` deploys `modal_app.py` on every push to main.
`modal_app.py` pins exact PolicyEngine versions, so a deploy only changes the
model when a PR changes those pins.

Manual deployment (from the repo root):
```bash
unset MODAL_TOKEN_ID MODAL_TOKEN_SECRET && modal deploy modal_app.py
```

- Production API: https://policyengine--givecalc-fastapi-app.modal.run

### Environment Variables

**Frontend (build-time):**
- `NEXT_PUBLIC_API_URL`: Backend API URL

**Backend:**
- `USE_MODAL`: `false` runs calculations in-process (the Modal image sets this)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/states` | GET | List supported states |
| `/api/tax-programs/{state}` | GET | Get tax program info for a state |
| `/api/calculate` | POST | Calculate donation tax impact |
| `/api/target-donation` | POST | Find donation for target reduction |
| `/api/uk/calculate` | POST | Calculate UK Gift Aid tax impact |
| `/api/uk/regions` | GET | List UK regions |
| `/api/health` | GET | Health check |

### US households

`/api/calculate` and `/api/target-donation` take the household as
`household`: the PolicyEngine US situation that
[policyengine-household-wizard](https://github.com/PolicyEngine/policyengine-household-wizard)'s
`toV1HouseholdSituation` builds, with every value keyed by `year`. The wizard
maps each answer to a PolicyEngine US input variable, and its property tests
check that mapping against the model's variable graph. The API adds only the
gift, as `charitable_cash_donations` on the first person, so the household
must not set that variable.

```json
{
  "household": {
    "people": {"adult-1": {"age": {"2026": 40}, "employment_income": {"2026": 150000}}},
    "families": {"family": {"members": ["adult-1"]}},
    "marital_units": {},
    "tax_units": {"tax_unit": {"members": ["adult-1"]}},
    "spm_units": {"spm_unit": {"members": ["adult-1"]}},
    "households": {"household": {"members": ["adult-1"], "state_name": {"2026": "NY"}}}
  },
  "donation_amount": 15000,
  "year": 2026
}
```

The older fields (`income`, `state_code`, `is_married`, `num_children`,
`in_nyc`, `deductions`) still work in place of `household`.

## License

MIT

## Contributing

See [CLAUDE.md](CLAUDE.md) for development guidelines.
