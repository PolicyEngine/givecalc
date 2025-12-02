# EA Forum Post: GiveCalc

**Title:** GiveCalc: Open-source tool to calculate the true cost of charitable giving

**Crosspost to:** LessWrong

---

## Post Body

**TL;DR:** [GiveCalc](https://givecalc.org) is a free, [open-source](https://github.com/PolicyEngine/givecalc) calculator that computes how charitable donations affect your taxes. Unlike typical calculators that multiply by marginal rates, GiveCalc runs full microsimulations to account for interactions between donations, deductions, credits, and benefit phase-outs. It supports US federal/state taxes and UK Gift Aid.

## What is GiveCalc?

Most charity tax calculators give you a rough estimate: take your donation, multiply by your marginal tax rate, done. This approach misses the complexity that determines your actual tax savings:

**🇺🇸 US considerations:**
- Whether your total itemized deductions exceed the standard deduction threshold
- How large donations shift your tax bracket
- State income tax interactions (all 50 states + DC + NYC)
- AGI-based deduction limits (60% cap for cash)
- Alternative Minimum Tax interactions

**🇬🇧 UK considerations:**
- Gift Aid mechanics (charity reclaims 25p per £1)
- Higher/additional rate relief (20%-25% back for 40%/45% taxpayers)
- Scottish income tax rates (19%-48%)
- Personal Allowance tapering (£100k+ income)

GiveCalc uses [PolicyEngine's](https://policyengine.org) comprehensive microsimulation models—the same engine powering benefit screening tools that have identified over $1 billion in unclaimed benefits—to give you precise numbers rather than rough estimates.

The key output is your **marginal giving discount**: how much tax you save on your next dollar/pound of giving at any donation level. This varies non-linearly, which matters for decisions about timing and amount.

![GiveCalc US screenshot](<!-- TODO: Upload from ~/Downloads/GiveCalc screens.png (US example) -->)

![GiveCalc UK screenshot](<!-- TODO: Upload from ~/Downloads/GiveCalc screens.png (UK example) -->)

## Features

**Multi-country support:** Calculate for US (federal + all states) or UK (including Scotland).

**Multiple income sources:** Beyond wages, include self-employment, capital gains, dividends, and interest—each taxed differently.

**Multi-year planning (US):** Model 2024, 2025, or 2026. This matters given 2026 changes from HR1: a 0.5% AGI floor on charitable deductions, restored non-itemizer deduction ($1k/$2k), and 80% itemized deduction limitation for high earners.

**Validated accuracy:** Calculations validated against NBER's TAXSIM through a [formal partnership](/us/research/policyengine-nber-mou-taxsim).

**Fully open source:** The [complete source code](https://github.com/PolicyEngine/givecalc) is public. Inspect the calculations, verify against your own analysis, or contribute improvements.

## Bunching example

For US donors considering large gifts, bunching multiple years of donations can significantly increase tax savings:

**Scenario:** $200k income in California, $20k/year giving plan

Without bunching, $20k in 2025 may not exceed your standard deduction threshold, yielding modest federal savings. Bunching $40k in a single year can produce $1,281 in additional savings by ensuring you itemize.

GiveCalc's marginal rate charts show exactly where your savings rate changes, helping identify optimal bunching thresholds.

## About PolicyEngine

GiveCalc is built by [PolicyEngine](https://policyengine.org), a 501(c)(3) nonprofit (US) and registered charity (UK, no. 1210532). We build open-source tax-benefit simulation models used by congressional offices, think tanks, and researchers for evidence-based policy analysis.

We're also investigating how public policy mediates the relationship between AI-driven economic transformation and distributional outcomes. Our [research framework](https://policyengine.github.io/ai-growth-research/) examines how policy interventions shape who benefits and who loses from AI-driven economic shifts.

Donations are tax-deductible (US) and Gift Aid eligible (UK). If GiveCalc helps you plan your giving, consider [donating to PolicyEngine](https://policyengine.org/us/donate).

## Try it

**[givecalc.org](https://givecalc.org)**

**Privacy note:** GiveCalc doesn't store any of your inputs—all calculations run in your browser and our API without logging.

**Need more complexity?** If your situation requires inputs we don't yet support (appreciated assets, QCDs, carryforwards, etc.), comment below or email max@policyengine.org. We can add features to GiveCalc or point you to the [policyengine-us Python package](https://github.com/PolicyEngine/policyengine-us) to run custom calculations locally.

---

*Questions? Comment below or reach out to max@policyengine.org*
