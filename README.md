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
├── frontend/           # React + Vite + TypeScript frontend
├── ui/                 # Legacy Streamlit UI components
└── app.py              # Legacy Streamlit entry point
```

## Development

### Prerequisites

- Python 3.11+
- Node.js 20+
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
- Frontend: http://localhost:5173

### Legacy Streamlit App

```bash
make run-streamlit
```

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

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/states` | GET | List supported states |
| `/api/tax-programs/{state}` | GET | Get tax program info for a state |
| `/api/calculate` | POST | Calculate donation tax impact |
| `/api/target-donation` | POST | Find donation for target reduction |
| `/api/health` | GET | Health check |

## License

MIT

## Contributing

See [CLAUDE.md](CLAUDE.md) for development guidelines.
