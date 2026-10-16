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

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/states` | GET | List supported states |
| `/api/tax-programs/{state}` | GET | Get tax program info for a state |
| `/api/savings` | POST | Tax savings at a donation, from two simulations (optionally a bunching comparison, from three more) |
| `/api/calculate` | POST | Tax savings plus the marginal rate and the donation curve |
| `/api/target-donation` | POST | Find donation for target reduction |
| `/api/uk/savings` | POST | UK Gift Aid tax savings, from two simulations |
| `/api/uk/calculate` | POST | UK Gift Aid savings plus the marginal rate and the donation curve |
| `/api/uk/regions` | GET | List UK regions |
| `/api/health` | GET | Health check |

## License

MIT

## Contributing

See [CLAUDE.md](CLAUDE.md) for development guidelines.
