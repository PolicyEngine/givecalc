# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

GiveCalc is a web application that calculates how charitable giving affects taxes. It has a React/TypeScript frontend and a FastAPI/Python backend deployed on Modal. The backend uses PolicyEngine-US and PolicyEngine-UK packages to compute accurate federal, state, and UK tax impacts from charitable donations.

## Commands

### Frontend (React/TypeScript)

```bash
cd frontend
npm run dev                 # Start Vite dev server
npm run build               # Type-check and build for production
npm test                    # Run vitest tests
npm run test:watch          # Run tests in watch mode
npm run lint                # ESLint check
```

### Backend (Python/FastAPI)

```bash
# Install Python package
make install                # uv pip install --system -e .
make install-dev            # Install with dev dependencies

# Testing
make test                   # Run pytest (uv run pytest tests/ -v)
make test-cov               # Run tests with coverage

# Deploy API to Modal
unset MODAL_TOKEN_ID MODAL_TOKEN_SECRET && modal deploy modal_app.py

# Formatting
make format                 # Format with black (79 chars) and isort
```

### Deployment

```bash
# Frontend deploys to Vercel (auto-deploys from main branch)
# Root vercel.json points to frontend/ directory
# Manual deploy: vercel --prod (from repo root)

# Backend deploys to Modal
unset MODAL_TOKEN_ID MODAL_TOKEN_SECRET && modal deploy modal_app.py
```

Key dependencies:
- Frontend: React 19, Recharts, Tailwind CSS v4, TanStack React Query, Axios, Vite, Vitest
- Backend: `policyengine-us>=1.155.0`, `policyengine-uk>=2.72.3`, FastAPI, scipy

## Architecture

### Overview

```
givecalc/                       # Repository root
├── frontend/                   # React/TypeScript frontend (Vite)
│   ├── src/
│   │   ├── App.tsx            # Main app with QueryClient, country toggle, form/results layout
│   │   ├── main.tsx           # Entry point
│   │   ├── index.css          # Tailwind imports, design tokens, global styles
│   │   ├── components/
│   │   │   ├── Header.tsx     # App header with PolicyEngine branding
│   │   │   ├── InputForm.tsx  # US wizard-style input (donation -> details -> calculate)
│   │   │   ├── UKInputForm.tsx # UK input form (Gift Aid, region, income)
│   │   │   ├── Results.tsx    # Metric cards, charts, methodology explainer
│   │   │   ├── TaxChart.tsx   # Net taxes vs donation (Recharts LineChart)
│   │   │   ├── MarginalChart.tsx # Marginal savings rate (Recharts ComposedChart)
│   │   │   └── TaxInfo.tsx    # Federal/state tax program information
│   │   ├── hooks/
│   │   │   └── useCalculation.ts # React Query hooks for API calls
│   │   ├── lib/
│   │   │   ├── api.ts         # Axios API client, hardcoded states list
│   │   │   ├── types.ts       # TypeScript interfaces and defaults
│   │   │   ├── format.ts      # Currency/percent/number formatters
│   │   │   ├── chartUtils.ts  # Shared chart constants, niceTicks()
│   │   │   └── taxPrograms.ts # Hardcoded tax program data
│   │   └── test/
│   │       ├── setup.ts       # Test setup (@testing-library/jest-dom)
│   │       ├── TaxChart.test.tsx
│   │       └── MarginalChart.test.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   └── vercel.json            # Frontend-specific Vercel config
├── api/                        # FastAPI backend
│   └── main.py                # API routes (/api/calculate, /api/target-donation, /api/uk/*)
├── givecalc/                   # Core Python calculation package
│   ├── __init__.py            # Package API
│   ├── constants.py           # CURRENT_YEAR, colors
│   ├── config.py              # YAML config loader
│   ├── core/
│   │   ├── situation.py       # PolicyEngine situation builder
│   │   └── simulation.py      # Single-point simulation helper
│   └── calculations/
│       ├── tax.py             # Tax calculation logic
│       ├── donations.py       # Target donation interpolation
│       └── net_income.py      # Net income calculations
├── tests/                      # Python test suite
├── modal_app.py               # Modal deployment config
├── config.yaml                # State tax program descriptions
├── vercel.json                # Root Vercel config (builds frontend/)
├── .vercelignore              # Excludes Python dirs from Vercel
└── pyproject.toml             # Python package config
```

### Frontend architecture

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 with custom design tokens in `index.css`
- **Charts**: Recharts (LineChart, ComposedChart, ResponsiveContainer)
- **Data fetching**: TanStack React Query + Axios
- **Testing**: Vitest + React Testing Library + jsdom
- **Country support**: US and UK with separate input forms

### Application flow

1. **User selects country** (US/UK toggle in App.tsx)
2. **User enters donation info** (InputForm wizard step 1)
3. **User enters household details** (InputForm wizard step 2)
4. **Click "Calculate tax impact"** triggers API call via React Query mutation
5. **Results render**: Metric cards + TaxChart + MarginalChart + methodology explainer
6. **Caching**: Client-side cache keyed on form state prevents redundant API calls

### Backend architecture

- **FastAPI** app served on Modal (modal_app.py)
- **API URL**: `https://policyengine--givecalc-fastapi-app.modal.run`
- **Endpoints**: `/api/calculate`, `/api/target-donation`, `/api/uk/calculate`, `/api/uk/regions`, `/api/health`
- **givecalc/ package**: Core calculation engine using PolicyEngine-US and PolicyEngine-UK

## Styling

### Colors (Tailwind tokens in index.css)
- `--color-primary-500: #319795` (teal, primary brand color)
- Full teal palette from 50-900
- Gray scale, semantic colors (success, warning, error, info)

### Fonts
- Inter (imported via Google Fonts in index.css)
- Charts use Inter via `RECHARTS_FONT_STYLE` in `chartUtils.ts`

### Chart constants (chartUtils.ts)
- `CHART_COLORS.TEAL_PRIMARY`: `#319795`
- `CHART_COLORS.DARK_TEAL`: `#1D4044`
- `TOOLTIP_STYLE`: White background with gray border
- `niceTicks()`: Computes rounded axis tick values

## PolicyEngine integration

### Situation dictionary structure

PolicyEngine requires a nested dictionary with entities:
- `people`: Individuals with income, age, deductions
- `families`, `marital_units`, `tax_units`, `spm_units`, `households`

All entities must have consistent member lists.

### Key variables

- `household_tax`: Total taxes (federal + state + local)
- `household_benefits`: Total benefits (EITC, CTC, SNAP, etc.)
- Net taxes = `household_tax - household_benefits`

### Marginal tax savings

Calculated using numpy's gradient on the backend:
```python
df["marginal_savings"] = -np.gradient(df.income_tax_after_donations) / \
                         np.gradient(df[donation_column])
```

## Common gotchas

1. **API URL**: Set `VITE_API_URL` in `frontend/.env` (defaults to `http://localhost:8000`)
2. **Modal deploy**: Must `unset MODAL_TOKEN_ID MODAL_TOKEN_SECRET` before deploying to policyengine workspace
3. **Vercel deploy**: Root `vercel.json` builds frontend/ -- deploy from repo root, not frontend/
4. **NYC checkbox**: Only shown for NY state (handled in InputForm.tsx)
5. **UK/US result mapping**: UK results are mapped to US-compatible format in App.tsx
6. **States list**: Hardcoded in `api.ts` to avoid cold start delays
7. **Chart testing**: Recharts is mocked in tests since jsdom can't render SVG

## Debugging

### Frontend
```bash
cd frontend && npm run dev   # Dev server with hot reload
# Check browser console for API errors
# VITE_API_URL in .env controls backend URL
```

### Backend
```python
from givecalc import CURRENT_YEAR
simulation.trace = True  # Enables detailed calculation tracing
print(simulation.calculate("variable_name", CURRENT_YEAR))
```
