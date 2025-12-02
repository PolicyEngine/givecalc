# EA Forum Post: GiveCalc

**Title:** How much does your next $1,000 donation actually cost you?

**Crosspost to:** LessWrong

---

## Post Body

*Update to our [2023 GiveCalc launch](https://forum.effectivealtruism.org/posts/gRLipHaijMn4ffv3a/givecalc-a-new-tool-to-calculate-the-true-cost-of-us). Now supports UK Gift Aid.*

I donate about 10% of my income. For years I estimated my tax savings by multiplying donations by my marginal rate—around 35% federal + 9% California. So a $10,000 donation "costs" me $5,600, right?

When I actually ran the numbers through a full tax simulation, I discovered my marginal giving discount was closer to 28%. The difference: I wasn't accounting for how my donations interact with state deductions, bracket boundaries, and the standard deduction threshold. That's $700/year I was miscounting.

**[GiveCalc](https://givecalc.org)** runs these full simulations so you can see your actual marginal giving discount at any donation level. It's free, [open source](https://github.com/PolicyEngine/givecalc), and doesn't store your data.

![GiveCalc US screenshot](<!-- TODO: Upload from ~/Downloads/GiveCalc screens.png (US example) -->)

## What it does

Enter your income, state, filing status, and existing deductions. GiveCalc shows:

1. Your **marginal giving discount** — tax savings per additional dollar donated
2. How this changes at different donation levels (it's not linear)
3. The donation amount needed to reach any target net cost

The second point matters for timing decisions. If you're planning to give $20k/year but your marginal rate jumps at $30k, bunching two years into one could save you $1,000+.

## What it doesn't do (yet)

- Appreciated asset donations (uses 60% AGI limit, not 30%)
- Qualified charitable distributions from IRAs
- Carryforward of excess deductions
- Non-cash property donations

If your situation needs these, email max@policyengine.org — I can either add the feature or help you run custom calculations with our [Python package](https://github.com/PolicyEngine/policyengine-us).

## UK support

GiveCalc now handles UK Gift Aid, including:
- Basic rate (charity reclaims 25p/£1, no cost to you)
- Higher/additional rate relief (20-25% back via tax return)
- Scottish rates (19-48%)
- Personal Allowance taper effects for £100k+ earners

![GiveCalc UK screenshot](<!-- TODO: Upload from ~/Downloads/GiveCalc screens.png (UK example) -->)

## Accuracy

GiveCalc uses [PolicyEngine's](https://policyengine.org) tax-benefit models. These are validated against [NBER's TAXSIM](https://policyengine.org/us/research/policyengine-nber-mou-taxsim) and the [Atlanta Fed's Policy Rules Database](https://www.atlantafed.org/economic-mobility-and-resilience/advancing-careers-for-low-income-families/policy-rules-database), and power benefit screening tools used by 100k+ Americans.

That said: **results are estimates, not tax advice.** Your actual liability depends on details we don't model. Consult a tax professional for significant decisions.

## Try it

**[givecalc.org](https://givecalc.org)**

I'm curious: what's your marginal giving discount? Did GiveCalc find anything surprising about your situation? Happy to discuss specific cases in the comments.

---

*PolicyEngine is a 501(c)(3) nonprofit (US) and registered charity (UK, no. 1210532). If GiveCalc helps you, consider [donating to PolicyEngine](https://policyengine.org/us/donate) — and use GiveCalc to calculate your tax savings.*
