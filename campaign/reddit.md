# Reddit Posts: GiveCalc v2

## r/personalfinance

**Title:** Free tool to calculate actual tax savings from charitable donations (not just marginal rate)

**Body:**

Planning year-end charitable giving? Most online calculators just multiply your donation by your marginal tax rate. But that can be way off.

I work at PolicyEngine, a nonprofit that builds tax/benefit models. We made **GiveCalc** to calculate your real tax savings from donations.

**Why the simple calculation is wrong:**

1. **Standard deduction threshold** — Charitable donations only reduce taxes if your itemized deductions exceed the standard deduction ($14,600 single / $29,200 MFJ for 2024). If you're not already itemizing, your first several thousand dollars of donations might give you zero tax benefit.

2. **Bracket changes** — Large donations reduce your taxable income. If you donate enough to drop from the 32% to 24% bracket, part of your donation saves at 32% and part at 24%.

3. **State taxes** — State income taxes interact with federal in complex ways. Some states have their own charitable credits or deductions. The SALT cap affects how state taxes affect your federal liability.

4. **Benefit phase-outs** — If you're near the phase-out range for credits like CTC or EITC, lowering your AGI through donations can restore some of that benefit.

5. **AGI limits** — Charitable deductions are capped at 60% of AGI for cash donations.

**GiveCalc handles all of this.** It uses PolicyEngine's full tax model (same one used by congressional researchers) and works for all 50 states + DC + NYC.

**Link:** [givecalc.org](https://givecalc.org)

Free, no signup, no ads. Just launched v2 with support for multiple income types and multi-year planning.

Happy to answer questions about the methodology.

---

## r/tax

**Title:** Built a free tool that calculates true tax benefit of charitable donations (includes state taxes, SALT, phase-outs)

**Body:**

Tax professional here (not a CPA, but I run a tax policy nonprofit). We built GiveCalc to solve a problem I kept seeing: people use their marginal federal rate to estimate donation benefits, but the real math is more complex.

**What GiveCalc does:**

- Calculates federal + state tax impact of charitable donations
- Models standard vs. itemized deduction optimization
- Accounts for SALT cap interactions
- Handles state-specific charitable credits (AZ, CO, MN, MS, NH, NY, VT, WA, PR all have special provisions)
- Shows marginal savings rate at each donation level

**Technical details:**

Built on PolicyEngine's microsimulation model, which implements the full IRC + state tax codes. We use the same model for policy analysis that congressional offices use.

The "marginal giving discount" chart shows how your tax savings rate changes as donation amount increases—useful for finding optimal donation levels.

**Limitations:**

- Cash donations only (assumes 60% AGI limit, not 30% for appreciated assets)
- No carryforward modeling yet
- Simplified household structure

**Link:** [givecalc.org](https://givecalc.org)

Just shipped v2 with multiple income sources and 2024/2025/2026 year selection. Feedback welcome—especially edge cases where the model might be wrong.

---

## r/EffectiveAltruism

**Title:** GiveCalc v2: Updated tool to calculate true cost of giving (now with multiple income sources, multi-year planning)

**Body:**

*Cross-posted from [EA Forum](link)*

Last Giving Tuesday we launched GiveCalc, a tool to calculate the actual tax impact of charitable donations. Today we're releasing v2 with significant improvements.

**Quick summary:** GiveCalc tells you your true "cost of giving" by modeling the full tax code, not just your marginal rate. This matters for donation optimization.

**What's new:**

- Multiple income sources (wages, dividends, capital gains, interest, self-employment)
- Multi-year tax planning (2024, 2025, 2026)
- Expanded policy documentation showing all federal + state charitable provisions we model
- Technical rebuild (React + FastAPI, much faster)

**Why it matters for EA:**

If you're deciding between donating now vs. next year, or trying to optimize the timing of large donations, you need accurate marginal calculations. Simple "marginal rate" estimates can be off by 10+ percentage points.

Example: Someone at the standard deduction threshold might have 0% marginal benefit for their first $5k in donations, then 30%+ after that. GiveCalc shows exactly where these thresholds are.

**Link:** [givecalc.org](https://givecalc.org)

Free, open source (PolicyEngine-US), no signup.

Full details in my EA Forum post: [link]
