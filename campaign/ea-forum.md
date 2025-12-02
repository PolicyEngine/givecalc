# EA Forum Post: GiveCalc

**Title:** GiveCalc: Open-source tool to calculate the true cost of charitable giving

**Crosspost to:** LessWrong

---

## Post Body

*This is an update to our [original GiveCalc announcement](https://forum.effectivealtruism.org/posts/gRLipHaijMn4ffv3a/givecalc-a-new-tool-to-calculate-the-true-cost-of-us) from last year.*

**TL;DR:** [GiveCalc](https://givecalc.org) is a free, [open-source](https://github.com/PolicyEngine/givecalc) calculator that computes how charitable donations affect your taxes. It runs full tax simulations to account for interactions between donations, deductions, and credits. Supports US federal/state taxes and UK Gift Aid.

## What is GiveCalc?

Multiplying donations by your marginal tax rate misses interactions that affect actual tax savings:

**🇺🇸 US considerations:**
- Whether itemizing reduces your total tax liability (not always identical to itemized > standard deduction)
- How large donations shift your tax bracket
- State income tax interactions (all 50 states + DC + NYC)
- AGI-based deduction limits, itemized deduction phase-outs, AMT, and more

**🇬🇧 UK considerations:**
- Gift Aid mechanics (charity reclaims 25p per £1)
- Higher/additional rate relief (20%-25% back for 40%/45% taxpayers)
- Scottish income tax rates (19%-48%)
- Personal Allowance tapering (£100k+ income)

GiveCalc uses [PolicyEngine's](https://policyengine.org) microsimulation models to estimate these interactions. The same engine powers policy research used by policymakers, academics, think tanks, and benefit screening tools.

The key output is your **marginal giving discount**: how much tax you save on your next dollar/pound of giving at any donation level. This varies non-linearly, which matters for decisions about timing and amount.

![GiveCalc US screenshot](<!-- TODO: Upload from ~/Downloads/GiveCalc screens.png (US example) -->)

![GiveCalc UK screenshot](<!-- TODO: Upload from ~/Downloads/GiveCalc screens.png (UK example) -->)

## Features

**Multi-country support:** Calculate for US (federal + all states) or UK (including Scotland).

**Multiple income sources:** Beyond wages, include self-employment, capital gains, dividends, and interest—each taxed differently.

**Multi-year planning (US):** Model 2024, 2025, or 2026. This matters given 2026 changes from HR1: a 0.5% AGI floor on charitable deductions, restored non-itemizer deduction ($1k/$2k), and 80% itemized deduction limitation for high earners.

**Validated accuracy:** Calculations validated against [NBER's TAXSIM](https://policyengine.org/us/research/policyengine-nber-mou-taxsim) and the [Atlanta Fed's Policy Rules Database](https://www.atlantafed.org/economic-mobility-and-resilience/advancing-careers-for-low-income-families/policy-rules-database).

**Fully open source:** The [complete source code](https://github.com/PolicyEngine/givecalc) is public. Inspect the calculations, verify against your own analysis, or contribute improvements.

## Bunching example

For US donors considering large gifts, bunching multiple years of donations can significantly increase tax savings:

**Scenario:** $200k income in California, $20k/year giving plan

Without bunching, $20k in 2025 may not exceed your standard deduction threshold, yielding modest federal savings. Bunching $40k in a single year can produce $1,281 in additional savings by ensuring you itemize.

GiveCalc's marginal rate charts show exactly where your savings rate changes, helping identify optimal bunching thresholds.

## About PolicyEngine

GiveCalc is built by [PolicyEngine](https://policyengine.org), a 501(c)(3) nonprofit (US) and registered charity (UK, no. 1210532). We build open-source tax-benefit simulation models used by congressional offices, think tanks, and researchers for evidence-based policy analysis.

We're also investigating how public policy mediates the relationship between AI-driven economic transformation and distributional outcomes. Our [research framework](https://policyengine.github.io/ai-growth-research/) examines how policy interventions shape who benefits and who loses from AI-driven economic shifts.

Donations are tax-deductible (US) and Gift Aid eligible (UK).

## Try it

**[givecalc.org](https://givecalc.org)**

**Privacy note:** GiveCalc doesn't store any of your inputs—all calculations run in your browser and our API without logging.

**Need more complexity?** If your situation requires inputs we don't yet support (appreciated assets, QCDs, carryforwards, etc.), comment below or email max@policyengine.org. We can add features to GiveCalc or point you to the [policyengine-us Python package](https://github.com/PolicyEngine/policyengine-us) to run custom calculations locally.

**Disclaimer:** GiveCalc provides estimates for informational purposes only. Results depend on the accuracy of inputs and model assumptions. This is not tax, legal, or financial advice—consult a qualified professional for your specific situation.
