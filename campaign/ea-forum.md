# EA Forum Post: GiveCalc v2

**Title:** GiveCalc v2: Now with UK Gift Aid support

**Crosspost to:** LessWrong (optional)

---

## Post Body

*This is an update to our [original GiveCalc announcement](https://forum.effectivealtruism.org/posts/gRLipHaijMn4ffv3a/givecalc-a-new-tool-to-calculate-the-true-cost-of-us) from last year's Giving Tuesday.*

**TL;DR:** [GiveCalc](https://givecalc.org) now supports **UK Gift Aid** alongside US federal and state taxes. We've also added multiple income sources, multi-year tax planning, and improved accuracy through our partnership with NBER/TAXSIM.

## What is GiveCalc?

GiveCalc calculates how charitable donations affect your taxes. Unlike simple calculators that multiply by your marginal rate, GiveCalc uses [PolicyEngine's](https://policyengine.org) comprehensive microsimulation models to account for:

**🇺🇸 US:**
- Standard vs. itemized deduction thresholds
- Tax bracket changes from large donations
- State income taxes and credits (all 50 states + DC + NYC)
- Benefit phase-outs (CTC, EITC, etc.)
- AGI-based deduction limits (60% cap for cash donations)

**🇬🇧 UK:**
- Gift Aid tax relief (charity claims 25p per £1)
- Higher rate relief (40%/45% taxpayers)
- Scottish income tax rates (19%-48%)
- Personal Allowance taper effects (£100k+ income)

The key output is your **marginal giving discount**—how much tax you save on your next pound/dollar of giving at any donation level.

## What's New in v2

### 1. UK Gift Aid Support (New!)

GiveCalc now works for UK taxpayers. Select "United Kingdom" and see how Gift Aid affects your taxes:

- **Basic rate (20%)**: The charity claims Gift Aid, you pay nothing extra
- **Higher rate (40%)**: You save 20p per £1 donated through your tax return
- **Additional rate (45%)**: You save 25p per £1 donated
- **Scotland**: Different rates (19%-48%) mean different savings

The calculator also shows interactions with Personal Allowance tapering—important for £100k+ earners where donations can restore allowance.

### 2. Multiple Income Sources

The original GiveCalc only accepted a single "employment income" field. Version 2 supports:

- Wages and salaries
- Tips
- Ordinary dividends / Qualified dividends
- Short-term / Long-term capital gains
- Interest income
- Self-employment income

This matters because different income types are taxed differently, affecting your marginal rates and optimal donation strategy.

### 3. Multi-Year Tax Planning (US)

You can calculate for **2024, 2025, or 2026** US tax years. This is particularly relevant given recent tax law changes.

**2026 brings significant changes** from the One Big Beautiful Bill Act (HR1):

- **0.5% AGI floor on charitable deductions** — Only donations above 0.5% of your AGI are deductible
- **Non-itemizer charitable deduction restored** — $1,000 for individuals, $2,000 for married couples
- **Itemized deduction limitation** — Deductions capped at 80% of their value for high-income taxpayers

GiveCalc models all of these provisions, allowing you to compare tax savings across years.

### 4. Improved Accuracy

Our calculations are validated against NBER's TAXSIM model through a formal MOU partnership. This means you can trust the numbers—they're the same quality used by academic researchers and congressional offices.

### 5. Always Available

The new architecture (React + FastAPI on Cloud Run) means **no more cold starts**. The old Streamlit app would go to sleep and take 30+ seconds to wake up. Now it's instant.

## Bunching Example

For US donors considering large gifts, bunching multiple years of donations can significantly increase tax savings:

**Scenario:** $200k income in California, planning to give $20k/year

- **Standard approach**: $20k in 2025 + $20k in 2026 = modest savings (may not exceed standard deduction)
- **Bunched approach**: $40k in 2025 = $1,281 additional tax savings

GiveCalc's charts show exactly where your marginal savings rate changes, helping you identify optimal bunching thresholds.

## How to Use It

1. Go to **[givecalc.org](https://givecalc.org)**
2. Select your country (US or UK)
3. Enter your income, region/state, and filing status
4. Enter a donation amount
5. Click "Calculate tax impact"
6. See your tax savings, marginal rate, and net cost of giving

## Limitations

- **Cash donations only** — We assume 60% AGI limit (US); appreciated assets have a 30% limit
- **No carryforward modeling** — If you exceed AGI limits, we don't yet model carryforward
- **Simplified household structure** — Head of household + spouse + children only
- **No QCDs** — Qualified Charitable Distributions from IRAs aren't modeled
- **UK: Gift Aid only** — We don't yet model Payroll Giving or share donations

## Support PolicyEngine

GiveCalc is free because [PolicyEngine](https://policyengine.org) is a 501(c)(3) nonprofit. We build open-source tax and benefit models used by congressional offices, think tanks, and researchers.

If GiveCalc helps you plan your giving, consider [donating to PolicyEngine](https://policyengine.org/us/donate)—and use GiveCalc to calculate your tax savings!

---

*Questions? Comment below or reach out to max@policyengine.org*
