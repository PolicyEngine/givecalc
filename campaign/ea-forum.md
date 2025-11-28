# EA Forum Post: GiveCalc v2

**Title:** GiveCalc v2: Major update to our charitable giving tax calculator

**Crosspost to:** LessWrong (optional)

---

## Post Body

*This is an update to our [original GiveCalc announcement](https://forum.effectivealtruism.org/posts/gRLipHaijMn4ffv3a/givecalc-a-new-tool-to-calculate-the-true-cost-of-us) from last year's Giving Tuesday.*

**TL;DR:** [GiveCalc](https://givecalc.org) now supports multiple income sources, multi-year tax planning, and shows all the federal and state charitable tax policies we model. It's faster and easier to use than ever.

## What is GiveCalc?

GiveCalc calculates how charitable donations affect your US taxes. Unlike simple calculators that multiply by your marginal rate (see [Fidelity Charitable](https://www.fidelitycharitable.org/tools/charitable-tax-savings-calculator/charitable-tax-savings-methodology.html), [Daffy](https://www.daffy.org/stock-donations-calculator), and [AgentCalc](https://agentcalc.com/charitable-donation-tax-deduction-calculator) for examples), GiveCalc uses [PolicyEngine's](https://policyengine.org) comprehensive microsimulation model to account for:

- Standard vs. itemized deduction thresholds
- Tax bracket changes from large donations
- State income taxes and credits (all 50 states + DC + NYC)
- Benefit phase-outs (CTC, EITC, etc.)
- AGI-based deduction limits (60% cap for cash donations)

The key output is your **marginal giving discount**—how much tax you save on your next dollar of giving at any donation level.

## What's New in v2

### 1. Multiple Income Sources

The original GiveCalc only accepted a single "employment income" field. Version 2 supports:

- Wages and salaries
- Tips
- Ordinary dividends
- Qualified dividends
- Short-term capital gains
- Long-term capital gains
- Interest income
- Self-employment income

This matters because different income types are taxed differently, affecting your marginal rates and optimal donation strategy.

### 2. Multi-Year Tax Planning

You can now calculate for **2024, 2025, or 2026** tax years. This is useful for:

- Planning this year's giving vs. next year's
- Understanding how tax law changes (like TCJA expiration) affect your giving
- [Future: donation bunching optimization across years]

### 3. Policy Transparency

A new expandable section shows **all the charitable tax policies** we model:

**Federal:**
- Charitable deduction (60% AGI cap)
- Non-itemizer deduction ($0 in 2024-25, expanding in 2026+)

**State-specific provisions:**
- Arizona: Charitable contributions credit, foster care credit, increased standard deduction
- Colorado: Charitable contribution subtraction for non-itemizers
- Minnesota: Charity subtraction (50% over $500 threshold)
- Mississippi: Foster care credit
- New Hampshire: Education tax credit (85%)
- New York: High-income deduction reduction
- Vermont: Charitable contribution credit (5% on $20k-$1M)
- Washington: Capital gains charitable deduction
- Puerto Rico: Charitable deduction (50% AGI cap)

### 4. Methodology Explainer

A new "Why GiveCalc is more accurate" section explains the five key factors that simple calculators miss. This helps users understand why their results might differ from naive estimates.

### 5. Technical Improvements

- Rebuilt with React + FastAPI (was Streamlit)
- Result caching—switch between scenarios without recalculating
- Faster page loads and calculations
- Better mobile experience

## How to Use It

1. Go to **[givecalc.org](https://givecalc.org)**
2. Enter your income (by source), state, filing status, and deductions
3. Enter a donation amount OR a target net income reduction
4. Click "Calculate tax impact"
5. See your tax savings, marginal rate, and net cost of giving

## Limitations

- **Cash donations only** — We assume 60% AGI limit; appreciated assets have a 30% limit
- **No carryforward modeling** — If you exceed AGI limits, we don't yet model carryforward to future years
- **Simplified household structure** — We model head of household + spouse + children, not more complex arrangements
- **No QCDs** — Qualified Charitable Distributions from IRAs aren't yet modeled

## Support PolicyEngine

GiveCalc is free because [PolicyEngine](https://policyengine.org) is a 501(c)(3) nonprofit. We build open-source tax and benefit models used by congressional offices, think tanks, and researchers.

If GiveCalc helps you plan your giving, consider [donating to PolicyEngine](https://policyengine.org/us/donate)—and use GiveCalc to calculate your tax savings!

---

*Questions? Comment below or reach out to max@policyengine.org*
