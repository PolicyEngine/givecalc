# GiveCalc 2.0: Calculate Your True Cost of Giving This Giving Tuesday

![GiveCalc cover](https://raw.githubusercontent.com/PolicyEngine/givecalc/main/docs/images/cover.png)

**TL;DR**: We've rebuilt [GiveCalc](https://givecalc.org) from the ground up as a standalone web application at [givecalc.org](https://givecalc.org). The free calculator now includes 2025 tax year support, expanded income types, and a mobile-friendly interface. Use it to calculate how your charitable donations affect your federal and state taxes.

## What's New Since Last Year

A year ago, I [introduced GiveCalc](https://forum.effectivealtruism.org/posts/gRLipHaijMn4ffv3a/givecalc-a-new-tool-to-calculate-the-true-cost-of-us) as a Streamlit app running on PolicyEngine's infrastructure. This Giving Tuesday, we're launching GiveCalc 2.0 with significant improvements:

- **New domain**: Access GiveCalc directly at [givecalc.org](https://givecalc.org)
- **React + FastAPI architecture**: Faster, more responsive interface replacing Streamlit
- **2025 tax year support**: Calculate impacts for tax years 2024, 2025, or 2026, including HR1's charitable contribution changes and downstream state tax effects
- **Expanded income types**: Add self-employment income, capital gains, dividends, and interest income
- **Mobile-friendly design**: Use GiveCalc on any device

## How It Works

GiveCalc uses PolicyEngine's microsimulation model—the same engine used by HM Treasury, the Niskanen Center, and researchers worldwide—to compute your taxes with and without donations. Enter your:

- Annual income (wages, self-employment, capital gains, dividends, interest)
- Filing status and dependents
- State (with NYC option for New York residents)
- Itemized deductions (mortgage interest, real estate taxes, medical expenses)

GiveCalc then shows:

1. **Net tax impact**: How much your donation reduces your tax liability
2. **Marginal giving discount**: The tax savings per additional dollar donated
3. **Target donation finder**: The donation required to achieve a specific net income reduction

## Example: True Cost of a $20,000 Donation

For a California family earning $200,000 with $20,000 in itemized deductions:

- **Tax savings**: $6,240 on a $20,000 donation
- **Net cost**: $13,760 (69% of the donation amount)
- **Marginal giving discount**: 31% (saves $0.31 per additional dollar)

Want to reduce your net income by exactly 10%? GiveCalc's target donation finder tells you the precise amount.

![GiveCalc screenshot](https://raw.githubusercontent.com/PolicyEngine/givecalc/main/docs/images/screenshot.png)

## Technical Improvements

GiveCalc 2.0 runs on:

- **Frontend**: React with Vite, deployed on Vercel
- **Backend**: FastAPI on Google Cloud Run, calling PolicyEngine-US

The [source code](https://github.com/PolicyEngine/givecalc) remains fully open source.

![PolicyEngine's broader policy calculator](https://raw.githubusercontent.com/PolicyEngine/givecalc/main/docs/images/policyengine-calculator.png)

## Validated Against TAXSIM

PolicyEngine has signed a [memorandum of understanding with NBER](https://policyengine.org/us/research/policyengine-nber-mou-taxsim) to develop a TAXSIM emulator, validating our tax calculations against the research community's standard. This gives you confidence that GiveCalc's results are accurate.

## Support PolicyEngine

GiveCalc demonstrates what PolicyEngine does: we build open-source infrastructure for evidence-based policy analysis. Everything we do is micro-founded: societal impacts are built up person by person, household by household—making policy personal.

### Real-world impact

Our API powers benefit screening tools that have identified **over $1 billion in unclaimed benefits**:
- [MyFriendBen](https://myfriendben.org) (Gates Foundation-funded): $800M+ for Colorado residents
- [Amplifi Benefit Navigator](https://www.benefitnavigator.us): $185M for 17,000 California households

PolicyEngine analysis has also informed legislation from [Rep. Tlaib's Economic Dignity for All Agenda](https://tlaib.house.gov/economic-dignity-for-all) to NY State Senator Gounardes's child tax credit legislation.

![Benefit screening tools powered by PolicyEngine](https://raw.githubusercontent.com/PolicyEngine/givecalc/main/docs/images/benefit-tools-collage.png)

### Future research: AI and economic policy

We're especially eager to apply our simulations to understand how public policies mediate the relationship between AI-powered economic growth and potential disempowerment. Our [preliminary framework](https://policyengine.github.io/ai-growth-research/) explores how different policy interventions—UBI, safety net expansions, capital taxation—would shape distributional outcomes under various AI economic scenarios.

### What donations support

Donations to PolicyEngine are tax-deductible in the US and support:

- **More programs**: Expanding benefit coverage so screening tools can help more families
- **Better data**: Improving accuracy for poverty and distributional analysis
- **Open infrastructure**: Sustaining free access for researchers, governments, and the public
- **AI policy research**: Understanding how policies mediate AI's distributional impacts

See how we spend donations on [Open Collective](https://opencollective.com/policyengine).

[Donate to PolicyEngine](https://policyengine.org/us/donate) and use [GiveCalc](https://givecalc.org) to calculate your tax savings.

## Try It

Visit [givecalc.org](https://givecalc.org) to calculate how your charitable giving affects your taxes this Giving Tuesday.
